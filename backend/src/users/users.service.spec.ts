import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { RolesService } from '../roles/roles.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let rolesService: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    rolesService = module.get(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────────

  describe('findAll', () => {
    it('debe retornar todos los usuarios', async () => {
      const users = [
        {
          id: 1,
          name: 'Kevin',
          email: 'kevin@test.com',
          role: { id: 1, name: 'admin' },
        },
        {
          id: 2,
          name: 'Juan',
          email: 'juan@test.com',
          role: { id: 2, name: 'user' },
        },
      ];

      userRepository.find.mockResolvedValue(users as any);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalledWith({ relations: ['role'] });
    });
  });

  // ─────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────

  describe('findOne', () => {
    it('debe retornar un usuario por su ID', async () => {
      const userId = 1;
      const user = {
        id: userId,
        name: 'Kevin',
        email: 'kevin@test.com',
        role: { id: 1, name: 'admin' },
      };

      userRepository.findOne.mockResolvedValue(user as any);

      const result = await service.findOne(userId);

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['role'],
      });
    });

    it('debe lanzar error si el usuario no existe', async () => {
      const userId = 999;

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────
  // FIND BY EMAIL
  // ─────────────────────────────────────────────

  describe('findByEmail', () => {
    it('debe retornar un usuario por su email', async () => {
      const email = 'kevin@test.com';
      const user = {
        id: 1,
        name: 'Kevin',
        email,
        role: { id: 1, name: 'admin' },
      };

      userRepository.findOne.mockResolvedValue(user as any);

      const result = await service.findByEmail(email);

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['role'],
      });
    });

    it('debe retornar null si el email no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@test.com');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────

  describe('update', () => {
    it('debe actualizar un usuario correctamente', async () => {
      const userId = 1;
      const updateUserDto = {
        name: 'Kevin Updated',
        avatar: 'new-avatar-url',
      };

      const user = {
        id: userId,
        name: 'Kevin',
        email: 'kevin@test.com',
        avatar: 'old-avatar-url',
        role: { id: 1, name: 'user' },
      };

      const updatedUser = {
        ...user,
        ...updateUserDto,
      };

      userRepository.findOne.mockResolvedValue(user as any);
      userRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('debe actualizar el rol del usuario si se proporciona roleId', async () => {
      const userId = 1;
      const roleId = 2;

      const updateUserDto = {
        roleId,
      };

      const user = {
        id: userId,
        name: 'Kevin',
        email: 'kevin@test.com',
        role: { id: 1, name: 'user' },
      };

      const newRole = { id: roleId, name: 'admin' };
      const updatedUser = {
        ...user,
        role: newRole,
      };

      userRepository.findOne.mockResolvedValue(user as any);
      rolesService.findOne.mockResolvedValue(newRole as any);
      userRepository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(userId, updateUserDto);

      expect(result.role).toEqual(newRole);
      expect(rolesService.findOne).toHaveBeenCalledWith(roleId);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar error si el usuario no existe', async () => {
      const userId = 999;

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update(userId, {})).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar error si el rol no existe', async () => {
      const userId = 1;
      const roleId = 999;

      const updateUserDto = {
        roleId,
      };

      const user = {
        id: userId,
        name: 'Kevin',
        role: { id: 1, name: 'user' },
      };

      userRepository.findOne.mockResolvedValue(user as any);
      rolesService.findOne.mockResolvedValue(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────
  // REMOVE
  // ─────────────────────────────────────────────

  describe('remove', () => {
    it('debe eliminar un usuario correctamente', async () => {
      const userId = 1;
      const user = {
        id: userId,
        name: 'Kevin',
        email: 'kevin@test.com',
        role: { id: 1, name: 'user' },
      };

      userRepository.findOne.mockResolvedValue(user as any);
      userRepository.remove.mockResolvedValue(user as any);

      const result = await service.remove(userId);

      expect(result.message).toContain('eliminado correctamente');
      expect(userRepository.remove).toHaveBeenCalledWith(user);
    });

    it('debe lanzar error si el usuario no existe', async () => {
      const userId = 999;

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
