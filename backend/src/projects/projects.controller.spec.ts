import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectRole } from './entities/project-member.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Project } from './entities/project.entity';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: jest.Mocked<ProjectsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            create: jest.fn(),
            findMyProjects: jest.fn(),
            findAllProjects: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            inviteMember: jest.fn(),
            getProjectMembers: jest.fn(),
            removeMember: jest.fn(),
            updateWipLimit: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────

  describe('create', () => {
    it('debe crear un proyecto y retornarlo', async () => {
      const userId = 1;
      const createProjectDto = {
        name: 'GestorKanban',
        description: 'Plataforma de gestión de tareas',
        wipLimit: 5,
        isPublic: false,
      };

      const createdProject = {
        id: 1,
        ...createProjectDto,
        leader: { id: userId, name: 'Kevin' },
        createdAt: new Date(),
      };

      projectsService.create.mockResolvedValue(createdProject as any);

      const req = { user: { id: userId } };

      const result = await controller.create(createProjectDto, req);

      expect(result).toEqual(createdProject);
      expect(projectsService.create).toHaveBeenCalledWith(createProjectDto, userId);
    });
  });

  // ─────────────────────────────────────────────
  // FIND MY PROJECTS
  // ─────────────────────────────────────────────

  describe('findMyProjects', () => {
    it('debe listar los proyectos del usuario', async () => {
      const userId = 1;
      const myProjects = [
        {
          id: 1,
          name: 'Proyecto 1',
          myRole: ProjectRole.LEADER,
        },
        {
          id: 2,
          name: 'Proyecto 2',
          myRole: ProjectRole.MEMBER,
        },
      ];

      projectsService.findMyProjects.mockResolvedValue(myProjects);

      const req = { user: { id: userId } };

      const result = await controller.findMyProjects(req);

      expect(result).toEqual(myProjects);
      expect(projectsService.findMyProjects).toHaveBeenCalledWith(userId);
    });
  });

  // ─────────────────────────────────────────────
  // FIND ALL PROJECTS
  // ─────────────────────────────────────────────

  describe('findAllProjects', () => {
    it('debe listar todos los proyectos (solo admin)', async () => {
      const allProjects = [
        {
          id: 1,
          name: 'Proyecto 1',
          createdBy: { id: 1, name: 'Kevin' },
        },
        {
          id: 2,
          name: 'Proyecto 2',
          createdBy: { id: 2, name: 'Juan' },
        },
      ];

      projectsService.findAllProjects.mockResolvedValue(allProjects);

      const result = await controller.findAllProjects();

      expect(result).toEqual(allProjects);
      expect(projectsService.findAllProjects).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────

  describe('findOne', () => {
    it('debe retornar un proyecto por su ID', async () => {
      const projectId = '1';
      const userId = 1;

      const project = {
        id: 1,
        name: 'Proyecto Detalle',
        description: 'Descripción del proyecto',
        members: [],
      };

      projectsService.findOne.mockResolvedValue(project as any);

      const req = { user: { id: userId } };

      const result = await controller.findOne(projectId, req);

      expect(result).toEqual(project);
      expect(projectsService.findOne).toHaveBeenCalledWith(1, userId);
    });
  });

  // ─────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────

  describe('update', () => {
    it('debe actualizar un proyecto correctamente', async () => {
      const projectId = '1';
      const userId = 1;

      const updateProjectDto = {
        name: 'Nombre Actualizado',
        wipLimit: 10,
      };

      const updatedProject = {
        id: 1,
        ...updateProjectDto,
      };

      projectsService.update.mockResolvedValue(updatedProject as any);

      const req = { user: { id: userId } };

      const result = await controller.update(projectId, updateProjectDto, req);

      expect(result).toEqual(updatedProject);
      expect(projectsService.update).toHaveBeenCalledWith(1, updateProjectDto, userId);
    });
  });

  // ─────────────────────────────────────────────
  // REMOVE
  // ─────────────────────────────────────────────

  describe('remove', () => {
    it('debe eliminar un proyecto correctamente', async () => {
      const projectId = '1';
      const userId = 1;

      const response = {
        message: 'Proyecto "GestorKanban" eliminado correctamente',
      };

      projectsService.remove.mockResolvedValue(response);

      const req = { user: { id: userId } };

      const result = await controller.remove(projectId, req);

      expect(result).toEqual(response);
      expect(projectsService.remove).toHaveBeenCalledWith(1, userId);
    });
  });

  // ─────────────────────────────────────────────
  // INVITE MEMBER
  // ─────────────────────────────────────────────

  describe('inviteMember', () => {
    it('debe invitar un miembro al proyecto', async () => {
      const projectId = '1';
      const userId = 1;

      const inviteMemberDto = {
        email: 'newuser@test.com',
        role: ProjectRole.MEMBER,
      };

      const response = {
        message: 'New User agregado como member correctamente',
      };

      projectsService.inviteMember.mockResolvedValue(response);

      const req = { user: { id: userId } };

      const result = await controller.inviteMember(projectId, inviteMemberDto, req);

      expect(result).toEqual(response);
      expect(projectsService.inviteMember).toHaveBeenCalledWith(1, inviteMemberDto, userId);
    });
  });

  // ─────────────────────────────────────────────
  // GET PROJECT MEMBERS
  // ─────────────────────────────────────────────

  describe('getProjectMembers', () => {
    it('debe retornar los miembros de un proyecto', async () => {
      const projectId = '1';
      const userId = 1;

      const members = [
        {
          id: 1,
          name: 'Kevin',
          email: 'kevin@test.com',
          role: ProjectRole.LEADER,
        },
        {
          id: 2,
          name: 'Juan',
          email: 'juan@test.com',
          role: ProjectRole.MEMBER,
        },
      ];

      projectsService.getProjectMembers.mockResolvedValue(members);

      const req = { user: { id: userId } };

      const result = await controller.getProjectMembers(projectId, req);

      expect(result).toEqual(members);
      expect(projectsService.getProjectMembers).toHaveBeenCalledWith(1, userId);
    });
  });

  // ─────────────────────────────────────────────
  // REMOVE MEMBER
  // ─────────────────────────────────────────────

  describe('removeMember', () => {
    it('debe eliminar un miembro del proyecto', async () => {
      const projectId = '1';
      const memberId = '2';
      const userId = 1;

      const response = {
        message: 'Miembro eliminado correctamente',
      };

      projectsService.removeMember.mockResolvedValue(response);

      const req = { user: { id: userId } };

      const result = await controller.removeMember(projectId, memberId, req);

      expect(result).toEqual(response);
      expect(projectsService.removeMember).toHaveBeenCalledWith(1, 2, userId);
    });
  });

  // ─────────────────────────────────────────────
  // UPDATE WIP LIMIT
  // ─────────────────────────────────────────────

  describe('updateWip', () => {
    it('debe actualizar el límite WIP del proyecto', async () => {
      const projectId = '1';
      const userId = 1;
      const wipLimit = 8;

      const updatedProject = {
        id: 1,
        name: 'Proyecto',
        wipLimit: 8,
      };

      projectsService.updateWipLimit.mockResolvedValue(updatedProject as any);

      const req = { user: { id: userId } };

      const result = await controller.updateWip(projectId, wipLimit, req);

      expect(result).toEqual(updatedProject);
      expect(projectsService.updateWipLimit).toHaveBeenCalledWith(1, wipLimit, userId);
    });
  });
});
