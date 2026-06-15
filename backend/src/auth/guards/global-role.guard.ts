import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GLOBAL_ROLE_KEY } from '../decorators/global-role.decorator';

@Injectable()
export class GlobalRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      GLOBAL_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) throw new ForbiddenException('Usuario no encontrado');

    const hasRole = requiredRoles.includes(user.role?.name);
    if (!hasRole) {
      throw new ForbiddenException(
        `Necesitas rol ${requiredRoles.join(' o ')} para realizar esta acción`,
      );
    }

    return true;
  }
}
