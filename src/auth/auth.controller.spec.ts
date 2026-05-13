import { Test, TestingModule } from '@nestjs/testing';
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
            generateToken: jest.fn(),
            getProfile: jest.fn(),
          },
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
  // LOGIN
  // ─────────────────────────────────────────────

  describe('login', () => {
    it('debe hacer login correctamente', async () => {
      const dto = {
        email: 'kevin@test.com',
        password: '123456',
      };

      const response = {
        access_token: 'fake-jwt',
      };

      authService.login.mockResolvedValue(response);

      const result = await controller.login(dto);

      expect(result).toEqual(response);

      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  // ─────────────────────────────────────────────
  // GOOGLE CALLBACK
  // ─────────────────────────────────────────────

  describe('googleCallback', () => {
    it('debe generar token y responder con json', () => {
      const req = {
        user: {
          id: 1,
          email: 'google@test.com',
        },
      };

      const token = {
        access_token: 'google-jwt',
      };

      const res = {
        json: jest.fn(),
      };

      authService.generateToken.mockReturnValue(token);

      controller.googleCallback(req, res);

      expect(authService.generateToken).toHaveBeenCalledWith(req.user);

      expect(res.json).toHaveBeenCalledWith(token);
    });
  });

  // ─────────────────────────────────────────────
  // PROFILE
  // ─────────────────────────────────────────────

  describe('getProfile', () => {
    it('debe retornar el perfil del usuario autenticado', async () => {
      const req = {
        user: {
          id: 1,
        },
      };

      const profile = {
        id: 1,
        name: 'Kevin',
        email: 'kevin@test.com',
      };

      authService.getProfile.mockResolvedValue(profile as any);

      const result = await controller.getProfile(req);

      expect(result).toEqual(profile);

      expect(authService.getProfile).toHaveBeenCalledWith(1);
    });
  });
});