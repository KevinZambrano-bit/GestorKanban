import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  const originalEnv = { ...process.env };

  let sendMail: jest.Mock;
  let verify: jest.Mock;

  beforeEach(() => {
    sendMail = jest
      .fn()
      .mockResolvedValue({ messageId: '<msg-123@gmail.com>' });
    verify = jest.fn().mockResolvedValue(true);
    jest.resetModules();
    jest.doMock('nodemailer', () => ({
      createTransport: jest
        .fn()
        .mockImplementation(() => ({ sendMail, verify })),
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.dontMock('nodemailer');
  });

  // ConfigService real sobre un entorno explícito: MailService lee la
  // configuración a través de él, no de process.env.
  const configFor = (env: Record<string, string | undefined>) =>
    new ConfigService(
      Object.fromEntries(
        Object.entries(env).filter(([, v]) => v !== undefined),
      ),
    );

  const build = async (
    env: Record<string, string | undefined>,
  ): Promise<MailService> => {
    // Se reimporta el módulo en cada prueba para que onModuleInit vuelva a
    // leer el entorno: el constructor no debe decidir si el envío está activo.
    const { MailService: Fresh } = await import('./mail.service');
    const instance = new Fresh(configFor(env));
    await Promise.resolve(instance.onModuleInit());
    return instance;
  };

  const OK_ENV = {
    GMAIL_USER: 'gestor@gestorkanban.dev',
    GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
    MAIL_FROM_NAME: 'GestorKanban',
  };

  describe('sin credenciales de Gmail', () => {
    const buildDisabled = () =>
      build({ GMAIL_USER: undefined, GMAIL_APP_PASSWORD: undefined });

    it('queda desactivado y no envía nada', async () => {
      const service = await buildDisabled();

      expect(service.enabled).toBe(false);

      const result = await service.sendWelcomeEmail({
        to: 'nuevo@empresa.com',
        name: 'Beto',
        projectName: 'Tienda',
        role: 'member',
        projectUrl: 'http://localhost:5173/projects/1',
      });

      expect(result).toEqual({ sent: false, reason: 'mail-disabled' });
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('no lanza aunque se llame a cualquier plantilla', async () => {
      const service = await buildDisabled();

      await expect(
        service.sendPasswordResetEmail({
          to: 'a@b.com',
          name: 'Ana',
          resetUrl: 'http://x/reset',
          expiresInMinutes: 30,
        }),
      ).resolves.toEqual({ sent: false, reason: 'mail-disabled' });
    });

    it('el aviso distingue servicio sin configurar de fallo de Gmail', async () => {
      const service = await buildDisabled();

      expect(service.misconfigurationHint).toContain('no está configurado');
      expect(service.misconfigurationHint).toContain('GMAIL_USER');
    });

    it('con solo GMAIL_USER el servicio sigue desactivado', async () => {
      const service = await build({
        GMAIL_USER: 'gestor@gestorkanban.dev',
        GMAIL_APP_PASSWORD: undefined,
      });

      expect(service.enabled).toBe(false);
    });
  });

  describe('configuración del remitente', () => {
    it('compone el remitente con el nombre configurado y la cuenta', async () => {
      const service = await build(OK_ENV);

      expect(service.enabled).toBe(true);

      await service.sendWelcomeEmail({
        to: 'nuevo@empresa.com',
        name: 'Beto',
        projectName: 'Tienda',
        role: 'member',
        projectUrl: 'http://x/1',
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"GestorKanban" <gestor@gestorkanban.dev>',
        }),
      );
    });

    it('usa GestorKanban como nombre visible por defecto', async () => {
      const service = await build({
        GMAIL_USER: 'gestor@gestorkanban.dev',
        GMAIL_APP_PASSWORD: 'x',
        MAIL_FROM_NAME: undefined,
      });

      await service.sendWelcomeEmail({
        to: 'nuevo@empresa.com',
        name: 'Beto',
        projectName: 'Tienda',
        role: 'member',
        projectUrl: 'http://x/1',
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"GestorKanban" <gestor@gestorkanban.dev>',
        }),
      );
    });

    it('limpia comillas y ángulos del nombre visible', async () => {
      const service = await build({
        GMAIL_USER: 'gestor@gestorkanban.dev',
        GMAIL_APP_PASSWORD: 'x',
        MAIL_FROM_NAME: 'Mi "Correo" <x>',
      });

      await service.sendWelcomeEmail({
        to: 'nuevo@empresa.com',
        name: 'Beto',
        projectName: 'Tienda',
        role: 'member',
        projectUrl: 'http://x/1',
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Mi Correo x" <gestor@gestorkanban.dev>',
        }),
      );
    });

    it('no tumba el servicio si falla la verificación SMTP al arrancar', async () => {
      verify.mockRejectedValueOnce(new Error('Invalid login'));

      const service = await build(OK_ENV);

      expect(service.enabled).toBe(true);

      const result = await service.sendWelcomeEmail({
        to: 'nuevo@empresa.com',
        name: 'Beto',
        projectName: 'Tienda',
        role: 'member',
        projectUrl: 'http://x/1',
      });

      expect(result.sent).toBe(true);
    });
  });

  describe('con credenciales configuradas', () => {
    it('envía la invitación con el destinatario y el asunto', async () => {
      const service = await build(OK_ENV);

      const result = await service.sendProjectInvitation({
        to: 'nuevo@empresa.com',
        inviterName: 'Ana',
        projectName: 'Tienda online',
        role: 'member',
        acceptUrl: 'http://localhost:5173/invitacion/abc123',
      });

      expect(result).toEqual({ sent: true, id: '<msg-123@gmail.com>' });
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'nuevo@empresa.com',
          subject: 'Ana te invitó a Tienda online',
        }),
      );
    });

    it('incluye la parte de texto plano para clientes sin HTML', async () => {
      const service = await build(OK_ENV);

      await service.sendPasswordResetEmail({
        to: 'a@b.com',
        name: 'Ana',
        resetUrl: 'http://x/reset?token=abc',
        expiresInMinutes: 30,
      });

      const [payload] = sendMail.mock.calls[0];
      expect(payload.text).toContain('30 minutos');
      expect(payload.text).toContain('http://x/reset?token=abc');
      expect(payload.html).toContain('<html');
    });

    it('aplana los saltos de línea del asunto para no inyectar cabeceras', async () => {
      const service = await build(OK_ENV);

      await service.sendTaskAssignedEmail({
        to: 'beto@empresa.com',
        name: 'Beto',
        taskTitle: 'Corregir login\nBcc: victima@otro.com',
        taskNumber: 12,
        projectName: 'Tienda',
        assignedByName: 'Ana',
        taskUrl: 'http://localhost:5173/projects/1',
      });

      const [payload] = sendMail.mock.calls[0];
      expect(payload.subject).toBe(
        'Te asignaron la tarea #12: Corregir login Bcc: victima@otro.com',
      );
      expect(payload.subject).not.toContain('\n');
    });
  });

  describe('deduplicación de envíos', () => {
    const attempt = (service: MailService) =>
      service.sendProjectInvitation({
        to: 'nuevo@empresa.com',
        inviterName: 'Ana',
        projectName: 'Tienda online',
        role: 'member',
        acceptUrl: 'http://x/invitacion/mismo-token',
      });

    it('omite el mismo envío repetido en menos de 24 h', async () => {
      const service = await build(OK_ENV);

      const first = await attempt(service);
      const second = await attempt(service);

      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(second).toEqual({ sent: true, id: first.id });
    });

    it('da una clave distinta a cada invitación aunque sea al mismo correo', async () => {
      const service = await build(OK_ENV);

      await service.sendProjectInvitation({
        to: 'nuevo@empresa.com',
        inviterName: 'Ana',
        projectName: 'Tienda online',
        role: 'member',
        acceptUrl: 'http://x/invitacion/token-nuevo',
      });
      await service.sendProjectInvitation({
        to: 'nuevo@empresa.com',
        inviterName: 'Ana',
        projectName: 'Tienda online',
        role: 'member',
        acceptUrl: 'http://x/invitacion/token-viejo',
      });

      // Sin el token en la clave, el enlace nuevo se descartaría por parecer
      // un duplicado y el invitado se quedaría con el viejo, ya revocado.
      expect(sendMail).toHaveBeenCalledTimes(2);
    });

    it('envía tareas distintas aunque compartan destinatario', async () => {
      const service = await build(OK_ENV);

      const base = {
        to: 'beto@empresa.com',
        name: 'Beto',
        taskTitle: 'Corregir login',
        projectName: 'Tienda',
        assignedByName: 'Ana',
        taskUrl: 'http://localhost:5173/projects/1',
      };

      await service.sendTaskAssignedEmail({ ...base, taskNumber: 12 });
      await service.sendTaskAssignedEmail({ ...base, taskNumber: 13 });

      expect(sendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('errores de envío', () => {
    it('traduce un fallo de credenciales sin lanzar', async () => {
      const service = await build(OK_ENV);
      sendMail.mockRejectedValueOnce(
        Object.assign(new Error('Invalid login: 535-5.7.8'), {
          code: 'EAUTH',
          responseCode: 535,
        }),
      );

      const result = await service.sendTaskAssignedEmail({
        to: 'beto@empresa.com',
        name: 'Beto',
        taskTitle: 'Corregir login',
        taskNumber: 12,
        projectName: 'Tienda',
        assignedByName: 'Ana',
        taskUrl: 'http://localhost:5173/projects/1',
      });

      expect(result.sent).toBe(false);
      expect(result.reason).toContain('credenciales');
      expect(service.misconfigurationHint).toContain('GMAIL_USER');
    });

    it('traduce un timeout de red sin lanzar', async () => {
      const service = await build(OK_ENV);
      sendMail.mockRejectedValueOnce(
        Object.assign(new Error('Greeting never received'), {
          code: 'ETIMEDOUT',
        }),
      );

      const result = await service.sendWelcomeEmail({
        to: 'beto@empresa.com',
        name: 'Beto',
        projectName: 'Tienda',
        role: 'member',
        projectUrl: 'http://x/1',
      });

      expect(result.sent).toBe(false);
      expect(result.reason).toContain('smtp.gmail.com');
    });

    it('deja pasar el mensaje original en errores desconocidos', async () => {
      const service = await build(OK_ENV);
      sendMail.mockRejectedValueOnce(new Error('550 mailbox unavailable'));

      const result = await service.sendWelcomeEmail({
        to: 'beto@empresa.com',
        name: 'Beto',
        projectName: 'Tienda',
        role: 'member',
        projectUrl: 'http://x/1',
      });

      expect(result).toEqual({
        sent: false,
        reason: '550 mailbox unavailable',
      });
    });
  });

  describe('límite diario de Gmail', () => {
    it('rechaza el envío al superar los 500 correos del día', async () => {
      const service = await build(OK_ENV);

      const send = (taskNumber: number) =>
        service.sendTaskAssignedEmail({
          to: 'beto@empresa.com',
          name: 'Beto',
          taskTitle: `Tarea ${taskNumber}`,
          taskNumber,
          projectName: 'Tienda',
          assignedByName: 'Ana',
          taskUrl: `http://localhost:5173/projects/1?tarea=${taskNumber}`,
        });

      for (let i = 0; i < 500; i++) {
        const result = await send(i);
        expect(result.sent).toBe(true);
      }

      const overflow = await send(500);
      expect(overflow).toEqual({ sent: false, reason: 'daily-limit' });
      expect(sendMail).toHaveBeenCalledTimes(500);
    });
  });
});
