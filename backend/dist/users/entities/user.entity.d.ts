import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Role } from '../../roles/entities/role.entity';
export declare class User {
    id: number;
    name: string;
    email: string;
    password: string;
    googleId: string;
    avatar: string;
    createdAt: Date;
    role: Role;
    projects: Project[];
    memberships: ProjectMember[];
    tasks: Task[];
}
