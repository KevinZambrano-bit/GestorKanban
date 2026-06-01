import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '../../projects/entities/project-member.entity';

export const PROJECT_ROLE_KEY = 'projectRole';
export const RequireProjectRole = (...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ROLE_KEY, roles);