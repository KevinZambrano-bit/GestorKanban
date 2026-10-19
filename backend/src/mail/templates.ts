/**
 * Plantillas de los correos transaccionales.
 *
 * Se construyen con template literals y se escapan los valores que vienen
 * de la base de datos (nombres de proyecto, títulos de tarea, ...) para que
 * un nombre con etiquetas HTML no rompa el correo ni introduzca contenido.
 *
 * El HTML travels tipado como `RawHtml`: un `string` normal no se puede pasar
 * como cuerpo de correo, así que es imposible interpolar sin `escapeHtml`
 * un valor de la base de datos por descuido sin que lo marque el compilador.
 */

const ACCENT = '#a855f7';
const CANVAS = '#f6f5fb';
const BORDER = '#e6e3f0';
const TEXT = '#1f1b2e';
const MUTED = '#6b6780';

const DEFAULT_FOOTER =
  'Recibes este correo porque te invitaron a GestorKanban. Si no esperabas este mensaje, puedes ignorarlo.';

declare const rawHtmlBrand: unique symbol;

/** HTML ya sanitizado, listo para incrustarse en el correo. */
export type RawHtml = string & { readonly [rawHtmlBrand]: true };

/**
 * Único punto donde se hace el salto de `string` a HTML confiable. Todo lo que
 * llega de fuera (nombres, títulos, enlaces) debe pasar antes por `escapeHtml`.
 */
function raw(html: string): RawHtml {
  return html as RawHtml;
}

export function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Contenido completo de un correo: ambas partes son obligatorias. */
export type MailContent = {
  subject: string;
  html: string;
  text: string;
};

interface LayoutParams {
  title: string;
  preheader: string;
  body: RawHtml;
  footer?: string;
  cta?: { label: string; url: string };
}

