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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const projects_service_1 = require("./projects.service");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const invite_member_dto_1 = require("./dto/invite-member.dto");
const update_wip_dto_1 = require("./dto/update-wip.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const project_role_guard_1 = require("../auth/guards/project-role.guard");
const project_role_decorator_1 = require("../auth/decorators/project-role.decorator");
const project_member_entity_1 = require("./entities/project-member.entity");
const global_role_guard_1 = require("../auth/guards/global-role.guard");
const global_role_decorator_1 = require("../auth/decorators/global-role.decorator");
let ProjectsController = class ProjectsController {
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    create(createProjectDto, req) {
        return this.projectsService.create(createProjectDto, req.user.id);
    }
    findAllProjects() {
        return this.projectsService.findAllProjects();
    }
    findMyProjects(req) {
        return this.projectsService.findMyProjects(req.user.id);
    }
    findOne(id, req) {
        return this.projectsService.findOne(+id, req.user.id);
    }
    update(id, updateProjectDto, req) {
        return this.projectsService.update(+id, updateProjectDto, req.user.id);
    }
    remove(id, req) {
        return this.projectsService.remove(+id, req.user.id);
    }
    inviteMember(id, inviteMemberDto, req) {
        return this.projectsService.inviteMember(+id, inviteMemberDto, req.user.id);
    }
    getProjectMembers(id, req) {
        return this.projectsService.getProjectMembers(+id, req.user.id);
    }
    removeMember(id, memberId, req) {
        return this.projectsService.removeMember(+id, +memberId, req.user.id);
    }
    updateWip(id, updateWipDto, req) {
        return this.projectsService.updateWipLimit(+id, updateWipDto.wipLimit, req.user.id);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo proyecto' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(global_role_guard_1.GlobalRoleGuard),
    (0, global_role_decorator_1.RequireGlobalRole)('admin'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver todos los proyectos de la plataforma (solo ADMIN)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de todos los proyectos con creador',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No tienes permisos de administrador',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findAllProjects", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar mis proyectos' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findMyProjects", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(project_role_guard_1.ProjectRoleGuard),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Ver proyecto (member, leader)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(project_role_guard_1.ProjectRoleGuard),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Editar proyecto (solo LEADER)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_project_dto_1.UpdateProjectDto, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(project_role_guard_1.ProjectRoleGuard),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar proyecto (solo LEADER)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    (0, common_1.UseGuards)(project_role_guard_1.ProjectRoleGuard),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Invitar miembro (solo LEADER)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invite_member_dto_1.InviteMemberDto, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "inviteMember", null);
__decorate([
    (0, common_1.Get)(':id/members'),
    (0, common_1.UseGuards)(project_role_guard_1.ProjectRoleGuard),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener miembros del proyecto (member, leader)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "getProjectMembers", null);
__decorate([
    (0, common_1.Delete)(':id/members/:memberId'),
    (0, common_1.UseGuards)(project_role_guard_1.ProjectRoleGuard),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar miembro del proyecto (solo LEADER)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Patch)(':id/wip'),
    (0, common_1.UseGuards)(project_role_guard_1.ProjectRoleGuard),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Configurar límite WIP (solo LEADER)' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'wipLimit inválido' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_wip_dto_1.UpdateWipDto, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "updateWip", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, swagger_1.ApiTags)('Projects'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('projects'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map