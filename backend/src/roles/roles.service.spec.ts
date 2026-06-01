import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepository: jest.Mocked<Repository<Role>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────────

  describe('findAll', () => {
    it('debe retornar todos los roles', async () => {
      const roles = [
        {
          id: 1,
          name: 'admin',
          description: 'Administrador del sistema',
          permissions: ['manage_users', 'manage_projects'],
        },
        {
          id: 2,
          name: 'user',
          description: 'Usuario registrado',
          permissions: ['create_project'],
        },
      ];

      roleRepository.find.mockResolvedValue(roles as any);

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(roleRepository.find).toHaveBeenCalled();
    });

    it('debe retornar un array vacío si no hay roles', async () => {
      roleRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // FIND BY NAME
  // ─────────────────────────────────────────────

  describe('findByName', () => {
    it('debe retornar un rol por su nombre', async () => {
      const roleName = 'admin';
      const role = {
        id: 1,
        name: roleName,
        description: 'Administrador del sistema',
        permissions: ['manage_users', 'manage_projects'],
      };

      roleRepository.findOne.mockResolvedValue(role as any);

      const result = await service.findByName(roleName);

      expect(result).toEqual(role);
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: roleName },
      });
    });

    it('debe retornar null si el rol no existe', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────

  describe('findOne', () => {
    it('debe retornar un rol por su ID', async () => {
      const roleId = 1;
      const role = {
        id: roleId,
        name: 'admin',
        description: 'Administrador del sistema',
        permissions: ['manage_users', 'manage_projects'],
      };

      roleRepository.findOne.mockResolvedValue(role as any);

      const result = await service.findOne(roleId);

      expect(result).toEqual(role);
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { id: roleId },
      });
    });

    it('debe retornar null si el rol no existe', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // SEED ROLES
  // ─────────────────────────────────────────────

  describe('seedRoles', () => {
    it('debe crear los roles por defecto si no existen', async () => {
      roleRepository.findOne.mockResolvedValueOnce(null);
      roleRepository.findOne.mockResolvedValueOnce(null);

      const adminRole = {
        id: 1,
        name: 'admin',
        description: 'Administrador del sistema',
        permissions: ['manage_users', 'manage_roles', 'manage_projects'],
      };

      const userRole = {
        id: 2,
        name: 'user',
        description: 'Usuario registrado del sistema',
        permissions: ['create_project', 'view_own_projects'],
      };

      roleRepository.create.mockReturnValueOnce(adminRole as any);
      roleRepository.create.mockReturnValueOnce(userRole as any);

      roleRepository.save.mockResolvedValueOnce(adminRole as any);
      roleRepository.save.mockResolvedValueOnce(userRole as any);

      await service.seedRoles();

      expect(roleRepository.save).toHaveBeenCalledTimes(2);
    });

    it('no debe crear roles que ya existen', async () => {
      const existingRole = {
        id: 1,
        name: 'admin',
        description: 'Administrador del sistema',
      };

      roleRepository.findOne.mockResolvedValue(existingRole as any);

      await service.seedRoles();

      expect(roleRepository.save).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // ON MODULE INIT
  // ─────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('debe ejecutar seedRoles al inicializar el módulo', async () => {
      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.create.mockReturnValue({} as any);
      roleRepository.save.mockResolvedValue({} as any);

      const seedSpy = jest.spyOn(service, 'seedRoles');

      await service.onModuleInit();

      expect(seedSpy).toHaveBeenCalled();
    });
  });
});
