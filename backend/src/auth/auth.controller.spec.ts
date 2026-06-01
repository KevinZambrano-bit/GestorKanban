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

});