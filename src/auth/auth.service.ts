import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private rolesService: RolesService,
  ) {}

  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar: string;
  }): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { email: profile.email },
      relations: ['role'], // ← carga el rol del usuario
    });

    if (!user) {
      const memberRole = await this.rolesService.findByName('member');
      user = this.userRepository.create({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        role: memberRole, // ← asigna rol member por defecto
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  generateToken(user: User): { access_token: string } {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name, // ← ahora es el nombre del rol
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: number): Promise<User> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'], // ← carga el rol
    });
  }
}