import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { Project } from '../projects/entities/project.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';

describe('Estadísticas de administración', () => {
  let service: AdminService;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let getRawMany: jest.Mock;

  beforeEach(async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    getRawMany = queryBuilder.getRawMany;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: { count: jest.fn().mockResolvedValue(0) },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: { count: jest.fn().mockResolvedValue(0) },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
  });

  it('devuelve los conteos de usuarios y proyectos', async () => {
    userRepository.count.mockResolvedValue(7);
    projectRepository.count.mockResolvedValue(4);

    const result = await service.getStats();

    expect(result.users).toBe(7);
    expect(result.projects).toBe(4);
  });

  it('convierte a número los conteos de tareas devueltos como texto', async () => {
    getRawMany.mockResolvedValue([{ status: TaskStatus.PENDING, count: '6' }]);

    const result = await service.getStats();

    expect(result.tasks.byStatus[TaskStatus.PENDING]).toBe(6);
  });

  it('incluye con valor cero los estados que no tienen tareas', async () => {
    getRawMany.mockResolvedValue([{ status: TaskStatus.DONE, count: '2' }]);

    const result = await service.getStats();

    expect(result.tasks.byStatus).toEqual({
      [TaskStatus.PENDING]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.DONE]: 2,
    });
  });

  it('calcula el total como la suma de todos los estados', async () => {
    getRawMany.mockResolvedValue([
      { status: TaskStatus.PENDING, count: '2' },
      { status: TaskStatus.IN_PROGRESS, count: '3' },
      { status: TaskStatus.DONE, count: '4' },
    ]);

    const result = await service.getStats();

    expect(result.tasks.total).toBe(9);
  });
});
