"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_entity_1 = require("./entities/project.entity");
const project_member_entity_1 = require("./entities/project-member.entity");
const user_entity_1 = require("../users/entities/user.entity");
const task_entity_1 = require("../tasks/entities/task.entity");
let ProjectsService = class ProjectsService {
    constructor(projectRepository, memberRepository, userRepository, taskRepository) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }
    async create(createProjectDto, userId) {
        const leader = await this.userRepository.findOne({ where: { id: userId } });
        const project = this.projectRepository.create({
            ...createProjectDto,
            leader,
        });
        await this.projectRepository.save(project);
        const member = this.memberRepository.create({
            project,
            user: leader,
            role: project_member_entity_1.ProjectRole.LEADER,
        });
        await this.memberRepository.save(member);
        return project;
    }
    async findMyProjects(userId) {
        const memberships = await this.memberRepository.find({
            where: { user: { id: userId } },
            relations: ['project', 'project.leader'],
        });
        return memberships.map((m) => ({
            ...m.project,
            myRole: m.role,
        }));
    }
    async findAllProjects() {
        const projects = await this.projectRepository.find({
            relations: ['leader'],
            order: { createdAt: 'DESC' },
        });
        return projects.map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            isPublic: project.isPublic,
            wipLimit: project.wipLimit,
            createdAt: project.createdAt,
            createdBy: {
                id: project.leader?.id,
                name: project.leader?.name,
                email: project.leader?.email,
            },
        }));
    }
    async findOne(id, userId) {
        const project = await this.projectRepository.findOne({
            where: { id },
            relations: ['leader', 'members', 'members.user'],
        });
        if (!project)
            throw new common_1.NotFoundException(`Proyecto con ID ${id} no encontrado`);
        if (project.isPublic)
            return project;
        const isMember = project.members.some((m) => m.user?.id === userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('No tienes acceso a este proyecto');
        }
        return project;
    }
    async update(id, updateProjectDto, userId) {
        const project = await this.findOne(id, userId);
        await this.checkLeaderPermission(id, userId);
        Object.assign(project, updateProjectDto);
        return this.projectRepository.save(project);
    }
    async remove(id, userId) {
        const project = await this.findOne(id, userId);
        await this.checkLeaderPermission(id, userId);
        await this.projectRepository.remove(project);
        return { message: `Proyecto "${project.name}" eliminado correctamente` };
    }
    async inviteMember(id, inviteMemberDto, userId) {
        await this.checkLeaderPermission(id, userId);
        const project = await this.projectRepository.findOne({ where: { id } });
        const user = await this.userRepository.findOne({
            where: { email: inviteMemberDto.email },
        });
        if (!user)
            throw new common_1.NotFoundException(`Usuario con email ${inviteMemberDto.email} no encontrado`);
        const exists = await this.memberRepository.findOne({
            where: { project: { id }, user: { id: user.id } },
        });
        if (exists)
            throw new common_1.ForbiddenException('El usuario ya es miembro de este proyecto');
        const member = this.memberRepository.create({
            project,
            user,
            role: inviteMemberDto.role || project_member_entity_1.ProjectRole.MEMBER,
        });
        await this.memberRepository.save(member);
        return {
            message: `${user.name} agregado como ${member.role} correctamente`,
        };
    }
    async updateWipLimit(id, wipLimit, userId) {
        await this.checkLeaderPermission(id, userId);
        const project = await this.projectRepository.findOne({ where: { id } });
        project.wipLimit = wipLimit;
        return this.projectRepository.save(project);
    }
    async getProjectMembers(id, userId) {
        const project = await this.findOne(id, userId);
        const members = await this.memberRepository.find({
            where: { project: { id } },
            relations: ['user'],
            order: { joinedAt: 'ASC' },
        });
        return members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            joinedAt: m.joinedAt,
        }));
    }
    async removeMember(id, memberId, userId) {
        await this.checkLeaderPermission(id, userId);
        if (memberId === userId) {
            throw new common_1.ForbiddenException('No puedes eliminarte a ti mismo del proyecto');
        }
        const membership = await this.memberRepository.findOne({
            where: { project: { id }, user: { id: memberId } },
            relations: ['user'],
        });
        if (!membership) {
            throw new common_1.NotFoundException('El usuario no es miembro de este proyecto');
        }
        if (membership.role === project_member_entity_1.ProjectRole.LEADER) {
            throw new common_1.ForbiddenException('No puedes eliminar al líder del proyecto');
        }
        await this.taskRepository.update({ project: { id }, assignee: { id: memberId } }, { assignee: null });
        await this.memberRepository.remove(membership);
        return {
            message: `${membership.user.name} ha sido eliminado del proyecto y sus tareas han sido desasignadas`,
        };
    }
    async checkLeaderPermission(projectId, userId) {
        const membership = await this.memberRepository.findOne({
            where: {
                project: { id: projectId },
                user: { id: userId },
                role: project_member_entity_1.ProjectRole.LEADER,
            },
        });
        if (!membership)
            throw new common_1.ForbiddenException('Solo el líder puede realizar esta acción');
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(project_member_entity_1.ProjectMember)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map