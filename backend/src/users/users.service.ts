import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private rolesService: RolesService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['role'] });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Si viene un roleId, busca el rol y lo asigna
    if (updateUserDto.roleId) {
      const role = await this.rolesService.findOne(updateUserDto.roleId);
      if (!role) throw new NotFoundException(`Rol con ID ${updateUserDto.roleId} no encontrado`);
      user.role = role;
    }

    // Actualiza los demás campos
    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.avatar) user.avatar = updateUserDto.avatar;

    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    return { message: `Usuario ${user.name} eliminado correctamente` };
  }
}