import { MailService } from '../mail/mail.service';
import { InvitationsService, INVITATION_TTL_DAYS } from './invitations.service';
import { ProjectRole } from './entities/project-member.entity';
import { InvitationStatus } from './entities/project-invitation.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

// El token se genera con crypto; se fija el byte para poder afirmar sobre él
// en vez de solo comprobar la forma con una expresión regular.
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.alloc(32, 0xab)),
}));

describe('InvitationsService', () => {
  let service: InvitationsService;

  const now = new Date('2026-03-01T10:00:00.000Z');

  const project = { id: 7, name: 'Tienda online' } as any;
  const inviter = { id: 1, name: 'Líder Ana', email: 'ana@test.com' } as any;
  const existingUser = {
    id: 2,
    name: 'Beto',
    email: 'beto@test.com',
  } as any;
  const stranger = { id: 3, name: 'Caro', email: 'caro@test.com' } as any;

  const invitationRepo = {
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(async (inv) => inv),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(async (inv) => inv),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const memberRepo = {
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(async (m) => m),
    findOne: jest.fn(),
  };
  const projectRepo = { findOne: jest.fn() };
  const userRepo = { findOne: jest.fn() };
  const mail = {
    sendProjectInvitation: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    misconfigurationHint: 'El servicio de correo no está configurado.',
  };
  const config = { get: jest.fn(() => 'http://localhost:5173') };
  const emailVerifier = {
    canReceiveMail: jest.fn(),
    isDisposable: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);

    service = new InvitationsService(
      invitationRepo as any,
      memberRepo as any,
      projectRepo as any,
      userRepo as any,
      mail as any,
      config as any,
      emailVerifier as any,
    );

    projectRepo.findOne.mockResolvedValue(project);
    config.get.mockReturnValue('http://localhost:5173');
    mail.sendWelcomeEmail.mockResolvedValue({ sent: true });
    mail.sendProjectInvitation.mockResolvedValue({ sent: true });
    emailVerifier.canReceiveMail.mockResolvedValue(true);
    emailVerifier.isDisposable.mockReturnValue(false);
  });

  afterEach(() => jest.useRealTimers());

  // ─── Usuario que ya tiene cuenta ───────────────────────────

  describe('inviteMember con usuario existente', () => {
    it('lo agrega como miembro y le avisa por correo', async () => {
      memberRepo.findOne.mockResolvedValue(null); // no es miembro todavía
      userRepo.findOne
        .mockResolvedValueOnce(inviter) // quién invita
        .mockResolvedValueOnce(existingUser); // a quién invita

      const result = await service.inviteMember(
        project.id,
        existingUser.email,
        ProjectRole.MEMBER,
        inviter.id,
      );

      expect(memberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: ProjectRole.MEMBER }),
      );
      expect(mail.sendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'beto@test.com',
          projectName: 'Tienda online',
        }),
      );
      expect(result.message).toContain('agregado');
      expect(result.emailSent).toBe(true);
      // Un usuario existente no necesita invitación pendiente
      expect(invitationRepo.save).not.toHaveBeenCalled();
    });

    it('no duplica membresía si ya era miembro del proyecto', async () => {
      userRepo.findOne.mockResolvedValue(inviter);
      memberRepo.findOne.mockResolvedValue({
        role: ProjectRole.MEMBER,
        user: existingUser,
      });

      const result = await service.inviteMember(
        project.id,
        existingUser.email,
        ProjectRole.MEMBER,
        inviter.id,
      );

      expect(memberRepo.save).not.toHaveBeenCalled();
      expect(result.message).toContain('ya es');
    });

    it('mantiene al miembro aunque el aviso por correo falle', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(existingUser);
      mail.sendWelcomeEmail.mockResolvedValue({
        sent: false,
        reason: 'boom',
      });

      const result = await service.inviteMember(
        project.id,
        existingUser.email,
        ProjectRole.MEMBER,
        inviter.id,
      );

      // Aquí el correo es un aviso, no el mecanismo de acceso: la persona ya
      // puede entrar al tablero, así que no se deshace la incorporación.
      expect(memberRepo.save).toHaveBeenCalled();
      expect(invitationRepo.remove).not.toHaveBeenCalled();
      // Pero el líder tiene que enterarse de que no se le avisó.
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('no se le pudo avisar por correo');
    });
  });

  // ─── Usuario sin cuenta: invitación por correo ────────────

  describe('inviteMember con usuario desconocido', () => {
    it('crea una invitación con token y envía el correo', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(null); // no existe

      const result = await service.inviteMember(
        project.id,
        'nuevo@empresa.com',
        ProjectRole.LEADER,
        inviter.id,
      );

      expect(invitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nuevo@empresa.com',
          role: ProjectRole.LEADER,
          project,
          invitedBy: inviter,
          acceptedAt: null,
        }),
      );

      const mailArgs = mail.sendProjectInvitation.mock.calls[0][0];
      expect(mailArgs.to).toBe('nuevo@empresa.com');
      expect(mailArgs.acceptUrl).toBe(
        `http://localhost:5173/invitacion/${randomBytes(32).toString('hex')}`,
      );
      expect(result.message).toContain('Invitación enviada');
    });

    it('marca la invitación como fallida si el correo no se pudo enviar', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(null);
      mail.sendProjectInvitation.mockResolvedValue({
        sent: false,
        reason: 'boom',
      });

      const result = await service.inviteMember(
        project.id,
        'nuevo@empresa.com',
        ProjectRole.MEMBER,
        inviter.id,
      );

      // No se borra: queda registrada como fallida con el motivo, para que el
      // líder lo vea. Su enlace no sirve (solo se aceptan pendientes).
      expect(invitationRepo.remove).not.toHaveBeenCalled();
      expect(invitationRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: InvitationStatus.FAILED,
          failureReason: 'boom',
        }),
      );
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('No se pudo enviar');
      expect(result.message).toContain(mail.misconfigurationHint);
    });

    it('rechaza un correo de dominio desechable antes de crearlo', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(null);
      emailVerifier.isDisposable.mockReturnValue(true);

      await expect(
        service.inviteMember(
          project.id,
          'nuevo@mailinator.com',
          ProjectRole.MEMBER,
          inviter.id,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(invitationRepo.save).not.toHaveBeenCalled();
      expect(mail.sendProjectInvitation).not.toHaveBeenCalled();
    });

    it('rechaza un correo cuyo dominio no puede recibir mensajes', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(null);
      emailVerifier.canReceiveMail.mockResolvedValue(false);

      await expect(
        service.inviteMember(
          project.id,
          'nuevo@dominio-inexistente.test',
          ProjectRole.MEMBER,
          inviter.id,
        ),
      ).rejects.toThrow(BadRequestException);

      // Ni se crea la invitación ni se intenta enviar nada
      expect(invitationRepo.save).not.toHaveBeenCalled();
      expect(mail.sendProjectInvitation).not.toHaveBeenCalled();
    });

    it('invalida invitaciones anteriores del mismo email', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(null);

      await service.inviteMember(
        project.id,
        'nuevo@empresa.com',
        ProjectRole.MEMBER,
        inviter.id,
      );

      expect(invitationRepo.delete).toHaveBeenCalledWith({
        project: { id: project.id },
        email: 'nuevo@empresa.com',
        acceptedAt: null,
      });
    });
  });

  // ─── Validación de la invitación ───────────────────────────

  describe('getValidInvitation', () => {
    const validInvitation = (overrides: Record<string, unknown> = {}) =>
      ({
        id: 1,
        email: 'nuevo@empresa.com',
        token: 'abc',
        role: ProjectRole.MEMBER,
        status: InvitationStatus.PENDING,
        acceptedAt: null,
        expiresAt: new Date(now.getTime() + 60_000),
        project,
        invitedBy: inviter,
        ...overrides,
      }) as any;

    it('rechaza un token inexistente', async () => {
      invitationRepo.findOne.mockResolvedValue(null);
      await expect(service.findByToken('nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza una invitación que no llegó a enviarse', async () => {
      invitationRepo.findOne.mockResolvedValue(
        validInvitation({ status: InvitationStatus.FAILED }),
      );
      await expect(service.findByToken('abc')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza una invitación ya aceptada', async () => {
      invitationRepo.findOne.mockResolvedValue(
        validInvitation({ acceptedAt: new Date() }),
      );
      await expect(service.findByToken('abc')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza una invitación expirada', async () => {
      invitationRepo.findOne.mockResolvedValue(
        validInvitation({ expiresAt: new Date(now.getTime() - 1000) }),
      );
      await expect(service.findByToken('abc')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devuelve los datos públicos de una invitación válida', async () => {
      invitationRepo.findOne.mockResolvedValue(validInvitation());

      const result = await service.findByToken('abc');

      expect(result).toEqual({
        projectName: 'Tienda online',
        role: ProjectRole.MEMBER,
        inviterName: 'Líder Ana',
        email: 'nuevo@empresa.com',
        expired: false,
      });
    });
  });

  // ─── Aceptación ────────────────────────────────────────────

  describe('accept', () => {
    // accept() marca la invitación como aceptada sobre el objeto que recibe,
    // así que cada test necesita la suya para no heredar el cambio.
    const validInvitation = (overrides: Record<string, unknown> = {}) =>
      ({
        id: 1,
        email: 'nuevo@empresa.com',
        role: ProjectRole.MEMBER,
        status: InvitationStatus.PENDING,
        acceptedAt: null,
        expiresAt: new Date('2026-03-08T10:00:00.000Z'),
        project,
        invitedBy: inviter,
        ...overrides,
      }) as any;

    it('crea la membresía y marca la invitación como aceptada', async () => {
      invitationRepo.findOne.mockResolvedValue(validInvitation());
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue({
        id: 9,
        name: 'Nueva',
        email: 'nuevo@empresa.com',
      });

      const result = await service.accept('abc', 9);

      expect(memberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ project, role: ProjectRole.MEMBER }),
      );
      expect(invitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ acceptedAt: expect.any(Date) }),
      );
      expect(result.message).toContain('Te uniste a Tienda online');
      // El frontend usa el projectId para abrir el tablero directamente
      expect(result.projectId).toBe(project.id);
    });

    it('impide que otra persona use el enlace', async () => {
      invitationRepo.findOne.mockResolvedValue(validInvitation());
      userRepo.findOne.mockResolvedValue(stranger);

      await expect(service.accept('abc', stranger.id)).rejects.toThrow(
        ForbiddenException,
      );
      expect(memberRepo.save).not.toHaveBeenCalled();
    });

    it('no falla si el usuario ya era miembro', async () => {
      invitationRepo.findOne.mockResolvedValue(validInvitation());
      memberRepo.findOne.mockResolvedValue({ role: ProjectRole.MEMBER });
      userRepo.findOne.mockResolvedValue({
        id: 9,
        name: 'Nueva',
        email: 'nuevo@empresa.com',
      });

      await service.accept('abc', 9);

      expect(memberRepo.save).not.toHaveBeenCalled();
      expect(invitationRepo.save).toHaveBeenCalled();
    });

    it('compara emails sin distinguir mayúsculas', async () => {
      invitationRepo.findOne.mockResolvedValue(
        validInvitation({ email: 'Nuevo@Empresa.com' }),
      );
      memberRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue({
        id: 9,
        name: 'Nueva',
        email: 'nuevo@empresa.com',
      });

      await expect(service.accept('abc', 9)).resolves.toBeDefined();
    });
  });

  // ─── Revocación ────────────────────────────────────────────

  describe('revoke', () => {
    it('elimina la invitación del proyecto', async () => {
      invitationRepo.findOne.mockResolvedValue({
        id: 5,
        email: 'nuevo@empresa.com',
      });

      const result = await service.revoke(5, project.id);

      expect(invitationRepo.remove).toHaveBeenCalled();
      expect(result.message).toContain('revocada');
    });

    it('falla si la invitación no pertenece al proyecto', async () => {
      invitationRepo.findOne.mockResolvedValue(null);
      await expect(service.revoke(5, project.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('expira las invitaciones a los 7 días', () => {
    expect(INVITATION_TTL_DAYS).toBe(7);
  });
});
