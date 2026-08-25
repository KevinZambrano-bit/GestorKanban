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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tasks_service_1 = require("./tasks.service");
const create_task_dto_1 = require("./dto/create-task.dto");
const update_task_dto_1 = require("./dto/update-task.dto");
const move_task_dto_1 = require("./dto/move-task.dto");
const update_subtask_dto_1 = require("./dto/update-subtask.dto");
const filter_tasks_dto_1 = require("./dto/filter-tasks.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const project_role_guard_1 = require("../auth/guards/project-role.guard");
const project_role_decorator_1 = require("../auth/decorators/project-role.decorator");
const project_member_entity_1 = require("../projects/entities/project-member.entity");
let TasksController = class TasksController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    create(projectId, createTaskDto, req) {
        return this.tasksService.create(+projectId, createTaskDto, req.user.id);
    }
    findAll(projectId, req) {
        return this.tasksService.findByProject(+projectId, req.user.id);
    }
    findMyTasks(projectId, req) {
        return this.tasksService.findMyTasks(+projectId, req.user.id);
    }
    filterTasks(projectId, filters, req) {
        return this.tasksService.filterTasks(+projectId, req.user.id, filters);
    }
    findOne(taskNumber, projectId, req) {
        return this.tasksService.findOne(+taskNumber, +projectId, req.user.id);
    }
    update(taskNumber, projectId, updateTaskDto, req) {
        return this.tasksService.update(+taskNumber, +projectId, updateTaskDto, req.user.id);
    }
    remove(taskNumber, projectId, req) {
        return this.tasksService.remove(+taskNumber, +projectId, req.user.id);
    }
    moveTask(taskNumber, projectId, moveTaskDto, req) {
        return this.tasksService.moveTask(+taskNumber, +projectId, moveTaskDto, req.user.id);
    }
    findSubtasks(taskNumber, projectId, req) {
        return this.tasksService.findSubtasks(+taskNumber, +projectId, req.user.id);
    }
    updateSubtask(taskNumber, subtaskId, projectId, updateSubtaskDto, req) {
        return this.tasksService.updateSubtask(+taskNumber, +projectId, +subtaskId, updateSubtaskDto, req.user.id);
    }
    removeSubtask(taskNumber, subtaskId, projectId, req) {
        return this.tasksService.removeSubtask(+taskNumber, +projectId, +subtaskId, req.user.id);
    }
    generateSubtasks(taskNumber, projectId, req) {
        return this.tasksService.generateSubtasks(+taskNumber, +projectId, req.user.id);
    }
    developTask(taskNumber, projectId, req) {
        return this.tasksService.developTask(+taskNumber, +projectId, req.user.id);
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Post)(),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Crear tarea (member, leader)' }),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_task_dto_1.CreateTaskDto, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Listar tareas del proyecto' }),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my-tasks'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver tareas asignadas al usuario autenticado en el proyecto',
    }),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findMyTasks", null);
__decorate([
    (0, common_1.Get)('filter'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Filtrar tareas por estado y/o responsable' }),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, filter_tasks_dto_1.FilterTasksDto, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "filterTasks", null);
__decorate([
    (0, common_1.Get)(':taskNumber'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Ver tarea por número dentro del proyecto' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':taskNumber'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Editar tarea (member)' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_task_dto_1.UpdateTaskDto, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':taskNumber'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar tarea (solo LEADER)' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':taskNumber/move'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Mover tarea entre columnas (valida WIP)' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, move_task_dto_1.MoveTaskDto, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "moveTask", null);
__decorate([
    (0, common_1.Get)(':taskNumber/subtasks'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener subtareas de una tarea (member, leader)' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findSubtasks", null);
__decorate([
    (0, common_1.Patch)(':taskNumber/subtasks/:subtaskId'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar subtarea: marcar completada o editar título (member, leader)',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Subtarea no encontrada' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('subtaskId')),
    __param(2, (0, common_1.Param)('projectId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_subtask_dto_1.UpdateSubtaskDto, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "updateSubtask", null);
__decorate([
    (0, common_1.Delete)(':taskNumber/subtasks/:subtaskId'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar subtarea (member, leader)' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Subtarea no encontrada' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('subtaskId')),
    __param(2, (0, common_1.Param)('projectId')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "removeSubtask", null);
__decorate([
    (0, common_1.Post)(':taskNumber/generate-subtasks'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({ summary: 'Generar subtareas con IA (member, leader)' }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "generateSubtasks", null);
__decorate([
    (0, common_1.Patch)(':taskNumber/develop'),
    (0, project_role_decorator_1.RequireProjectRole)(project_member_entity_1.ProjectRole.MEMBER, project_member_entity_1.ProjectRole.LEADER),
    (0, swagger_1.ApiOperation)({
        summary: 'Marcar tarea como desarrollada (solo el miembro asignado)',
    }),
    __param(0, (0, common_1.Param)('taskNumber')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "developTask", null);
exports.TasksController = TasksController = __decorate([
    (0, swagger_1.ApiTags)('Tasks'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('projects/:projectId/tasks'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, project_role_guard_1.ProjectRoleGuard),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map