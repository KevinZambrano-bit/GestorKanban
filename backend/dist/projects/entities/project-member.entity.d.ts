import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';
export declare enum ProjectRole {
    LEADER = "leader",
    MEMBER = "member"
}
export declare class ProjectMember {
    id: number;
    role: ProjectRole;
    joinedAt: Date;
    project: Project;
    user: User;
}
