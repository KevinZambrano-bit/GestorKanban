import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import {
  ProjectMember,
  ProjectRole,
} from '../../projects/entities/project-member.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectRoleGuard } from './project-role.guard';

describe('Permisos de rol en proyectos', () => {
  let guard: ProjectRoleGuard;
  let reflector: jest.Mocked<Reflector>;
  let memberRepository: jest.Mocked<Repository<ProjectMember>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let request: { user: { id: number }; params: { id: string }; method: string };

  const createContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectRoleGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<ProjectRoleGuard>(ProjectRoleGuard);
    reflector = module.get(Reflector);
    memberRepository = module.get(getRepositoryToken(ProjectMember));
    projectRepository = module.get(getRepositoryToken(Project));
    userRepository = module.get(getRepositoryToken(User));
    request = { user: { id: 1 }, params: { id: '1' }, method: 'GET' };
  });

  it('permite el acceso sin roles requeridos y a la lectura de un proyecto público', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(projectRepository.findOne).not.toHaveBeenCalled();

    reflector.getAllAndOverride.mockReturnValue([ProjectRole.MEMBER]);
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      isPublic: true,
    } as Project);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(memberRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza POST y PATCH en un proyecto público si el usuario no es miembro', async () => {
    reflector.getAllAndOverride.mockReturnValue([ProjectRole.LEADER]);
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      isPublic: true,
    } as Project);
    memberRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue(null);

    for (const method of ['POST', 'PATCH']) {
      request.method = method;
      await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    }
  });

  it('permite a un miembro cuyo rol está entre los permitidos', async () => {
    reflector.getAllAndOverride.mockReturnValue([ProjectRole.MEMBER]);
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      isPublic: false,
    } as Project);
    memberRepository.findOne.mockResolvedValue({
      id: 1,
      role: ProjectRole.MEMBER,
    } as ProjectMember);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('rechaza al no miembro con el mensaje esperado', async () => {
    reflector.getAllAndOverride.mockReturnValue([ProjectRole.MEMBER]);
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      isPublic: false,
    } as Project);
    memberRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      new ForbiddenException('No eres miembro de este proyecto'),
    );
  });

  it('permite al administrador global operar aunque no sea miembro', async () => {
    reflector.getAllAndOverride.mockReturnValue([ProjectRole.LEADER]);
    projectRepository.findOne.mockResolvedValue({
      id: 1,
      isPublic: false,
    } as Project);
    memberRepository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({
      id: 1,
      role: { name: 'admin' },
    } as User);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });
});
