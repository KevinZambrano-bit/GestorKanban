import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ProjectMember } from './project-member.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 3 })
  wipLimit: number;

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.projects, { eager: true })
  leader: User;

  @OneToMany(() => ProjectMember, (pm) => pm.project)
  members: ProjectMember[];

  @OneToMany(() => Task, (t) => t.project)
  tasks: Task[];
}