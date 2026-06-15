import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Project } from './entities/project.entity';
import { ProjectMember, ProjectRole } from './entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';

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

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────

  describe('create', () => {
    it('debe crear un proyecto y asignar al usuario como LEADER', async () => {
      const userId = 1;
      const createProjectDto = {
        name: 'GestorKanban',
        description: 'Plataforma de gestión de tareas',
        wipLimit: 5,
        isPublic: false,
      };

      const user = { id: userId, name: 'Kevin', email: 'kevin@test.com' };
      const createdProject = {
        id: 1,
        ...createProjectDto,
        leader: user,
        createdAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(user as any);
      projectRepository.create.mockReturnValue(createdProject as any);
      projectRepository.save.mockResolvedValue(createdProject as any);

      const member = {
        project: createdProject,
        user,
        role: ProjectRole.LEADER,
      };
      memberRepository.create.mockReturnValue(member as any);
      memberRepository.save.mockResolvedValue(member as any);

      const result = await service.create(createProjectDto, userId);

      expect(result).toEqual(createdProject);
      expect(projectRepository.create).toHaveBeenCalledWith({
        ...createProjectDto,
        leader: user,
      });
      expect(projectRepository.save).toHaveBeenCalled();
      expect(memberRepository.save).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // FIND MY PROJECTS
  // ─────────────────────────────────────────────

  describe('findMyProjects', () => {
    it('debe retornar los proyectos del usuario con su rol', async () => {
      const userId = 1;
      const projects = [
        {
          id: 1,
          name: 'Proyecto 1',
          role: ProjectRole.LEADER,
          project: {
            id: 1,
            name: 'Proyecto 1',
            description: 'Descripción 1',
          },
        },
        {
          id: 2,
          name: 'Proyecto 2',
          role: ProjectRole.MEMBER,
          project: {
            id: 2,
            name: 'Proyecto 2',
            description: 'Descripción 2',
          },
        },
      ];

      memberRepository.find.mockResolvedValue(projects as any);

      const result = await service.findMyProjects(userId);

      expect(result).toHaveLength(2);
      expect(memberRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        relations: ['project', 'project.leader'],
      });
    });
  });

  // ─────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────

  describe('findOne', () => {
    it('debe retornar un proyecto público sin validar membresía', async () => {
      const projectId = 1;
      const userId = 1;

      const project = {
        id: projectId,
        name: 'Proyecto Público',
        isPublic: true,
        members: [],
      };

      projectRepository.findOne.mockResolvedValue(project as any);

      const result = await service.findOne(projectId, userId);

      expect(result).toEqual(project);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['leader', 'members', 'members.user'],
      });
    });

    it('debe lanzar error si el proyecto no existe', async () => {
      const projectId = 999;
      const userId = 1;

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(projectId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar error si el usuario no es miembro de un proyecto privado', async () => {
      const projectId = 1;
      const userId = 999;

      const project = {
        id: projectId,
        name: 'Proyecto Privado',
        isPublic: false,
        members: [{ user: { id: 1 } }],
      };

      projectRepository.findOne.mockResolvedValue(project as any);

      await expect(service.findOne(projectId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────

  describe('update', () => {
    it('debe actualizar un proyecto correctamente', async () => {
      const projectId = 1;
      const userId = 1;

      const project = {
        id: projectId,
        name: 'Proyecto Original',
        description: 'Descripción original',
        isPublic: true,
        members: [{ user: { id: userId }, role: ProjectRole.LEADER }],
      };

      const updateProjectDto = {
        name: 'Proyecto Actualizado',
        wipLimit: 10,
      };

      const updatedProject = {
        ...project,
        ...updateProjectDto,
      };

      projectRepository.findOne.mockResolvedValue(project as any);
      memberRepository.findOne.mockResolvedValue({
        role: ProjectRole.LEADER,
      } as any);
      projectRepository.save.mockResolvedValue(updatedProject as any);

      const result = await service.update(projectId, updateProjectDto, userId);

      expect(result).toEqual(updatedProject);
      expect(projectRepository.save).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // REMOVE
  // ─────────────────────────────────────────────

  describe('remove', () => {
    it('debe eliminar un proyecto correctamente', async () => {
      const projectId = 1;
      const userId = 1;

      const project = {
        id: projectId,
        name: 'Proyecto a Eliminar',
        members: [{ user: { id: userId }, role: ProjectRole.LEADER }],
      };

      projectRepository.findOne.mockResolvedValue(project as any);
      memberRepository.findOne.mockResolvedValue({
        role: ProjectRole.LEADER,
      } as any);
      projectRepository.remove.mockResolvedValue(project as any);

      const result = await service.remove(projectId, userId);

      expect(result.message).toContain('eliminado correctamente');
      expect(projectRepository.remove).toHaveBeenCalledWith(project);
    });
  });

  // ─────────────────────────────────────────────
  // INVITE MEMBER
  // ─────────────────────────────────────────────

  describe('inviteMember', () => {
    it('debe invitar un nuevo miembro al proyecto', async () => {
      const projectId = 1;
      const userId = 1;

      const inviteMemberDto = {
        email: 'newuser@test.com',
        role: ProjectRole.MEMBER,
      };

      const project = { id: projectId, name: 'Proyecto' };
      const newUser = { id: 2, name: 'New User', email: 'newuser@test.com' };

      memberRepository.findOne.mockResolvedValueOnce({
        role: ProjectRole.LEADER,
      } as any);
      projectRepository.findOne.mockResolvedValue(project as any);
      userRepository.findOne.mockResolvedValue(newUser as any);
      memberRepository.findOne.mockResolvedValueOnce(null);

      const member = {
        project,
        user: newUser,
        role: ProjectRole.MEMBER,
      };
      memberRepository.create.mockReturnValue(member as any);
      memberRepository.save.mockResolvedValue(member as any);

      const result = await service.inviteMember(
        projectId,
        inviteMemberDto,
        userId,
      );

      expect(result.message).toContain('agregado');
      expect(memberRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar error si el usuario no existe', async () => {
      const projectId = 1;
      const userId = 1;

      const inviteMemberDto = {
        email: 'nonexistent@test.com',
      };

      const project = { id: projectId };

      memberRepository.findOne.mockResolvedValueOnce({
        role: ProjectRole.LEADER,
      } as any);
      projectRepository.findOne.mockResolvedValue(project as any);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.inviteMember(projectId, inviteMemberDto, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
