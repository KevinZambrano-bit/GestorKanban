import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember, ProjectRole } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { PROJECT_ROLE_KEY } from '../decorators/project-role.decorator';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[]>(
      PROJECT_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no requiere rol específico deja pasar
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const projectId = +request.params?.projectId || +request.params?.id;

    if (!userId || !projectId) throw new ForbiddenException('Acceso denegado');

    // Verificar si el proyecto es público
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    // Si el proyecto es público cualquier usuario autenticado puede ver
    if (project?.isPublic) {
      return true;
    }

    // Buscar membresía del usuario en el proyecto
    const membership = await this.memberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: userId },
      },
    });

    if (!membership) throw new ForbiddenException('No eres miembro de este proyecto');

    // Verificar si el rol del usuario está en los roles requeridos
    const hasRole = requiredRoles.includes(membership.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Necesitas ser ${requiredRoles.join(' o ')} para realizar esta acción`
      );
    }

    return true;
  }
}