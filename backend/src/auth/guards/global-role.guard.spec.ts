import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRoleGuard } from './global-role.guard';
import { User } from '../../users/entities/user.entity';

describe('Permisos de rol global', () => {
  let guard: GlobalRoleGuard;
  let reflector: jest.Mocked<Reflector>;
  let userRepository: jest.Mocked<Repository<User>>;
  let request: { user?: { id: number } };

  const createContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalRoleGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<GlobalRoleGuard>(GlobalRoleGuard);
    reflector = module.get(Reflector);
    userRepository = module.get(getRepositoryToken(User));
    request = { user: { id: 1 } };
  });

  it('permite el acceso cuando no hay roles requeridos', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('lanza ForbiddenException si no encuentra al usuario', async () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    userRepository.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      new ForbiddenException('Usuario no encontrado'),
    );
  });

  it('lanza ForbiddenException si el rol del usuario no coincide', async () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    userRepository.findOne.mockResolvedValue({
      id: 1,
      role: { name: 'user' },
    } as User);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permite el acceso al usuario con rol admin requerido', async () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    userRepository.findOne.mockResolvedValue({
      id: 1,
      role: { name: 'admin' },
    } as User);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });
});
