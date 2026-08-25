import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
export declare class ProjectsService {
    private projectRepository;
    private memberRepository;
    private userRepository;
    private taskRepository;
    constructor(projectRepository: Repository<Project>, memberRepository: Repository<ProjectMember>, userRepository: Repository<User>, taskRepository: Repository<Task>);
    create(createProjectDto: CreateProjectDto, userId: number): Promise<Project>;
    findMyProjects(userId: number): Promise<any[]>;
    findAllProjects(): Promise<any[]>;
    findOne(id: number, userId: number): Promise<Project>;
    update(id: number, updateProjectDto: UpdateProjectDto, userId: number): Promise<Project>;
    remove(id: number, userId: number): Promise<{
        message: string;
    }>;
    inviteMember(id: number, inviteMemberDto: InviteMemberDto, userId: number): Promise<{
        message: string;
    }>;
    updateWipLimit(id: number, wipLimit: number, userId: number): Promise<Project>;
    getProjectMembers(id: number, userId: number): Promise<any[]>;
    removeMember(id: number, memberId: number, userId: number): Promise<{
        message: string;
    }>;
    private checkLeaderPermission;
}
