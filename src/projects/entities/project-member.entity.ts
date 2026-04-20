import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';

export enum MemberRole {
  LEADER = 'leader',
  MEMBER = 'member',
  GUEST = 'guest',
}

@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Project, (p) => p.members)
  project: Project;

  @ManyToOne(() => User, (u) => u.memberships)
  user: User;
}