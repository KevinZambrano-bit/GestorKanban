import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskStatus } from './entities/task.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByProject: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            moveTask: jest.fn(),
            findMyTasks: jest.fn(),
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

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────

  describe('create', () => {
    it('debe crear una tarea y retornarla', async () => {
      const projectId = '1';
      const userId = 1;

      const createTaskDto = {
        title: 'Implementar login',
        description: 'Con Google OAuth',
        status: TaskStatus.PENDING,
      };

      const createdTask = {
        id: 1,
        taskNumber: 1,
        ...createTaskDto,
        project: { id: 1 },
        assignee: null,
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      tasksService.create.mockResolvedValue(createdTask as any);

      const req = { user: { id: userId } };

      const result = await controller.create(projectId, createTaskDto, req);

      expect(result).toEqual(createdTask);
      expect(tasksService.create).toHaveBeenCalledWith(1, createTaskDto, userId);
    });
  });

  // ─────────────────────────────────────────────
  // FIND ALL (LISTAR TAREAS DEL PROYECTO)
  // ─────────────────────────────────────────────

  describe('findAll', () => {
    it('debe listar todas las tareas del proyecto', async () => {
      const projectId = '1';
      const userId = 1;

      const tasks = [
        {
          id: 1,
          taskNumber: 1,
          title: 'Tarea 1',
          status: TaskStatus.PENDING,
          project: { id: 1 },
        },
        {
          id: 2,
          taskNumber: 2,
          title: 'Tarea 2',
          status: TaskStatus.IN_PROGRESS,
          project: { id: 1 },
        },
      ];

      tasksService.findByProject.mockResolvedValue(tasks as any);

      const req = { user: { id: userId } };

      const result = await controller.findAll(projectId, req);

      expect(result).toEqual(tasks);
      expect(tasksService.findByProject).toHaveBeenCalledWith(1, userId);
    });
  });

  // ─────────────────────────────────────────────
  // MOVE TASK
  // ─────────────────────────────────────────────

  describe('moveTask', () => {
    it('debe mover una tarea de columna', async () => {
      const projectId = '1';
      const taskNumber = '1';
      const userId = 1;

      const moveTaskDto = {
        status: TaskStatus.IN_PROGRESS,
      };

      const movedTask = {
        id: 1,
        taskNumber: 1,
        title: 'Tarea 1',
        status: TaskStatus.IN_PROGRESS,
        project: { id: 1 },
      };

      tasksService.moveTask.mockResolvedValue(movedTask as any);

      const req = { user: { id: userId } };

      const result = await controller.moveTask(taskNumber, projectId, moveTaskDto, req);

      expect(result).toEqual(movedTask);
      expect(tasksService.moveTask).toHaveBeenCalledWith(1, 1, moveTaskDto, userId);
    });
  });
});
