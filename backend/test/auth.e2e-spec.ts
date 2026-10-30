import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { RolesService } from '../src/roles/roles.service';
import { User } from '../src/users/entities/user.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const user: Partial<User> = {
      id: 1,
      email: 'kevin@test.com',
      password: await bcrypt.hash('correct-password', 10),
      role: { id: 1, name: 'user' } as User['role'],
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('test-token') },
        },
        {
          provide: RolesService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'JWT_SECRET' ? 'test-secret' : undefined),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/auth/profile sin token debe responder 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
  });

  it('POST /api/auth/login con contraseña incorrecta debe responder 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kevin@test.com', password: 'wrong-password' })
      .expect(401);
  });
});
