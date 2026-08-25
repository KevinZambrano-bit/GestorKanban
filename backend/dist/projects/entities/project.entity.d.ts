import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ProjectMember } from './project-member.entity';
export declare class Project {
    id: number;
    name: string;
    description: string;
    wipLimit: number;
    isPublic: boolean;
    createdAt: Date;
    leader: User;
    members: ProjectMember[];
    tasks: Task[];
}
