import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { Project } from '../projects/entities/project.entity';
import {
  ProjectMember,
  ProjectRole,
} from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { AiClientService } from '../ai-client/ai-client.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Subtask)
    private subtaskRepository: Repository<Subtask>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private aiClient: AiClientService,
  ) {}

  // Crear tarea en un proyecto
  async create(
    projectId: number,
    createTaskDto: CreateTaskDto,
    userId: number,
  ): Promise<Task> {
    await this.checkMemberPermission(projectId, userId);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    // Calcular el siguiente taskNumber para este proyecto
    const lastTask = await this.taskRepository.findOne({
      where: { project: { id: projectId } },
      order: { taskNumber: 'DESC' },
    });
    const nextTaskNumber = lastTask ? lastTask.taskNumber + 1 : 1;

    let assignee = null;
    if (createTaskDto.assigneeId) {
      // Verificar que el usuario sea miembro del proyecto
      const isMember = await this.memberRepository.findOne({
        where: {
          project: { id: projectId },
          user: { id: createTaskDto.assigneeId },
        },
      });
      if (!isMember) {
        throw new BadRequestException(
          'Este usuario aun no es miembro del proyecto',
        );
      }

      assignee = await this.userRepository.findOne({
        where: { id: createTaskDto.assigneeId },
      });
      if (!assignee) {
        throw new NotFoundException(
          `Usuario con ID ${createTaskDto.assigneeId} no encontrado`,
        );
      }
    }

    const task = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description || null,
      status: createTaskDto.status || TaskStatus.PENDING,
      startDate: createTaskDto.startDate || null,
      endDate: createTaskDto.endDate || null,
      taskNumber: nextTaskNumber,
      project,
      assignee,
    });

    return this.taskRepository.save(task);
  }

  // Listar tareas de un proyecto
  async findByProject(projectId: number, userId: number): Promise<Task[]> {
    await this.checkViewerPermission(projectId, userId);

    return this.taskRepository.find({
      where: { project: { id: projectId } },
      relations: ['assignee', 'subtasks'],
      order: { createdAt: 'ASC' },
    });
  }

  // Ver tareas asignadas al usuario autenticado dentro de un proyecto
  async findMyTasks(projectId: number, userId: number): Promise<Task[]> {
    await this.checkViewerPermission(projectId, userId);

    return this.taskRepository.find({
      where: {
        project: { id: projectId },
        assignee: { id: userId },
      },
      relations: ['assignee', 'subtasks'],
      order: { createdAt: 'ASC' },
    });
  }

  // Ver una tarea por ID
  async findOne(
    taskNumber: number,
    projectId: number,
    userId: number,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { taskNumber, project: { id: projectId } },
      relations: ['project', 'assignee', 'subtasks'],
    });
    if (!task)
      throw new NotFoundException(
        `Tarea #${taskNumber} no encontrada en este proyecto`,
      );

    await this.checkViewerPermission(task.project.id, userId);
    return task;
  }

  // Editar tarea por taskNumber
  async update(
    taskNumber: number,
    projectId: number,
    updateTaskDto: UpdateTaskDto,
    userId: number,
  ): Promise<Task> {
    const task = await this.findOne(taskNumber, projectId, userId);
    await this.checkMemberPermission(task.project.id, userId);

    if (updateTaskDto.assigneeId) {
      // Verificar que el usuario sea miembro del proyecto
      const isMember = await this.memberRepository.findOne({
        where: {
          project: { id: projectId },
          user: { id: updateTaskDto.assigneeId },
        },
      });
      if (!isMember) {
        throw new BadRequestException(
          'Este usuario aun no es miembro del proyecto',
        );
      }

      const assignee = await this.userRepository.findOne({
        where: { id: updateTaskDto.assigneeId },
      });
      task.assignee = assignee;
    }

    if (updateTaskDto.title) task.title = updateTaskDto.title;
    if (updateTaskDto.description) task.description = updateTaskDto.description;
    if (updateTaskDto.startDate) task.startDate = updateTaskDto.startDate;
    if (updateTaskDto.endDate) task.endDate = updateTaskDto.endDate;

    return this.taskRepository.save(task);
  }

  // Mover tarea por taskNumber
  async moveTask(
    taskNumber: number,
    projectId: number,
    moveTaskDto: MoveTaskDto,
    userId: number,
  ): Promise<Task> {
    const task = await this.findOne(taskNumber, projectId, userId);
    await this.checkMemberPermission(task.project.id, userId);

    if (moveTaskDto.status === TaskStatus.IN_PROGRESS) {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      const inProgressCount = await this.taskRepository.count({
        where: {
          project: { id: projectId },
          status: TaskStatus.IN_PROGRESS,
        },
      });

      if (inProgressCount >= project.wipLimit) {
        throw new BadRequestException(
          `Límite WIP alcanzado. Máximo ${project.wipLimit} tareas en progreso permitidas`,
        );
      }
    }

    task.status = moveTaskDto.status;
    return this.taskRepository.save(task);
  }

  // Eliminar tarea por taskNumber
  async remove(
    taskNumber: number,
    projectId: number,
    userId: number,
  ): Promise<{ message: string }> {
    const task = await this.findOne(taskNumber, projectId, userId);
    await this.checkLeaderPermission(task.project.id, userId);
    await this.taskRepository.remove(task);
    return { message: `Tarea #${taskNumber} eliminada correctamente` };
  }

  // Marcar como desarrollada por taskNumber
  async developTask(
    taskNumber: number,
    projectId: number,
    userId: number,
  ): Promise<Task> {
    const task = await this.findOne(taskNumber, projectId, userId);

    if (!task.assignee || task.assignee.id !== userId) {
      throw new ForbiddenException(
        'Solo el miembro asignado puede marcar esta tarea como desarrollada',
      );
    }

    if (task.status === TaskStatus.DONE) {
      throw new BadRequestException('La tarea ya está completada');
    }

    task.status = TaskStatus.DONE;
    return this.taskRepository.save(task);
  }

  // Filtrar tareas por estado, responsable o proyecto - RF019
  async filterTasks(
    projectId: number,
    userId: number,
    filters: {
      status?: TaskStatus;
      assigneeId?: number;
    },
  ): Promise<Task[]> {
    await this.checkViewerPermission(projectId, userId);

    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .where('task.projectId = :projectId', { projectId }); // ← cambio aquí

    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.assigneeId) {
      query.andWhere('assignee.id = :assigneeId', {
        assigneeId: filters.assigneeId,
      });
    }

    return query.getMany();
  }

  // Obtener subtareas de una tarea
  async findSubtasks(
    taskNumber: number,
    projectId: number,
    userId: number,
  ): Promise<Subtask[]> {
    const task = await this.findOne(taskNumber, projectId, userId);
    return this.subtaskRepository.find({
      where: { task: { id: task.id } },
      order: { id: 'ASC' },
    });
  }

  // Generar subtareas con IA
  async generateSubtasks(
    taskNumber: number,
    projectId: number,
    userId: number,
  ): Promise<Subtask[]> {
    const task = await this.findOne(taskNumber, projectId, userId);
    await this.checkMemberPermission(task.project.id, userId);

    const subtaskTitles = await this.aiClient.generateSubtasks(task.title);

    const subtasks = subtaskTitles.map((title) =>
      this.subtaskRepository.create({ title, task }),
    );

    return this.subtaskRepository.save(subtasks);
  }

  // ─── Helpers de permisos ─────────────────────────────────────

  // Acceso de lectura: público → cualquier autenticado; privado → solo miembros (MEMBER o LEADER)
  private async checkViewerPermission(
    projectId: number,
    userId: number,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    if (project.isPublic) return; // proyecto público, cualquier usuario autenticado puede ver

    const membership = await this.memberRepository.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
    });
    if (!membership)
      throw new ForbiddenException(
        'Este proyecto es privado. Solo sus miembros pueden ver sus tareas',
      );
  }

  // Verifica que el usuario sea MEMBER o LEADER
  private async checkMemberPermission(
    projectId: number,
    userId: number,
  ): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
    });
    if (!membership) {
      throw new ForbiddenException(
        'Necesitas ser miembro del proyecto para realizar esta acción',
      );
    }
  }

  // Verifica que el usuario sea LEADER
  private async checkLeaderPermission(
    projectId: number,
    userId: number,
  ): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: userId },
        role: ProjectRole.LEADER,
      },
    });
    if (!membership)
      throw new ForbiddenException('Solo el líder puede realizar esta acción');
  }
}
