import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  renderInvitationEmail,
  renderWelcomeEmail,
  renderTaskAssignedEmail,
  renderPasswordResetEmail,
} from './templates';

export type MailResult = {
  sent: boolean;
  id?: string;
  reason?: string;
};

/** Cupo diario aproximado de una cuenta Gmail gratuita (~500/día). */
const DAILY_SEND_LIMIT = 500;
const DAILY_LIMIT_WARN_AT = Math.floor(DAILY_SEND_LIMIT * 0.8);
/** Cuánto se recuerda un envío ya entregado para no repetirlo. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const SMTP_TIMEOUT_MS = 20_000;

/**
 * Envoltura sobre Nodemailer (Gmail SMTP) para los correos transaccionales
 * del sistema.
 *
 * Si faltan GMAIL_USER o GMAIL_APP_PASSWORD el servicio queda desactivado y
 * todos los envíos se convierten en un no-op con un aviso en el log. Así el
 * proyecto arranca y es usable en desarrollo sin credenciales de correo,
 * igual que ya ocurre con la estrategia de Google OAuth.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private from = '';
  private dailyCount = 0;
  private dailyCountDay = '';
  private readonly recentSends = new Map<
    string,
    { id: string; expiresAt: number }
  >();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const user = this.configService.get<string>('GMAIL_USER')?.trim();
    const pass = this.configService.get<string>('GMAIL_APP_PASSWORD')?.trim();

    if (!user || !pass) {
      this.logger.warn(
        'GMAIL_USER o GMAIL_APP_PASSWORD no está definida: los correos no se enviarán',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });

    // Gmail solo admite como remitente la propia cuenta: el nombre visible es
    // lo único configurable. Se limpian comillas y ángulos por seguridad.
    const displayName =
      this.configService
        .get<string>('MAIL_FROM_NAME')
        ?.replace(/["\\<>]/g, '')
        .trim() || 'GestorKanban';
    this.from = `"${displayName}" <${user}>`;

    // Verifica la conexión en segundo plano: un fallo (contraseña mal
    // copiada, verificación en dos pasos sin activar) se ve en el log al
    // arrancar, no en el primer envío real.
    void this.transporter
      .verify()
      .then(() =>
        this.logger.log('Conexión SMTP con smtp.gmail.com verificada'),
      )
      .catch((error: Error) =>
        this.logger.error(
          `No se pudo verificar la conexión SMTP: ${error.message}. Los envíos fallarán hasta corregirlo.`,
        ),
      );
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  /**
   * Aviso para la respuesta al usuario: distingue "no hay credenciales
   * configuradas" de "Gmail rechazó el envío", porque la causa y la
   * solución son distintas.
   */
  get misconfigurationHint(): string {
    return this.enabled
      ? 'Revisa la configuración de GMAIL_USER y GMAIL_APP_PASSWORD.'
      : 'El servicio de correo no está configurado (revisa GMAIL_USER y GMAIL_APP_PASSWORD).';
  }

  // ─── Plantillas de negocio ─────────────────────────────────

  async sendProjectInvitation(params: {
    to: string;
    inviterName: string;
    projectName: string;
    role: string;
    acceptUrl: string;
  }): Promise<MailResult> {
    return this.send(
      {
        to: params.to,
        ...renderInvitationEmail(params),
      },
      // El token forma parte del enlace, así que cada invitación (aunque sea
      // al mismo correo tras revocarla) tiene una clave distinta. Sin él, un
      // reintento rápido devolvería el envío anterior y el invitado se
      // quedaría con el enlace viejo, ya revocado.
      `invitacion:${params.to}:${params.acceptUrl}`,
    );
  }

  async sendWelcomeEmail(params: {
    to: string;
    name: string;
    projectName: string;
    role: string;
    projectUrl: string;
  }): Promise<MailResult> {
    return this.send(
      {
        to: params.to,
        ...renderWelcomeEmail(params),
      },
      `bienvenida:${params.to}:${params.projectUrl}`,
    );
  }

  async sendTaskAssignedEmail(params: {
    to: string;
    name: string;
    taskTitle: string;
    taskNumber: number;
    projectName: string;
    assignedByName: string;
    taskUrl: string;
    dueDate?: string | null;
  }): Promise<MailResult> {
    return this.send(
      {
        to: params.to,
        ...renderTaskAssignedEmail(params),
      },
      // El número de tarea identifica la asignación: un reintento no duplica.
      `asignacion:${params.to}:${params.taskUrl}`,
    );
  }

  async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): Promise<MailResult> {
    return this.send(
      {
        to: params.to,
        ...renderPasswordResetEmail(params),
      },
      // El token es único por solicitud, así que dos correos de recuperación
      // para la misma cuenta nunca se confunden entre sí.
      `reset:${params.to}:${params.resetUrl}`,
    );
  }

  // ─── Transporte ─────────────────────────────────────────────

  /**
   * Nunca lanza: un correo fallido no debe tumbar la operación de negocio
   * que lo disparó (dar de alta a un miembro, asignar una tarea, etc.).
   */
  private async send(
    params: { to: string; subject: string; html: string; text: string },
    idempotencyScope: string,
  ): Promise<MailResult> {
    if (!this.transporter) {
      this.logger.log(
        `Correo omitido (sin GMAIL_USER/GMAIL_APP_PASSWORD) para ${params.to}: "${sanitizeSubject(params.subject)}"`,
      );
      return { sent: false, reason: 'mail-disabled' };
    }

    // El asunto lo compone el usuario (nombre de proyecto, título de tarea).
    // Un salto de línea en él se interpreta como otra cabecera, así que se
    // aplana antes de enviarlo. No se escapan etiquetas: en el asunto son
    // texto literal y el cliente decide cómo mostrarlas.
    const subject = sanitizeSubject(params.subject);
    const key = this.idempotencyKey(idempotencyScope, subject);

    this.pruneRecentSends();
    // Envío idempotente en memoria: SMTP no tiene claves de idempotencia, así
    // que el mismo envío repetido (mismo token, misma URL) en menos de 24 h no
    // se entrega dos veces.
    const previous = this.recentSends.get(key);
    if (previous) {
      this.logger.log(
        `Correo duplicado omitido para ${params.to}: ${previous.id}`,
      );
      return { sent: true, id: previous.id };
    }

    if (!this.reserveDailySlot()) {
      this.logger.error(
        `Límite diario de envíos (${DAILY_SEND_LIMIT}) alcanzado: correo a ${params.to} no enviado`,
      );
      return { sent: false, reason: 'daily-limit' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject,
        html: params.html,
        // La parte de texto plano evita que Outlook o Gmail muestren el
        // correo vacío cuando el cliente bloquea el HTML.
        text: params.text,
      });

      this.logger.log(`Correo enviado a ${params.to}: ${info.messageId}`);
      this.recentSends.set(key, {
        id: info.messageId,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });
      return { sent: true, id: info.messageId };
    } catch (error) {
      const err = error as Error & { responseCode?: number; code?: string };
      // El detalle completo (respuesta SMTP) queda en el log; el motivo que
      // viaja en MailResult es legible y no expone el diálogo con el servidor.
      this.logger.error(
        `Fallo al enviar correo a ${params.to}: ${err.message}${err.responseCode ? ` (SMTP ${err.responseCode})` : ''}`,
      );
      return { sent: false, reason: friendlyMailError(err) };
    }
  }

  /**
   * Reserva una plaza del cupo diario de Gmail. El contador vive en memoria:
   * si el proceso se reinicia se pierde, pero sirve para no seguir bombeando
   * cuando la cuenta ya está al tope y Google empieza a rechazar (o bloquea
   * la cuenta por tráfico sospechoso).
   */
  private reserveDailySlot(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.dailyCountDay) {
      this.dailyCountDay = today;
      this.dailyCount = 0;
    }
    if (this.dailyCount >= DAILY_SEND_LIMIT) return false;
    this.dailyCount += 1;
    if (this.dailyCount === DAILY_LIMIT_WARN_AT) {
      this.logger.warn(
        `Límite diario de correo: ${this.dailyCount}/${DAILY_SEND_LIMIT} envíos hoy. Gmail empieza a rechazar cerca del tope.`,
      );
    }
    return true;
  }

  /** Descarta las entradas de deduplicación ya caducadas. */
  private pruneRecentSends(): void {
    const now = Date.now();
    for (const [key, entry] of this.recentSends) {
      if (entry.expiresAt <= now) this.recentSends.delete(key);
    }
  }

  /**
   * Clave estable para la misma operación: el mismo envío repetido (mismo
   * destinatario, mismo alcance y mismo asunto) no se entrega dos veces.
   */
  private idempotencyKey(scope: string, subject: string): string {
    return createHash('sha256')
      .update(`gestorkanban:${scope}:${subject}`)
      .digest('hex');
  }
}

/** Unifica el asunto en una sola línea para que no rompa las cabeceras. */
function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Motivo legible para quien llama: traduce los fallos frecuentes de SMTP a
 * una frase accionable sin filtrar el diálogo crudo con el servidor.
 */
function friendlyMailError(
  error: Error & { responseCode?: number; code?: string },
): string {
  if (error.code === 'EAUTH' || error.responseCode === 535) {
    return 'Gmail rechazó las credenciales: revisa GMAIL_USER y GMAIL_APP_PASSWORD.';
  }
  if (
    error.code === 'ETIMEDOUT' ||
    error.code === 'ESOCKET' ||
    error.code === 'ECONNECTION' ||
    error.code === 'ECONNRESET'
  ) {
    return 'Sin respuesta de smtp.gmail.com: comprueba la red e inténtalo de nuevo.';
  }
  return error.message;
}
