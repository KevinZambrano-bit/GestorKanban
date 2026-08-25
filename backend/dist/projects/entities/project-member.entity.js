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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMember = exports.ProjectRole = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const project_entity_1 = require("./project.entity");
var ProjectRole;
(function (ProjectRole) {
    ProjectRole["LEADER"] = "leader";
    ProjectRole["MEMBER"] = "member";
})(ProjectRole || (exports.ProjectRole = ProjectRole = {}));
let ProjectMember = class ProjectMember {
};
exports.ProjectMember = ProjectMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ProjectMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProjectRole, default: ProjectRole.MEMBER }),
    __metadata("design:type", String)
], ProjectMember.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProjectMember.prototype, "joinedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (p) => p.members, { onDelete: 'CASCADE' }),
    __metadata("design:type", project_entity_1.Project)
], ProjectMember.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.memberships, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], ProjectMember.prototype, "user", void 0);
exports.ProjectMember = ProjectMember = __decorate([
    (0, typeorm_1.Entity)('project_members')
], ProjectMember);
//# sourceMappingURL=project-member.entity.js.map