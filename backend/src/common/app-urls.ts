import { ConfigService } from '@nestjs/config';

export const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

/**
 * Origen del frontend con el que se construyen los enlaces que viajan por
 * correo (invitaciones, recuperación de contraseña, tareas asignadas).
 *
 * FRONTEND_URL admite varios orígenes separados por coma porque CORS los
 * necesita todos; para los enlaces solo sirve el primero, que es el canónico.
 */
export function frontendUrl(config: ConfigService): string {
  const configured = config.get<string>('FRONTEND_URL');
  return configured?.split(',')[0].trim() || DEFAULT_FRONTEND_URL;
}

export function projectUrl(
  config: ConfigService,
  projectId: number | string | undefined,
): string {
  return `${frontendUrl(config)}/projects/${projectId}`;
}

/**
 * Enlace directo a una tarea. El parámetro `tarea` lo lee el tablero para
 * abrir el detalle de esa tarea al entrar desde el correo.
 */
export function taskUrl(
  config: ConfigService,
  projectId: number | string | undefined,
  taskNumber: number,
): string {
  return `${projectUrl(config, projectId)}?tarea=${taskNumber}`;
}

export function invitationUrl(config: ConfigService, token: string): string {
  return `${frontendUrl(config)}/invitacion/${token}`;
}

export function passwordResetUrl(config: ConfigService, token: string): string {
  return `${frontendUrl(config)}/reset-password?token=${token}`;
}
