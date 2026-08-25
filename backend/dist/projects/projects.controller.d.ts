import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateWipDto } from './dto/update-wip.dto';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    create(createProjectDto: CreateProjectDto, req: any): Promise<import("./entities/project.entity").Project>;
    findAllProjects(): Promise<any[]>;
    findMyProjects(req: any): Promise<any[]>;
    findOne(id: string, req: any): Promise<import("./entities/project.entity").Project>;
    update(id: string, updateProjectDto: UpdateProjectDto, req: any): Promise<import("./entities/project.entity").Project>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
    inviteMember(id: string, inviteMemberDto: InviteMemberDto, req: any): Promise<{
        message: string;
    }>;
    getProjectMembers(id: string, req: any): Promise<any[]>;
    removeMember(id: string, memberId: string, req: any): Promise<{
        message: string;
    }>;
    updateWip(id: string, updateWipDto: UpdateWipDto, req: any): Promise<import("./entities/project.entity").Project>;
}
