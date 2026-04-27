import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember, ProjectRole } from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

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
  ) {}

  // Crear tarea en un proyecto
  async create(projectId: number, createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
    await this.checkMemberPermission(projectId, userId);

    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    let assignee = null;
    if (createTaskDto.assigneeId) {
      assignee = await this.userRepository.findOne({
        where: { id: createTaskDto.assigneeId },
      });
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
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

  // Ver una tarea por ID
  async findOne(id: number, userId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'assignee', 'subtasks'],
    });
    if (!task) throw new NotFoundException(`Tarea con ID ${id} no encontrada`);

    await this.checkViewerPermission(task.project.id, userId);
    return task;
  }

  // Editar tarea
  async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
    const task = await this.findOne(id, userId);
    await this.checkMemberPermission(task.project.id, userId);

    if (updateTaskDto.assigneeId) {
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

  // Mover tarea entre columnas (con validación WIP)
  async moveTask(id: number, moveTaskDto: MoveTaskDto, userId: number): Promise<Task> {
    const task = await this.findOne(id, userId);
    await this.checkMemberPermission(task.project.id, userId);

    // Validación WIP - RF015 y RF016
    if (moveTaskDto.status === TaskStatus.IN_PROGRESS) {
      const project = await this.projectRepository.findOne({
        where: { id: task.project.id },
      });

      const inProgressCount = await this.taskRepository.count({
        where: {
          project: { id: task.project.id },
          status: TaskStatus.IN_PROGRESS,
        },
      });

      if (inProgressCount >= project.wipLimit) {
        throw new BadRequestException(
          `Límite WIP alcanzado. Máximo ${project.wipLimit} tareas en progreso permitidas`
        );
      }
    }

    task.status = moveTaskDto.status;
    return this.taskRepository.save(task);
  }

  // Eliminar tarea (solo LEADER)
  async remove(id: number, userId: number): Promise<{ message: string }> {
    const task = await this.findOne(id, userId);
    await this.checkLeaderPermission(task.project.id, userId);
    await this.taskRepository.remove(task);
    return { message: `Tarea "${task.title}" eliminada correctamente` };
  }

  // Asignar tarea a un usuario (solo LEADER)
  async assignTask(id: number, assigneeId: number, userId: number): Promise<Task> {
    const task = await this.findOne(id, userId);
    await this.checkLeaderPermission(task.project.id, userId);

    const assignee = await this.userRepository.findOne({
      where: { id: assigneeId },
    });
    if (!assignee) throw new NotFoundException('Usuario no encontrado');

    task.assignee = assignee;
    return this.taskRepository.save(task);
  }

  // Filtrar tareas por estado, responsable o proyecto - RF019
  async filterTasks(projectId: number, userId: number, filters: {
    status?: TaskStatus;
    assigneeId?: number;
  }): Promise<Task[]> {
    await this.checkViewerPermission(projectId, userId);

    const query = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .where('task.project_id = :projectId', { projectId });

    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.assigneeId) {
      query.andWhere('assignee.id = :assigneeId', { assigneeId: filters.assigneeId });
    }

    return query.getMany();
  }

  // ─── Helpers de permisos ─────────────────────────────────────

  // Verifica que el usuario sea al menos VIEWER del proyecto
  private async checkViewerPermission(projectId: number, userId: number): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (project?.isPublic) return; // proyecto público, cualquiera puede ver

    const membership = await this.memberRepository.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
    });
    if (!membership) throw new ForbiddenException('No tienes acceso a este proyecto');
  }

  // Verifica que el usuario sea MEMBER o LEADER
  private async checkMemberPermission(projectId: number, userId: number): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
    });
    if (!membership || membership.role === ProjectRole.MEMBER) {
      throw new ForbiddenException('Necesitas ser miembro del proyecto para realizar esta acción');
    }
  }

  // Verifica que el usuario sea LEADER
  private async checkLeaderPermission(projectId: number, userId: number): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: { project: { id: projectId }, user: { id: userId }, role: ProjectRole.LEADER },
    });
    if (!membership) throw new ForbiddenException('Solo el líder puede realizar esta acción');
  }
}