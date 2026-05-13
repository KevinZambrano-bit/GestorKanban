import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';

// Mock de bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let rolesService: jest.Mocked<RolesService>;

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    rolesService = module.get(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────

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

      expect(result).toEqual({
        access_token: 'fake-jwt',
      });

      expect(userRepository.create).toHaveBeenCalled();

      expect(userRepository.save).toHaveBeenCalled();
    });

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

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────

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
        role: {
          name: 'admin',
        },
      };

      userRepository.findOne.mockResolvedValue(user as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jwtService.sign.mockReturnValue('fake-jwt');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'fake-jwt',
      });
    });

    it('debe lanzar error si el usuario no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'test@test.com',
          password: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar error si la cuenta es Google', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: null,
      } as any);

      await expect(
        service.login({
          email: 'test@test.com',
          password: '123456',
        }),
      ).rejects.toThrow('Esta cuenta usa login con Google');
    });

    it('debe lanzar error si la contraseña es incorrecta', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashedPassword',
        role: {
          name: 'user',
        },
      } as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@test.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────────
  // GOOGLE LOGIN
  // ─────────────────────────────────────────────

  describe('validateGoogleUser', () => {
    it('debe retornar usuario existente', async () => {
      const existingUser = {
        id: 1,
        email: 'google@test.com',
      };

      userRepository.findOne.mockResolvedValue(existingUser as any);

      const result = await service.validateGoogleUser({
        googleId: '123',
        email: 'google@test.com',
        name: 'Kevin',
        avatar: 'avatar.png',
      });

      expect(result).toEqual(existingUser);
    });

    it('debe crear usuario nuevo de Google', async () => {
      const role = {
        id: 2,
        name: 'user',
      };

      const newUser = {
        id: 2,
        email: 'new@test.com',
        googleId: '123',
        role,
      };

      userRepository.findOne.mockResolvedValue(null);

      userRepository.count.mockResolvedValue(1);

      rolesService.findByName.mockResolvedValue(role as any);

      userRepository.create.mockReturnValue(newUser as any);

      userRepository.save.mockResolvedValue(newUser as any);

      const result = await service.validateGoogleUser({
        googleId: '123',
        email: 'new@test.com',
        name: 'Kevin',
        avatar: 'avatar.png',
      });

      expect(result).toEqual(newUser);

      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // GENERATE TOKEN
  // ─────────────────────────────────────────────

  describe('generateToken', () => {
    it('debe generar token JWT', () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        role: {
          name: 'admin',
        },
      } as User;

      jwtService.sign.mockReturnValue('fake-jwt');

      const result = service.generateToken(user);

      expect(result).toEqual({
        access_token: 'fake-jwt',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'test@test.com',
        role: 'admin',
      });
    });
  });

  // ─────────────────────────────────────────────
  // GET PROFILE
  // ─────────────────────────────────────────────

  describe('getProfile', () => {
    it('debe retornar el perfil del usuario', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
      };

      userRepository.findOne.mockResolvedValue(user as any);

      const result = await service.getProfile(1);

      expect(result).toEqual(user);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['role'],
      });
    });
  });
});