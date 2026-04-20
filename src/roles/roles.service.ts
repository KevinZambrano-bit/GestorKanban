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

  // Crea los roles automáticamente al iniciar el servidor
  async onModuleInit() {
    await this.seedRoles();
  }

  async seedRoles() {
    const roles = [
      {
        name: 'admin',
        description: 'Acceso total al sistema',
        permissions: [
          'manage_users',
          'create_project', 'edit_project', 'delete_project',
          'invite_members', 'configure_wip',
          'create_task', 'edit_task', 'delete_task', 'move_task',
          'view_project', 'view_task',
          'use_focus_mode', 'generate_ai',
          'configure_ai_api',
        ],
      },
      {
        name: 'leader',
        description: 'Lider de proyecto',
        permissions: [
          'create_project', 'edit_project', 'delete_project',
          'invite_members', 'configure_wip',
          'create_task', 'edit_task', 'delete_task', 'move_task',
          'view_project', 'view_task',
          'use_focus_mode', 'generate_ai',
        ],
      },
      {
        name: 'member',
        description: 'Miembro activo del equipo',
        permissions: [
          'create_task', 'edit_task', 'move_task',
          'view_project', 'view_task',
          'use_focus_mode', 'generate_ai',
        ],
      },
      {
        name: 'guest',
        description: 'Solo lectura',
        permissions: [
          'view_project', 'view_task',
        ],
      },
    ];

    for (const roleData of roles) {
      const exists = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });
      if (!exists) {
        await this.roleRepository.save(this.roleRepository.create(roleData));
      }
    }
    console.log('✅ Roles inicializados correctamente');
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