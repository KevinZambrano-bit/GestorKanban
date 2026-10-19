import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            generateToken: jest.fn(),
            getProfile: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'http://localhost:5173') },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────

  describe('register', () => {
    it('debe registrar un usuario y retornar token', async () => {
      const dto = {
        name: 'Kevin',
        email: 'kevin@test.com',
        password: '123456',
      };

      const response = {
        access_token: 'fake-jwt',
      };

      authService.register.mockResolvedValue(response);

      const result = await controller.register(dto);

      expect(result).toEqual(response);

      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  // ─────────────────────────────────────────────
  // OAUTH CALLBACK
  // ─────────────────────────────────────────────

  describe('googleCallback', () => {
    it('redirige al primer origen de FRONTEND_URL con el token', () => {
      const res = { redirect: jest.fn() };
      authService.generateToken.mockReturnValue({
        access_token: 'jwt-fake',
        user: {},
      });

      controller.googleCallback({ user: { id: 1 } } as any, res as any);

      // FRONTEND_URL admite varios orígenes para CORS, pero el redirect debe
      // ir siempre al canónico.
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/oauth/callback?token=jwt-fake',
      );
    });
  });
});
