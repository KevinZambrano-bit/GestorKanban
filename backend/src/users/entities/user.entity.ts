import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  // Nunca se expone en respuestas HTTP
  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  password: string; // ← nullable porque los de Google no tienen contraseña

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  avatar: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Role, (r) => r.users, { eager: true })
  role: Role;

  @OneToMany(() => Project, (p) => p.leader)
  projects: Project[];

  @OneToMany(() => ProjectMember, (pm) => pm.user)
  memberships: ProjectMember[];

  @OneToMany(() => Task, (t) => t.assignee)
  tasks: Task[];
}
