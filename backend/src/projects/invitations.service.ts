import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  ProjectInvitation,
  InvitationStatus,
} from './entities/project-invitation.entity';
import { ProjectMember, ProjectRole } from './entities/project-member.entity';
import { Project } from './entities/project.entity';
import { User } from '../users/entities/user.entity';
import { MailService, MailResult } from '../mail/mail.service';
import { EmailVerifierService } from '../common/email-verifier.service';
import { invitationUrl } from '../common/app-urls';

export const INVITATION_TTL_DAYS = 7;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(ProjectInvitation)
    private invitationRepository: Repository<ProjectInvitation>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private mailService: MailService,
    private configService: ConfigService,
    private emailVerifier: EmailVerifierService,
  ) {}

  /**
   * Crea la invitación y envía el correo. Si el correo no pudo enviarse la
   * invitación queda marcada como fallida (no se borra) para que el líder
   * pueda consultar el motivo; su enlace no es válido.
   */
  async inviteMember(
    projectId: number,
    email: string,
    role: ProjectRole,
    inviterId: number,
  ): Promise<{ message: string; emailSent: boolean }> {
    const [project, inviter] = await Promise.all([
      this.projectRepository.findOne({ where: { id: projectId } }),
      this.userRepository.findOne({ where: { id: inviterId } }),
    ]);

    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (!inviter)
      throw new NotFoundException('Usuario invitador no encontrado');

    // Si ya es miembro no hay nada que invitar: se responde con éxito para
    // que reintentar el formulario no se sienta como un error.
    const existingMember = await this.memberRepository.findOne({
      where: { project: { id: projectId }, user: { email } },
      relations: ['user'],
    });
    if (existingMember) {
      return {
        message: `${existingMember.user.name} ya es ${existingMember.role} de este proyecto`,
        emailSent: false,
      };
    }

    // ── Invitación con token ──
    // Todos los invitados reciben un enlace y deben aceptarlo, tengan cuenta o
    // no: nadie entra a un proyecto sin dar su aprobación. El token es el
    // mecanismo de acceso, así que si el correo falla la invitación queda
    // inutilizable y se registra el motivo.
    //
    // Los dominios de correo desechable se rechazan pronto: gastar un envío
    // (y uno de los ~500 diarios de Gmail) en una dirección temporal no lleva
    // a nadie. Después se comprueba que el dominio pueda recibir mensajes.
    if (this.emailVerifier.isDisposable(email)) {
      throw new BadRequestException(
        `El correo ${email} usa un dominio de correo desechable; usa una dirección real.`,
      );
    }

    if (!(await this.emailVerifier.canReceiveMail(email))) {
      throw new BadRequestException(
        `El correo ${email} no puede recibir mensajes: revisa que esté bien escrito.`,
      );
    }

    // Se limpian las invitaciones anteriores para el mismo email y proyecto
    // (pendientes o fallidas): el enlace nuevo es el único válido. Se usa
    // IsNull() porque TypeORM ignora `acceptedAt: null` en el where.
    await this.invitationRepository.delete({
      project: { id: projectId },
      email,
      acceptedAt: IsNull(),
    });

    const token = randomBytes(32).toString('hex');
    const invitation = await this.invitationRepository.save(
      this.invitationRepository.create({
        email,
        token,
        role,
        project,
        invitedBy: inviter,
        status: InvitationStatus.PENDING,
        failureReason: null,
        expiresAt: this.expiryFromNow(INVITATION_TTL_DAYS),
        acceptedAt: null,
      }),
    );

    const mail = await this.mailService.sendProjectInvitation({
      to: email,
      inviterName: inviter.name,
      projectName: project.name,
      role,
      acceptUrl: invitationUrl(this.configService, token),
    });

    if (!mail.sent) {
      // Aquí el correo sí es el mecanismo de acceso: sin él el invitado no
      // tiene forma de entrar. En vez de borrarla, queda marcada como fallida
      // para que el líder vea el motivo; su enlace no sirve, porque solo se
      // aceptan invitaciones pendientes.
      invitation.status = InvitationStatus.FAILED;
      invitation.failureReason = mail.reason?.slice(0, 500) ?? null;
      await this.invitationRepository.save(invitation);
      this.logger.warn(
        `No se pudo enviar la invitación a ${email}: queda marcada como fallida`,
      );
      return {
        message: `No se pudo enviar el correo de invitación. ${this.mailFailureHint(mail)}`,
        emailSent: false,
      };
    }

    return {
      message: `Invitación enviada a ${email}`,
      emailSent: true,
    };
  }

  /**
   * Motivo del fallo de envío para el líder. Si el servidor de correo dio un
   * motivo concreto (credenciales, timeout, cupo diario) se antepone al aviso
   * genérico de configuración.
   */
  private mailFailureHint(mail: MailResult): string {
    if (mail.reason && mail.reason !== 'mail-disabled') {
      return `${mail.reason} ${this.mailService.misconfigurationHint}`;
    }
    return this.mailService.misconfigurationHint;
  }

  // Invitaciones pendientes de un proyecto (soloLeader).
  // TypeORM descarta `acceptedAt: null` del where, por eso se usa IsNull():
  // sin él, las invitaciones ya aceptadas seguían apareciendo como pendientes.
  async findByProject(projectId: number): Promise<ProjectInvitation[]> {
    return this.invitationRepository.find({
      where: {
        project: { id: projectId },
        acceptedAt: IsNull(),
        status: InvitationStatus.PENDING,
      },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // Revocar una invitación (soloLeader)
  // El orden es (projectId, invitationId) igual que findByProject e inviteMember:
  // invertirlo hacía que la búsqueda usara los ids cruzados y no encontrara nada.
  async revoke(
    projectId: number,
    invitationId: number,
  ): Promise<{ message: string }> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, project: { id: projectId } },
    });

    if (!invitation)
      throw new NotFoundException('La invitación no existe en este proyecto');

    await this.invitationRepository.remove(invitation);
    return {
      message: `Invitación a ${invitation.email} revocada correctamente`,
    };
  }

  // ─── Aceptación ─────────────────────────────────────────────

  /**
   * Datos públicos de una invitación para pintar la pantalla de bienvenida.
   * No filtra información de otros usuarios: solo proyecto, rol y emisor.
   */
  async findByToken(token: string): Promise<{
    projectName: string;
    role: ProjectRole;
    inviterName: string;
    email: string;
    expired: boolean;
  }> {
    const invitation = await this.getValidInvitation(token);

    return {
      projectName: invitation.project.name,
      role: invitation.role,
      inviterName: invitation.invitedBy?.name ?? 'Un líder del proyecto',
      email: invitation.email,
      expired: false,
    };
  }

  /**
   * Acepta la invitación: crea la membresía y marca el token como usado.
   * Idempotente: si el usuario ya es miembro, no se duplica la fila.
   */
  async accept(
    token: string,
    userId: number,
  ): Promise<{ message: string; projectId: number }> {
    const invitation = await this.getValidInvitation(token);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // La invitación es nominal: el enlace puede abrirse en el navegador de
    // otra persona, pero solo concede acceso a quien fue invitado.
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        `Esta invitación es para ${invitation.email}. Inicia sesión con esa cuenta para aceptarla.`,
      );
    }

    const alreadyMember = await this.memberRepository.findOne({
      where: { project: { id: invitation.project.id }, user: { id: userId } },
    });

    if (!alreadyMember) {
      await this.memberRepository.save(
        this.memberRepository.create({
          project: invitation.project,
          user,
          role: invitation.role,
        }),
      );
    }

    // Se marca con un estado terminal además de la fecha: así una invitación
    // aceptada nunca vuelve a contarse como pendiente, aunque se consulte solo
    // por `status`.
    invitation.acceptedAt = new Date();
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);

    // El id del proyecto viaja en la respuesta para que el frontend pueda
    // llevar al usuario directamente a su tablero.
    return {
      message: `Te uniste a ${invitation.project.name} como ${invitation.role}`,
      projectId: invitation.project.id,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async getValidInvitation(token: string): Promise<ProjectInvitation> {
    if (!token) throw new BadRequestException('Falta el token de invitación');

    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['project', 'invitedBy'],
    });

    if (!invitation)
      throw new NotFoundException('La invitación no existe o ya fue revocada');

    // Una invitación cuyo correo no llegó a enviarse nunca sirve, aunque el
    // token exista: el enlace no llegó a nadie.
    if (invitation.status === InvitationStatus.FAILED)
      throw new BadRequestException(
        'Esta invitación no llegó a enviarse, pide una nueva',
      );

    if (invitation.acceptedAt)
      throw new BadRequestException('Esta invitación ya fue utilizada');

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now())
      throw new BadRequestException('Esta invitación expiró, pide una nueva');

    return invitation;
  }

  private expiryFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
