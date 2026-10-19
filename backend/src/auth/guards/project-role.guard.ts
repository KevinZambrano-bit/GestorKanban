import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectMember,
  ProjectRole,
} from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { PROJECT_ROLE_KEY } from '../decorators/project-role.decorator';
import { userIsGlobalAdmin } from '../../common/global-admin';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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

    // Si el proyecto es público cualquier usuario autenticado puede VER,
    // pero nunca escribir: el bypass solo aplica a peticiones de lectura.
    // En POST/PATCH/PUT/DELETE se ignora isPublic y se exige membresía
    // y rol igual que en un proyecto privado.
    const isReadRequest = request.method === 'GET';
    if (project?.isPublic && isReadRequest) {
      return true;
    }

    // Buscar membresía del usuario en el proyecto
    const membership = await this.memberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: userId },
      },
    });

    // Verificar si el rol del usuario está en los roles requeridos
    if (membership && requiredRoles.includes(membership.role)) return true;

    // El admin global tiene control total: puede operar sobre cualquier
    // proyecto (público o privado) aunque no sea miembro. Se consulta en BD,
    // no en el JWT, para que un cambio de rol surta efecto de inmediato.
    if (await userIsGlobalAdmin(this.userRepository, userId)) return true;

    if (!membership)
      throw new ForbiddenException('No eres miembro de este proyecto');

    throw new ForbiddenException(
      `Necesitas ser ${requiredRoles.join(' o ')} para realizar esta acción`,
    );
  }
}
