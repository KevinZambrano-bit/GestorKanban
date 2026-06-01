import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';

export enum ProjectRole {
  LEADER = 'leader',
  MEMBER = 'member',
}

@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ProjectRole, default: ProjectRole.MEMBER })
  role: ProjectRole;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Project, (p) => p.members, { onDelete: 'CASCADE' })
  project: Project;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: 'CASCADE' })
  user: User;
}