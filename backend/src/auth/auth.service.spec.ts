import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RolesService } from '../roles/roles.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

// Mock de bcrypt para evitar encriptación real en las pruebas
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let rolesService: jest.Mocked<RolesService>;
  let mailService: jest.Mocked<MailService>;
  let resetTokenRepository: jest.Mocked<Repository<PasswordResetToken>>;

  // Configuración del módulo de pruebas antes de cada prueba
  // Se simulan todas las dependencias con jest.fn()
  // para no conectarse a la base de datos real
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: {
            findByName: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendPasswordResetEmail: jest.fn().mockResolvedValue({ sent: true }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'http://localhost:5173'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    rolesService = module.get(RolesService);
    mailService = module.get(MailService);
    resetTokenRepository = module.get(getRepositoryToken(PasswordResetToken));
  });

  // Limpia todos los mocks después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });

  // PRUEBA 1: Registro exitoso de usuario
  describe('register', () => {
    it('debe registrar un usuario y retornar token', async () => {
      const dto = {
        name: 'Kevin',
        email: 'kevin@test.com',
        password: '123456',
      };

      const role = { id: 1, name: 'admin' };

      const createdUser = {
        id: 1,
        ...dto,
        password: 'hashedPassword',
        role,
      };

      userRepository.findOne.mockResolvedValueOnce(null);
      userRepository.count.mockResolvedValueOnce(0);
      rolesService.findByName.mockResolvedValue(role as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      userRepository.create.mockReturnValue(createdUser as any);
      userRepository.save.mockResolvedValue(createdUser as any);
      userRepository.findOne.mockResolvedValueOnce(createdUser as any);
      jwtService.sign.mockReturnValue('fake-jwt');

      const result = await service.register(dto);

      expect(result.access_token).toBe('fake-jwt');
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    // PRUEBA 2: Registro fallido por email duplicado
    it('debe lanzar error si el email ya existe', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1 } as User);

      await expect(
        service.register({
          name: 'Kevin',
          email: 'kevin@test.com',
          password: '123456',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // PRUEBA 3: Login exitoso con credenciales correctas
  describe('login', () => {
    it('debe hacer login correctamente', async () => {
      const loginDto = {
        email: 'kevin@test.com',
        password: '123456',
      };

      const user = {
        id: 1,
        email: 'kevin@test.com',
        password: 'hashedPassword',
        role: { name: 'admin' },
      };

      userRepository.findOne.mockResolvedValue(user as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('fake-jwt');

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('fake-jwt');
    });
  });

  // ─────────────────────────────────────────────
  // RECUPERACIÓN DE CONTRASEÑA
  // ─────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('crea un token y envía el correo', async () => {
      const user = {
        id: 1,
        name: 'Ana',
        email: 'ana@test.com',
        password: 'hashed',
      };
      userRepository.findOne.mockResolvedValue(user as any);
      resetTokenRepository.create.mockImplementation(
        (data: PasswordResetToken) => data,
      );
      resetTokenRepository.save.mockImplementation(
        async (t: PasswordResetToken) => t,
      );

      const result = await service.forgotPassword('ana@test.com');

      expect(result.message).toContain('Si ese correo tiene una cuenta');
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ana@test.com',
          name: 'Ana',
          expiresInMinutes: 30,
        }),
      );

      const saved = resetTokenRepository.save.mock.calls[0][0];
      // El token en claro solo viaja por el correo, nunca a la base de datos
      expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(saved.tokenHash).not.toContain('token');
    });

    it('responde igual si el correo no existe, sin enviar nada', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nadie@test.com');

      expect(result.message).toContain('Si ese correo tiene una cuenta');
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(resetTokenRepository.save).not.toHaveBeenCalled();
    });

    it('no intenta restablecer cuentas que solo usan Google', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 1,
        name: 'Ana',
        email: 'ana@test.com',
        password: null,
        googleId: 'google-123',
      } as any);

      await service.forgotPassword('ana@test.com');

      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('actualiza la contraseña y marca el token como usado', async () => {
      const user = { id: 1, email: 'ana@test.com', password: 'old' };
      const record = {
        id: 5,
        user,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      };
      resetTokenRepository.findOne.mockResolvedValue(record as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');
      userRepository.save.mockImplementation(async (u: User) => u);

      const result = await service.resetPassword({
        token: 'raw-token',
        password: 'NuevaClave123',
      });

      expect(result.message).toContain('actualizada');
      expect(bcrypt.hash).toHaveBeenCalledWith('NuevaClave123', 10);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'newHash' }),
      );
      expect(record.usedAt).toBeInstanceOf(Date);
    });

    it('rechaza un token inexistente', async () => {
      resetTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'fake', password: 'NuevaClave123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza un token ya utilizado', async () => {
      resetTokenRepository.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
        user: { id: 1 },
      } as any);

      await expect(
        service.resetPassword({ token: 'used', password: 'NuevaClave123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza un token expirado', async () => {
      resetTokenRepository.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        user: { id: 1 },
      } as any);

      await expect(
        service.resetPassword({ token: 'old', password: 'NuevaClave123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
