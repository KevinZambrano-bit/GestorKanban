import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';

export interface AdminStats {
  users: number;
  projects: number;
  tasks: {
    total: number;
    byStatus: Record<TaskStatus, number>;
  };
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  // Conteos globales de la plataforma. Se agrupa en BD en lugar de traer
  // todas las tareas a memoria solo para contarlas.
  async getStats(): Promise<AdminStats> {
    const [users, projects, rows] = await Promise.all([
      this.userRepository.count(),
      this.projectRepository.count(),
      this.taskRepository
        .createQueryBuilder('task')
        .select('task.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('task.status')
        .getRawMany<{ status: TaskStatus; count: string }>(),
    ]);

    // Todos los estados salen en la respuesta, aunque no tengan tareas
    const byStatus = Object.fromEntries(
      Object.values(TaskStatus).map((status) => [status, 0]),
    ) as Record<TaskStatus, number>;
    for (const row of rows) byStatus[row.status] = Number(row.count);

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    return { users, projects, tasks: { total, byStatus } };
  }
}
