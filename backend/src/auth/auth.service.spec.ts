import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';

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

      expect(result).toEqual({ access_token: 'fake-jwt' });
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

      expect(result).toEqual({ access_token: 'fake-jwt' });
    });
  });
});