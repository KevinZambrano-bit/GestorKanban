import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Task, TaskStatus } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let subtaskRepository: jest.Mocked<Repository<Subtask>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let memberRepository: jest.Mocked<Repository<ProjectMember>>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Subtask),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
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
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    subtaskRepository = module.get(getRepositoryToken(Subtask));
    projectRepository = module.get(getRepositoryToken(Project));
    memberRepository = module.get(getRepositoryToken(ProjectMember));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────

  describe('create', () => {
    it('debe crear una tarea correctamente', async () => {
      const projectId = 1;
      const userId = 1;

      const createTaskDto = {
        title: 'Implementar login',
        description: 'Con Google OAuth',
        status: TaskStatus.PENDING,
      };

      const project = { id: 1, wipLimit: 5 };
      const createdTask = {
        id: 1,
        taskNumber: 1,
        ...createTaskDto,
        project,
        assignee: null,
      };

      memberRepository.findOne.mockResolvedValue({
        id: 1,
        role: 'member',
      } as any);
      projectRepository.findOne.mockResolvedValue(project as any);
      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create.mockReturnValue(createdTask as any);
      taskRepository.save.mockResolvedValue(createdTask as any);

      const result = await service.create(projectId, createTaskDto, userId);

      expect(result).toEqual(createdTask);
      expect(taskRepository.create).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar error si el proyecto no existe', async () => {
      const projectId = 999;
      const userId = 1;

      const createTaskDto = {
        title: 'Implementar login',
        description: 'Con Google OAuth',
      };

      memberRepository.findOne.mockResolvedValue({ id: 1 } as any);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(projectId, createTaskDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar error si el usuario no es miembro del proyecto', async () => {
      const projectId = 1;
      const userId = 999;

      const createTaskDto = {
        title: 'Implementar login',
        description: 'Con Google OAuth',
        assigneeId: 999,
      };

      const project = { id: 1, wipLimit: 5 };

      memberRepository.findOne.mockResolvedValue(null);
      projectRepository.findOne.mockResolvedValue(project as any);

      await expect(
        service.create(projectId, createTaskDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────
  // MOVE TASK (CAMBIAR ESTADO)
  // ─────────────────────────────────────────────

  describe('moveTask', () => {
    it('debe mover una tarea a otro estado', async () => {
      const taskNumber = 1;
      const projectId = 1;
      const userId = 1;

      const moveTaskDto = {
        status: TaskStatus.IN_PROGRESS,
      };

      const task = {
        taskNumber: 1,
        title: 'Tarea 1',
        status: TaskStatus.PENDING,
        project: { id: 1, wipLimit: 5 },
        assignee: { id: userId },
      };

      const movedTask = { ...task, status: TaskStatus.IN_PROGRESS };

      taskRepository.findOne.mockResolvedValue(task as any);
      memberRepository.findOne.mockResolvedValue({ id: 1 } as any);
      projectRepository.findOne.mockResolvedValue(task.project as any);
      taskRepository.count.mockResolvedValue(0);
      taskRepository.save.mockResolvedValue(movedTask as any);

      const result = await service.moveTask(
        taskNumber,
        projectId,
        moveTaskDto,
        userId,
      );

      expect(result.status).toEqual(TaskStatus.IN_PROGRESS);
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar error si se alcanza el límite WIP', async () => {
      const taskNumber = 1;
      const projectId = 1;
      const userId = 1;

      const moveTaskDto = {
        status: TaskStatus.IN_PROGRESS,
      };

      const task = {
        taskNumber: 1,
        title: 'Tarea 1',
        status: TaskStatus.PENDING,
        project: { id: 1, wipLimit: 2 },
        assignee: { id: userId },
      };

      taskRepository.findOne.mockResolvedValue(task as any);
      memberRepository.findOne.mockResolvedValue({ id: 1 } as any);
      projectRepository.findOne.mockResolvedValue(task.project as any);
      taskRepository.count.mockResolvedValue(2);

      await expect(
        service.moveTask(taskNumber, projectId, moveTaskDto, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────

  describe('findOne', () => {
    it('debe encontrar una tarea por número', async () => {
      const taskNumber = 1;
      const projectId = 1;
      const userId = 1;

      const task = {
        taskNumber: 1,
        title: 'Tarea 1',
        status: TaskStatus.PENDING,
        project: { id: 1 },
        assignee: null,
      };

      taskRepository.findOne.mockResolvedValue(task as any);
      memberRepository.findOne.mockResolvedValue({ id: 1 } as any);
      projectRepository.findOne.mockResolvedValue({
        id: 1,
        isPublic: true,
      } as any);

      const result = await service.findOne(taskNumber, projectId, userId);

      expect(result).toEqual(task);
      expect(taskRepository.findOne).toHaveBeenCalled();
    });

    it('debe lanzar error si la tarea no existe', async () => {
      const taskNumber = 999;
      const projectId = 1;
      const userId = 1;

      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(taskNumber, projectId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
