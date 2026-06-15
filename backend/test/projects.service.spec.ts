import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from '../src/projects/projects.service';
import { Project } from '../src/projects/entities/project.entity';
import {
  ProjectMember,
  ProjectRole,
} from '../src/projects/entities/project-member.entity';
import { User } from '../src/users/entities/user.entity';
import { Task } from '../src/tasks/entities/task.entity';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let memberRepository: jest.Mocked<Repository<ProjectMember>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let taskRepository: jest.Mocked<Repository<Task>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get(getRepositoryToken(Project));
    memberRepository = module.get(getRepositoryToken(ProjectMember));
    userRepository = module.get(getRepositoryToken(User));
    taskRepository = module.get(getRepositoryToken(Task));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un proyecto y agregar al creador como líder', async () => {
      const userId = 1;
      const createProjectDto = {
        name: 'Proyecto prueba',
        description: 'Descripción',
        isPublic: false,
        wipLimit: 4,
      } as any;

      const leader = { id: userId, name: 'Ana' } as User;
      const project = { id: 1, ...createProjectDto, leader } as Project;
      const member = {
        id: 1,
        project,
        user: leader,
        role: ProjectRole.LEADER,
      } as ProjectMember;

      userRepository.findOne.mockResolvedValue(leader);
      projectRepository.create.mockReturnValue(project as any);
      projectRepository.save.mockResolvedValue(project as any);
      memberRepository.create.mockReturnValue(member as any);
      memberRepository.save.mockResolvedValue(member as any);

      const result = await service.create(createProjectDto, userId);

      expect(result).toEqual(project);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(projectRepository.save).toHaveBeenCalledWith(project);
      expect(memberRepository.save).toHaveBeenCalledWith(member);
    });
  });

  describe('findMyProjects', () => {
    it('debe devolver los proyectos en los que el usuario participa con su rol', async () => {
      const userId = 2;
      const membership = {
        project: {
          id: 10,
          name: 'Kanban',
          leader: { id: 1, name: 'Líder', email: 'lider@test.com' },
        },
        role: ProjectRole.MEMBER,
      } as any;

      memberRepository.find.mockResolvedValue([membership]);

      const result = await service.findMyProjects(userId);

      expect(result).toEqual([
        {
          id: 10,
          name: 'Kanban',
          leader: { id: 1, name: 'Líder', email: 'lider@test.com' },
          myRole: ProjectRole.MEMBER,
        },
      ]);
      expect(memberRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        relations: ['project', 'project.leader'],
      });
    });
  });

  describe('findOne', () => {
    it('debe devolver un proyecto público aunque el usuario no sea miembro', async () => {
      const projectId = 5;
      const userId = 9;
      const project = {
        id: projectId,
        name: 'Publico',
        isPublic: true,
        members: [],
      } as any;

      projectRepository.findOne.mockResolvedValue(project);

      const result = await service.findOne(projectId, userId);

      expect(result).toBe(project);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['leader', 'members', 'members.user'],
      });
    });

    it('debe lanzar ForbiddenException si el proyecto es privado y el usuario no es miembro', async () => {
      const projectId = 7;
      const userId = 3;
      const project = {
        id: projectId,
        name: 'Privado',
        isPublic: false,
        members: [{ user: { id: 4 } }],
      } as any;

      projectRepository.findOne.mockResolvedValue(project);

      await expect(service.findOne(projectId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('inviteMember', () => {
    it('debe invitar a un usuario al proyecto cuando el solicitante es líder', async () => {
      const projectId = 11;
      const userId = 1;
      const inviteMemberDto = {
        email: 'nuevo@test.com',
        role: ProjectRole.MEMBER,
      } as any;
      const project = { id: projectId } as Project;
      const user = {
        id: 20,
        name: 'Nuevo Usuario',
        email: inviteMemberDto.email,
      } as User;
      const leaderMembership = { id: 2, role: ProjectRole.LEADER } as any;
      const newMembership = {
        id: 3,
        project,
        user,
        role: ProjectRole.MEMBER,
      } as any;

      memberRepository.findOne.mockImplementation(({ where }: any) => {
        if (
          where.project?.id === projectId &&
          where.user?.id === userId &&
          where.role === ProjectRole.LEADER
        ) {
          return Promise.resolve(leaderMembership);
        }
        if (where.project?.id === projectId && where.user?.id === user.id) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });
      projectRepository.findOne.mockResolvedValue(project as any);
      userRepository.findOne.mockResolvedValue(user as any);
      memberRepository.create.mockReturnValue(newMembership);
      memberRepository.save.mockResolvedValue(newMembership);

      const result = await service.inviteMember(
        projectId,
        inviteMemberDto,
        userId,
      );

      expect(result).toEqual({
        message: `${user.name} agregado como ${newMembership.role} correctamente`,
      });
      expect(memberRepository.save).toHaveBeenCalledWith(newMembership);
    });
  });
});
