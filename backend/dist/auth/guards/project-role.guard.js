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
exports.ProjectRoleGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_member_entity_1 = require("../../projects/entities/project-member.entity");
const project_entity_1 = require("../../projects/entities/project.entity");
const project_role_decorator_1 = require("../decorators/project-role.decorator");
let ProjectRoleGuard = class ProjectRoleGuard {
    constructor(reflector, memberRepository, projectRepository) {
        this.reflector = reflector;
        this.memberRepository = memberRepository;
        this.projectRepository = projectRepository;
    }
    async canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(project_role_decorator_1.PROJECT_ROLE_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;
        const projectId = +request.params?.projectId || +request.params?.id;
        if (!userId || !projectId)
            throw new common_1.ForbiddenException('Acceso denegado');
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });
        if (project?.isPublic) {
            return true;
        }
        const membership = await this.memberRepository.findOne({
            where: {
                project: { id: projectId },
                user: { id: userId },
            },
        });
        if (!membership)
            throw new common_1.ForbiddenException('No eres miembro de este proyecto');
        const hasRole = requiredRoles.includes(membership.role);
        if (!hasRole) {
            throw new common_1.ForbiddenException(`Necesitas ser ${requiredRoles.join(' o ')} para realizar esta acción`);
        }
        return true;
    }
};
exports.ProjectRoleGuard = ProjectRoleGuard;
exports.ProjectRoleGuard = ProjectRoleGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(project_member_entity_1.ProjectMember)),
    __param(2, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __metadata("design:paramtypes", [core_1.Reflector,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProjectRoleGuard);
//# sourceMappingURL=project-role.guard.js.map