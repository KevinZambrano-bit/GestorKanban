import { ProjectRole } from '../../projects/entities/project-member.entity';
export declare const PROJECT_ROLE_KEY = "projectRole";
export declare const RequireProjectRole: (...roles: ProjectRole[]) => import("@nestjs/common").CustomDecorator<string>;
