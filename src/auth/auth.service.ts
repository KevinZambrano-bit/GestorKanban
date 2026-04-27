import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private rolesService: RolesService,
  ) { }

  // ─── Login Normal ───────────────────────────────────────────

  async register(registerDto: RegisterDto): Promise<{ access_token: string }> {
    const exists = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (exists) throw new ConflictException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // El primer usuario registrado es admin
    const userCount = await this.userRepository.count();
    const roleName = userCount === 0 ? 'admin' : 'user';
    const role = await this.rolesService.findByName(roleName);

    const user = this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role,
    });
    const saved = await this.userRepository.save(user);

    // Recargar con la relación role para que el token tenga el nombre del rol
    const userWithRole = await this.userRepository.findOne({
      where: { id: saved.id },
      relations: ['role'],
    });

    return this.generateToken(userWithRole);
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    // Buscar el usuario por email
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['role'],
    });

    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    // Verificar que tenga contraseña (no es usuario de Google)
    if (!user.password) throw new UnauthorizedException('Esta cuenta usa login con Google');

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales incorrectas');

    return this.generateToken(user);
  }

  // ─── Login con Google ────────────────────────────────────────

  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar: string;
  }): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { email: profile.email },
      relations: ['role'],
    });

    if (!user) {
      // Si no hay ningún usuario, el primero es admin
      const userCount = await this.userRepository.count();
      const roleName = userCount === 0 ? 'admin' : 'user';
      const role = await this.rolesService.findByName(roleName);

      user = this.userRepository.create({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        role,
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  // ─── Helpers ─────────────────────────────────────────────────

  generateToken(user: User): { access_token: string } {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: number): Promise<User> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
  }
}