// Envoltura común: encabezado de marca, botón de acción, cuerpo y pie.
function layout(params: LayoutParams): RawHtml {
  const button = params.cta
    ? raw(
        `<tr>
        <td style="padding:8px 32px 28px;">
          <a href="${escapeHtml(params.cta.url)}"
             style="display:inline-block;background:${ACCENT};color:#ffffff;
                    text-decoration:none;font-weight:600;font-size:15px;
                    padding:13px 26px;border-radius:10px;">
            ${escapeHtml(params.cta.label)}
          </a>
        </td>
      </tr>`,
      )
    : raw('');

  // Muchos clientes de correo bloquean los botones, así que debajo del cuerpo
  // se repite el enlace en texto plano siempre que haya uno.
  const rawLink = params.cta
    ? raw(
        `<div style="font-size:12px;color:${MUTED};word-break:break-all;
                    border-top:1px solid ${BORDER};padding-top:14px;">
         Si el botón no funciona, copia este enlace:<br>${escapeHtml(params.cta.url)}
       </div>`,
      )
    : raw('');

  const footer = params.footer ?? DEFAULT_FOOTER;

  return raw(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,
             Helvetica,Arial,sans-serif;color:${TEXT};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(params.preheader)}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:${CANVAS};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};
                      border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;font-size:18px;font-weight:700;
                       letter-spacing:-0.3px;">
              <span style="color:${ACCENT};">&#9632;&#9632;</span><span
                style="color:${ACCENT};opacity:0.55;">&#9632;</span> GestorKanban
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px;font-size:21px;font-weight:700;
                       line-height:1.3;letter-spacing:-0.4px;">
              ${escapeHtml(params.title)}
            </td>
          </tr>
          ${button}
          <tr>
            <td style="padding:0 32px 32px;font-size:15px;line-height:1.6;
                       color:${MUTED};">
              ${params.body}
              ${rawLink}
            </td>
          </tr>
        </table>
        <p style="max-width:560px;margin:18px auto 0;font-size:12px;color:${MUTED};
                  text-align:center;line-height:1.5;">
          ${escapeHtml(footer)}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`);
}

const paragraph = (html: string): RawHtml =>
  raw(`<p style="margin:0 0 14px;">${html}</p>`);

/** Concatena fragmentos ya sanitizados sin perder el tipo RawHtml. */
const join = (...parts: RawHtml[]): RawHtml => raw(parts.join(''));

const roleLabel = (role: string): string =>
  role === 'leader' ? 'líder' : 'miembro';

/**
 * Cuerpo en texto plano: lo usan los clientes que no renderizan HTML y es
 * lo que garantiza que el correo nunca llegue vacío.
 */
function textBody(lines: string[], cta?: { label: string; url: string }) {
  const parts = [...lines];
  if (cta) parts.push(`${cta.label}: ${cta.url}`);
  parts.push(DEFAULT_FOOTER);
  return parts.join('\n\n');
}

// ─── Invitación a un proyecto ────────────────────────────────

export function renderInvitationEmail(params: {
  inviterName: string;
  projectName: string;
  role: string;
  acceptUrl: string;
}): MailContent {
  const cta = { label: 'Aceptar invitación', url: params.acceptUrl };
  const role_ = roleLabel(params.role);

  return {
    subject: `${params.inviterName} te invitó a ${params.projectName}`,
    html: layout({
      title: `${params.inviterName} te invitó a ${params.projectName}`,
      preheader: `Te invitaron como ${role_} en ${params.projectName}`,
      cta,
      body: paragraph(
        `<strong>${escapeHtml(params.inviterName)}</strong> te ha invitado a colaborar en el proyecto <strong>${escapeHtml(params.projectName)}</strong> con el rol de <strong>${escapeHtml(role_)}</strong>.`,
      ),
    }),
    text: textBody(
      [
        `${params.inviterName} te ha invitado a colaborar en el proyecto ${params.projectName} con el rol de ${role_}.`,
        `Este enlace es válido durante 7 días y solo puede usarlo la cuenta invitada.`,
      ],
      cta,
    ),
  };
}

// ─── Aviso de incorporación a un proyecto ────────────────────

export function renderWelcomeEmail(params: {
  name: string;
  projectName: string;
  role: string;
  projectUrl: string;
}): MailContent {
  const cta = { label: 'Ver el tablero', url: params.projectUrl };
  const role_ = roleLabel(params.role);

  return {
    subject: `Te añadieron a ${params.projectName}`,
    html: layout({
      title: `Bienvenido a ${params.projectName}`,
      preheader: `${params.name} ahora forma parte de ${params.projectName}`,
      cta,
      body: join(
        paragraph(
          `Hola ${escapeHtml(params.name)}, ya formas parte de <strong>${escapeHtml(params.projectName)}</strong> como <strong>${escapeHtml(role_)}</strong>.`,
        ),
        paragraph(
          'Ya puedes abrir el tablero, mover tareas por las columnas y generar subtareas con IA.',
        ),
      ),
    }),
    text: textBody(
      [
        `Hola ${params.name}, ya formas parte de ${params.projectName} como ${role_}.`,
        'Ya puedes abrir el tablero, mover tareas por las columnas y generar subtareas con IA.',
      ],
      cta,
    ),
  };
}

// ─── Aviso de asignación de tarea ────────────────────────────

export function renderTaskAssignedEmail(params: {
  name: string;
  taskTitle: string;
  taskNumber: number;
  projectName: string;
  assignedByName: string;
  taskUrl: string;
  dueDate?: string | null;
}): MailContent {
  const cta = { label: 'Abrir la tarea', url: params.taskUrl };

  const dueDate = params.dueDate
    ? paragraph(
        `<strong>Fecha límite:</strong>
         <span style="display:inline-block;background:#fdf2ff;color:#7e22ce;
                      border:1px solid #e9d5ff;border-radius:999px;
                      padding:2px 12px;font-size:13px;font-weight:600;">
           ${escapeHtml(params.dueDate)}
         </span>`,
      )
    : raw('');

  const textLines = [
    `Hola ${params.name}, ${params.assignedByName} te asignó una tarea en ${params.projectName}.`,
    `Tarea #${params.taskNumber}: ${params.taskTitle}`,
  ];
  if (params.dueDate) textLines.push(`Fecha límite: ${params.dueDate}`);
  textLines.push(
    'Recuerda que solo la persona asignada puede marcar una tarea como completada.',
  );

  return {
    subject: `Te asignaron la tarea #${params.taskNumber}: ${params.taskTitle}`,
    html: layout({
      title: `Te asignaron la tarea #${params.taskNumber}`,
      preheader: `${params.taskTitle} en ${params.projectName}`,
      cta,
      body: join(
        paragraph(
          `Hola ${escapeHtml(params.name)}, <strong>${escapeHtml(params.assignedByName)}</strong> te asignó una tarea en <strong>${escapeHtml(params.projectName)}</strong>.`,
        ),
        raw(
          `<p style="margin:0 0 14px;padding:14px 16px;background:${CANVAS};
                  border-left:3px solid ${ACCENT};border-radius:0 8px 8px 0;">
         <span style="color:${MUTED};font-size:13px;">Tarea #${params.taskNumber}</span><br>
         <strong>${escapeHtml(params.taskTitle)}</strong>
       </p>`,
        ),
        dueDate,
        paragraph(
          'Recuerda que solo la persona asignada puede marcar una tarea como completada.',
        ),
      ),
    }),
    text: textBody(textLines, cta),
  };
}

// ─── Recuperación de contraseña ──────────────────────────────

export function renderPasswordResetEmail(params: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): MailContent {
  const cta = { label: 'Elegir nueva contraseña', url: params.resetUrl };
  const footer =
    'Si no solicitaste restablecer tu contraseña, ignora este correo: tu contraseña actual sigue funcionando.';

  return {
    subject: 'Restablece tu contraseña de GestorKanban',
    html: layout({
      title: 'Restablece tu contraseña',
      preheader: 'Este enlace expira pronto',
      footer,
      cta,
      body: join(
        paragraph(
          `Hola ${escapeHtml(params.name)}, recibimos una solicitud para restablecer la contraseña de tu cuenta.`,
        ),
        paragraph(
          `El enlace es válido durante <strong>${params.expiresInMinutes} minutos</strong> y solo puede usarse una vez.`,
        ),
      ),
    }),
    // El pie cambia aquí, así que no se reutiliza textBody().
    text: [
      `Hola ${params.name}, recibimos una solicitud para restablecer la contraseña de tu cuenta.`,
      `El enlace es válido durante ${params.expiresInMinutes} minutos y solo puede usarse una vez.`,
      `${cta.label}: ${cta.url}`,
      footer,
    ].join('\n\n'),
  };
}
