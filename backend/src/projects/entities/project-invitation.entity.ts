import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectRole } from '../entities/project-member.entity';
import { User } from '../../users/entities/user.entity';

export enum InvitationStatus {
  PENDING = 'pending',
  FAILED = 'failed',
}

/**
 * Invitación pendiente: a diferencia de project_members, no requiere que el
 * invitado ya tenga cuenta. Al aceptar, se crea la membresía y la invitación
 * queda marcada como aceptada. Si el correo no pudo enviarse se guarda como
 * `failed` en vez de borrarse, para que el líder pueda consultar el motivo.
 */
@Entity('project_invitations')
export class ProjectInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  token: string;

  @Column({ type: 'enum', enum: ProjectRole, default: ProjectRole.MEMBER })
  role: ProjectRole;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  acceptedAt: Date | null;

  @ManyToOne(() => Project, (p) => p.invitations, { onDelete: 'CASCADE' })
  project: Project;

  @ManyToOne(() => User, (u) => u.sentInvitations, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  invitedBy: User;
}
