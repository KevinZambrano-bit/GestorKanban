import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AdminController } from '../src/admin/admin.controller';
import { AdminService } from '../src/admin/admin.service';
import { GlobalRoleGuard } from '../src/auth/guards/global-role.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { Project } from '../src/projects/entities/project.entity';
import { Task, TaskStatus } from '../src/tasks/entities/task.entity';
import { User } from '../src/users/entities/user.entity';

describe('Estadísticas de administración (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userRole: string;

  beforeAll(async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: TaskStatus.PENDING, count: '2' },
        { status: TaskStatus.DONE, count: '1' },
      ]),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'test-secret' })],
      controllers: [AdminController],
      providers: [
        AdminService,
        JwtAuthGuard,
        GlobalRoleGuard,
        JwtStrategy,
        Reflector,
        {
          provide: getRepositoryToken(User),
          useValue: {
            count: jest.fn().mockResolvedValue(8),
            findOne: jest.fn().mockImplementation(async () => ({
              id: 1,
              role: { name: userRole },
            })),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: { count: jest.fn().mockResolvedValue(3) },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'JWT_SECRET' ? 'test-secret' : undefined,
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get(getRepositoryToken(User));
  });

  beforeEach(() => {
    userRole = 'user';
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/admin/stats sin token responde 401', async () => {
    await request(app.getHttpServer()).get('/api/admin/stats').expect(401);
  });

  it('GET /api/admin/stats con rol user responde 403', async () => {
    const token = jwtService.sign({
      sub: 1,
      email: 'user@test.com',
      role: 'user',
    });

    await request(app.getHttpServer())
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /api/admin/stats con rol admin devuelve estadísticas con todos los estados', async () => {
    userRole = 'admin';
    const token = jwtService.sign({
      sub: 1,
      email: 'admin@test.com',
      role: 'admin',
    });

    const response = await request(app.getHttpServer())
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      users: 8,
      projects: 3,
      tasks: {
        total: 3,
        byStatus: {
          [TaskStatus.PENDING]: 2,
          [TaskStatus.IN_PROGRESS]: 0,
          [TaskStatus.DONE]: 1,
        },
      },
    });
    expect(userRepository.findOne).toHaveBeenCalled();
  });
});
