import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember, ProjectRole } from './entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) { }

  // Crear proyecto → el creador queda como LEADER
  async create(createProjectDto: CreateProjectDto, userId: number): Promise<Project> {
    const leader = await this.userRepository.findOne({ where: { id: userId } });

    const project = this.projectRepository.create({
      ...createProjectDto,
      leader,
    });
    await this.projectRepository.save(project);

    // El creador queda como LEADER automáticamente
    const member = this.memberRepository.create({
      project,
      user: leader,
      role: ProjectRole.LEADER,
    });
    await this.memberRepository.save(member);

    return project;
  }

  // Listar proyectos del usuario autenticado
  async findMyProjects(userId: number): Promise<any[]> {
    const memberships = await this.memberRepository.find({
      where: { user: { id: userId } },
      relations: ['project', 'project.leader'],
    });

    return memberships.map((m) => ({
      ...m.project,
      myRole: m.role,
    }));
  }

  // Listar todos los proyectos (solo admin)
  async findAllProjects(): Promise<any[]> {
    const projects = await this.projectRepository.find({
      relations: ['leader'],
      order: { createdAt: 'DESC' },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      isPublic: project.isPublic,
      wipLimit: project.wipLimit,
      createdAt: project.createdAt,
      createdBy: {
        id: project.leader?.id,
        name: project.leader?.name,
        email: project.leader?.email,
      },
    }));
  }

  // Ver un proyecto por ID
  async findOne(id: number, userId: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['leader', 'members', 'members.user'],
    });

    if (!project) throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);

    // Si es público cualquier usuario autenticado puede verlo
    if (project.isPublic) return project;

    // Si es privado debe ser miembro
    const isMember = project.members.some((m) => m.user?.id === userId);
    if (!isMember) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return project;
  }

  // Editar proyecto (solo LEADER)
  async update(id: number, updateProjectDto: UpdateProjectDto, userId: number): Promise<Project> {
    const project = await this.findOne(id, userId);
    await this.checkLeaderPermission(id, userId);
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  // Eliminar proyecto (solo LEADER)
  async remove(id: number, userId: number): Promise<{ message: string }> {
    const project = await this.findOne(id, userId);
    await this.checkLeaderPermission(id, userId);
    await this.projectRepository.remove(project);
    return { message: `Proyecto "${project.name}" eliminado correctamente` };
  }

  // Invitar miembro por email (solo LEADER)
  async inviteMember(id: number, inviteMemberDto: InviteMemberDto, userId: number): Promise<{ message: string }> {
    await this.checkLeaderPermission(id, userId);

    const project = await this.projectRepository.findOne({ where: { id } });
    const user = await this.userRepository.findOne({
      where: { email: inviteMemberDto.email },
    });

    if (!user) throw new NotFoundException(`Usuario con email ${inviteMemberDto.email} no encontrado`);

    // Verificar si ya es miembro
    const exists = await this.memberRepository.findOne({
      where: { project: { id }, user: { id: user.id } },
    });
    if (exists) throw new ForbiddenException('El usuario ya es miembro de este proyecto');

    const member = this.memberRepository.create({
      project,
      user,
      role: inviteMemberDto.role || ProjectRole.MEMBER,
    });
    await this.memberRepository.save(member);

    return { message: `${user.name} agregado como ${member.role} correctamente` };
  }

  // Configurar límite WIP (solo LEADER)
  async updateWipLimit(id: number, wipLimit: number, userId: number): Promise<Project> {
    await this.checkLeaderPermission(id, userId);
    const project = await this.projectRepository.findOne({ where: { id } });
    project.wipLimit = wipLimit;
    return this.projectRepository.save(project);
  }

  // Obtener miembros de un proyecto (member, leader)
  async getProjectMembers(id: number, userId: number): Promise<any[]> {
    const project = await this.findOne(id, userId);

    const members = await this.memberRepository.find({
      where: { project: { id } },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  // Eliminar miembro del proyecto (solo LEADER)
  async removeMember(id: number, memberId: number, userId: number): Promise<{ message: string }> {
    await this.checkLeaderPermission(id, userId);

    // Verificar que no se esté eliminando a sí mismo
    if (memberId === userId) {
      throw new ForbiddenException('No puedes eliminarte a ti mismo del proyecto');
    }

    // Verificar que el miembro existe en el proyecto
    const membership = await this.memberRepository.findOne({
      where: { project: { id }, user: { id: memberId } },
      relations: ['user'],
    });
    if (!membership) {
      throw new NotFoundException('El usuario no es miembro de este proyecto');
    }

    // Verificar que no se esté eliminando al líder
    if (membership.role === ProjectRole.LEADER) {
      throw new ForbiddenException('No puedes eliminar al líder del proyecto');
    }

    // Desasignar todas las tareas del miembro eliminado
    await this.taskRepository.update(
      { project: { id }, assignee: { id: memberId } },
      { assignee: null }
    );

    // Eliminar la membresía
    await this.memberRepository.remove(membership);

    return { message: `${membership.user.name} ha sido eliminado del proyecto y sus tareas han sido desasignadas` };
  }

  // Helper → verifica que el usuario sea LEADER del proyecto
  private async checkLeaderPermission(projectId: number, userId: number): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: userId },
        role: ProjectRole.LEADER,
      },
    });
    if (!membership) throw new ForbiddenException('Solo el líder puede realizar esta acción');
  }
}