import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User } from '../users/entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RolesService } from '../roles/roles.service';
import { MailService } from '../mail/mail.service';
import { passwordResetUrl } from '../common/app-urls';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export const RESET_TOKEN_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private rolesService: RolesService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

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
    if (!user.password)
      throw new UnauthorizedException('Esta cuenta usa login con Google');

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

  // ─── Recuperación de contraseña ───────────────────────────────

  /**
   * Siempre responde el mismo mensaje, exista o no la cuenta: si no, el
   * endpoint serviría para enumerar qué correos están registrados.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const message =
      'Si ese correo tiene una cuenta, te enviamos un enlace para restablecer la contraseña.';

    const user = await this.userRepository.findOne({ where: { email } });

    // Las cuentas de Google no tienen contraseña que restablecer.
    if (!user?.password) return { message };

    // Pedir un reset invalida los tokens anteriores de esa cuenta.
    await this.resetTokenRepository.delete({ user: { id: user.id } });

    const token = randomBytes(32).toString('hex');
    await this.resetTokenRepository.save(
      this.resetTokenRepository.create({
        tokenHash: this.hashToken(token),
        user,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
        usedAt: null,
      }),
    );

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: passwordResetUrl(this.configService, token),
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    return { message };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const record = await this.resetTokenRepository.findOne({
      where: { tokenHash: this.hashToken(resetPasswordDto.token) },
      relations: ['user'],
    });

    if (!record)
      throw new BadRequestException(
        'El enlace no es válido o ya fue utilizado',
      );

    if (record.usedAt)
      throw new BadRequestException('Este enlace ya fue utilizado');

    if (record.expiresAt.getTime() < Date.now())
      throw new BadRequestException('El enlace expiró, solicita uno nuevo');

    const user = record.user;
    if (!user) throw new BadRequestException('El enlace no es válido');

    user.password = await bcrypt.hash(resetPasswordDto.password, 10);
    await this.userRepository.save(user);

    // Se marca como usado en vez de borrarse para que el enlace no pueda
    // reutilizarse aunque se vuelva a adivinar.
    record.usedAt = new Date();
    await this.resetTokenRepository.save(record);

    return { message: 'Tu contraseña fue actualizada correctamente' };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  generateToken(user: User): { access_token: string; user: Partial<User> } {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async getProfile(userId: number): Promise<User> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
  }

  // Se guarda el hash SHA-256 del token, no el token: leer la tabla no
  // permite autenticarse con ella.
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
