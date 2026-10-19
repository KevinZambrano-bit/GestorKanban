import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Token de un solo uso para restablecer la contraseña. Se guarda el hash y
 * no el token en claro: si alguien lee la tabla no puede autenticarse con
 * ella. Un registro por sesión; pedir otro deja inválidos los anteriores.
 */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tokenHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @ManyToOne(() => User, (u) => u.resetTokens, { onDelete: 'CASCADE' })
  user: User;
}
