import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  async seedRoles() {
    const roles = [
      {
        name: 'admin',
        description: 'Administrador del sistema',
        permissions: [
          'manage_users',
          'manage_roles',
          'manage_projects',
          'configure_ai_api',
          'view_all_projects',
        ],
      },
      {
        name: 'user',
        description: 'Usuario registrado del sistema',
        permissions: [
          'create_project',
          'view_own_projects',
        ],
      },
    ];

    for (const roleData of roles) {
      const exists = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });
      if (!exists) {
        await this.roleRepository.save(
          this.roleRepository.create(roleData)
        );
      }
    }
    console.log('✅ Roles globales inicializados');
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  async findByName(name: string): Promise<Role> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async findOne(id: number): Promise<Role> {
    return this.roleRepository.findOne({ where: { id } });
  }
}