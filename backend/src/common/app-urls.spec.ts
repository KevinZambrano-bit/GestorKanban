import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_FRONTEND_URL,
  frontendUrl,
  invitationUrl,
  passwordResetUrl,
  projectUrl,
  taskUrl,
} from './app-urls';

const config = (value?: string) =>
  new ConfigService(value === undefined ? {} : { FRONTEND_URL: value });

describe('enlaces del frontend', () => {
  it('usa localhost cuando FRONTEND_URL no está definida', () => {
    expect(frontendUrl(config())).toBe(DEFAULT_FRONTEND_URL);
  });

  it('toma solo el primer origen: CORS admite varios, un enlace no', () => {
    expect(
      frontendUrl(config('https://app.com, https://staging.app.com')),
    ).toBe('https://app.com');
  });

  it('ignora espacios alrededor de los orígenes', () => {
    expect(frontendUrl(config('  https://app.com , https://b.com '))).toBe(
      'https://app.com',
    );
  });

  it('tolera un FRONTEND_URL vacío o solo con espacios', () => {
    expect(frontendUrl(config(''))).toBe(DEFAULT_FRONTEND_URL);
    expect(frontendUrl(config('   '))).toBe(DEFAULT_FRONTEND_URL);
  });

  it('construye los enlaces que viajan por correo', () => {
    const c = config('https://app.com');

    expect(projectUrl(c, 7)).toBe('https://app.com/projects/7');
    expect(taskUrl(c, 7, 12)).toBe('https://app.com/projects/7?tarea=12');
    expect(invitationUrl(c, 'abc123')).toBe(
      'https://app.com/invitacion/abc123',
    );
    expect(passwordResetUrl(c, 'tok')).toBe(
      'https://app.com/reset-password?token=tok',
    );
  });
});
