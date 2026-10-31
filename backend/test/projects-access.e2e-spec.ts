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
import { Project } from '../src/projects/entities/project.entity';
import { ProjectMember } from '../src/projects/entities/project-member.entity';
import { User } from '../src/users/entities/user.entity';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { ProjectRoleGuard } from '../src/auth/guards/project-role.guard';
import { InvitationsService } from '../src/projects/invitations.service';
import { ProjectsController } from '../src/projects/projects.controller';
import { ProjectsService } from '../src/projects/projects.service';

describe('Acceso a proyectos (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let memberRepository: jest.Mocked<Repository<ProjectMember>>;
  let isPublic: boolean;
  let isMember: boolean;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: 'test-secret' })],
      controllers: [ProjectsController],
      providers: [
        JwtAuthGuard,
        ProjectRoleGuard,
        JwtStrategy,
        Reflector,
        {
          provide: ProjectsService,
          useValue: {
            findOne: jest
              .fn()
              .mockResolvedValue({ id: 1, name: 'Proyecto de prueba' }),
            update: jest
              .fn()
              .mockResolvedValue({ id: 1, name: 'Proyecto actualizado' }),
          },
        },
        { provide: InvitationsService, useValue: { inviteMember: jest.fn() } },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest
              .fn()
              .mockImplementation(async () =>
                isMember ? { id: 1, role: 'member' } : null,
              ),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn().mockImplementation(async () => ({
              id: 1,
              isPublic,
            })),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
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
    memberRepository = moduleFixture.get(getRepositoryToken(ProjectMember));
  });

  beforeEach(() => {
    isPublic = false;
    isMember = false;
    memberRepository.findOne.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  const createToken = (): string =>
    jwtService.sign({ sub: 1, email: 'user@test.com', role: 'user' });

  it('GET /api/projects/1 sin token responde 401', async () => {
    await request(app.getHttpServer()).get('/api/projects/1').expect(401);
  });

  it('rechaza el acceso a un proyecto privado para quien no es miembro', async () => {
    await request(app.getHttpServer())
      .get('/api/projects/1')
      .set('Authorization', `Bearer ${createToken()}`)
      .expect(403);
  });

  it('permite a un miembro consultar un proyecto privado', async () => {
    isMember = true;

    const response = await request(app.getHttpServer())
      .get('/api/projects/1')
      .set('Authorization', `Bearer ${createToken()}`)
      .expect(200);

    expect(response.body).toEqual({ id: 1, name: 'Proyecto de prueba' });
    expect(memberRepository.findOne).toHaveBeenCalled();
  });

  it('permite a un usuario no miembro consultar un proyecto público', async () => {
    isPublic = true;

    const response = await request(app.getHttpServer())
      .get('/api/projects/1')
      .set('Authorization', `Bearer ${createToken()}`)
      .expect(200);

    expect(response.body).toEqual({ id: 1, name: 'Proyecto de prueba' });
    expect(memberRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza PATCH de un proyecto público para quien no es miembro', async () => {
    isPublic = true;

    await request(app.getHttpServer())
      .patch('/api/projects/1')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ name: 'Cambio no autorizado' })
      .expect(403);
  });
});
