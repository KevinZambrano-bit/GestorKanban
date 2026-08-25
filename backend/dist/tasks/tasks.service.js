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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_entity_1 = require("./entities/task.entity");
const subtask_entity_1 = require("./entities/subtask.entity");
const project_entity_1 = require("../projects/entities/project.entity");
const project_member_entity_1 = require("../projects/entities/project-member.entity");
const user_entity_1 = require("../users/entities/user.entity");
const ai_client_service_1 = require("../ai-client/ai-client.service");
let TasksService = class TasksService {
    constructor(taskRepository, subtaskRepository, projectRepository, memberRepository, userRepository, aiClient) {
        this.taskRepository = taskRepository;
        this.subtaskRepository = subtaskRepository;
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.aiClient = aiClient;
    }
    async create(projectId, createTaskDto, userId) {
        await this.checkMemberPermission(projectId, userId);
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('Proyecto no encontrado');
        const lastTask = await this.taskRepository.findOne({
            where: { project: { id: projectId } },
            order: { taskNumber: 'DESC' },
        });
        const nextTaskNumber = lastTask ? lastTask.taskNumber + 1 : 1;
        let assignee = null;
        if (createTaskDto.assigneeId) {
            const isMember = await this.memberRepository.findOne({
                where: {
                    project: { id: projectId },
                    user: { id: createTaskDto.assigneeId },
                },
            });
            if (!isMember) {
                throw new common_1.BadRequestException('Este usuario aun no es miembro del proyecto');
            }
            assignee = await this.userRepository.findOne({
                where: { id: createTaskDto.assigneeId },
            });
            if (!assignee) {
                throw new common_1.NotFoundException(`Usuario con ID ${createTaskDto.assigneeId} no encontrado`);
            }
        }
        const task = this.taskRepository.create({
            title: createTaskDto.title,
            description: createTaskDto.description || null,
            status: createTaskDto.status || task_entity_1.TaskStatus.PENDING,
            startDate: createTaskDto.startDate || null,
            endDate: createTaskDto.endDate || null,
            taskNumber: nextTaskNumber,
            project,
            assignee,
        });
        return this.taskRepository.save(task);
    }
    async findByProject(projectId, userId) {
        await this.checkViewerPermission(projectId, userId);
        return this.taskRepository.find({
            where: { project: { id: projectId } },
            relations: ['assignee', 'subtasks'],
            order: { createdAt: 'ASC' },
        });
    }
    async findMyTasks(projectId, userId) {
        await this.checkViewerPermission(projectId, userId);
        return this.taskRepository.find({
            where: {
                project: { id: projectId },
                assignee: { id: userId },
            },
            relations: ['assignee', 'subtasks'],
            order: { createdAt: 'ASC' },
        });
    }
    async findOne(taskNumber, projectId, userId) {
        const task = await this.taskRepository.findOne({
            where: { taskNumber, project: { id: projectId } },
            relations: ['project', 'assignee', 'subtasks'],
        });
        if (!task)
            throw new common_1.NotFoundException(`Tarea #${taskNumber} no encontrada en este proyecto`);
        await this.checkViewerPermission(task.project.id, userId);
        return task;
    }
    async update(taskNumber, projectId, updateTaskDto, userId) {
        const task = await this.findOne(taskNumber, projectId, userId);
        await this.checkMemberPermission(task.project.id, userId);
        if (updateTaskDto.assigneeId) {
            const isMember = await this.memberRepository.findOne({
                where: {
                    project: { id: projectId },
                    user: { id: updateTaskDto.assigneeId },
                },
            });
            if (!isMember) {
                throw new common_1.BadRequestException('Este usuario aun no es miembro del proyecto');
            }
            const assignee = await this.userRepository.findOne({
                where: { id: updateTaskDto.assigneeId },
            });
            task.assignee = assignee;
        }
        if (updateTaskDto.title)
            task.title = updateTaskDto.title;
        if (updateTaskDto.description)
            task.description = updateTaskDto.description;
        if (updateTaskDto.startDate)
            task.startDate = updateTaskDto.startDate;
        if (updateTaskDto.endDate)
            task.endDate = updateTaskDto.endDate;
        return this.taskRepository.save(task);
    }
    async moveTask(taskNumber, projectId, moveTaskDto, userId) {
        const task = await this.findOne(taskNumber, projectId, userId);
        await this.checkMemberPermission(task.project.id, userId);
        if (moveTaskDto.status === task_entity_1.TaskStatus.DONE &&
            (!task.assignee || task.assignee.id !== userId)) {
            throw new common_1.ForbiddenException('Solo el miembro asignado puede marcar esta tarea como completada');
        }
        if (moveTaskDto.status === task_entity_1.TaskStatus.IN_PROGRESS) {
            const project = await this.projectRepository.findOne({
                where: { id: projectId },
            });
            const inProgressCount = await this.taskRepository.count({
                where: {
                    project: { id: projectId },
                    status: task_entity_1.TaskStatus.IN_PROGRESS,
                },
            });
            if (inProgressCount >= project.wipLimit) {
                throw new common_1.BadRequestException(`Límite WIP alcanzado. Máximo ${project.wipLimit} tareas en progreso permitidas`);
            }
        }
        task.status = moveTaskDto.status;
        return this.taskRepository.save(task);
    }
    async remove(taskNumber, projectId, userId) {
        const task = await this.findOne(taskNumber, projectId, userId);
        await this.checkLeaderPermission(task.project.id, userId);
        await this.taskRepository.remove(task);
        return { message: `Tarea #${taskNumber} eliminada correctamente` };
    }
    async developTask(taskNumber, projectId, userId) {
        const task = await this.findOne(taskNumber, projectId, userId);
        if (!task.assignee || task.assignee.id !== userId) {
            throw new common_1.ForbiddenException('Solo el miembro asignado puede marcar esta tarea como desarrollada');
        }
        if (task.status === task_entity_1.TaskStatus.DONE) {
            throw new common_1.BadRequestException('La tarea ya está completada');
        }
        task.status = task_entity_1.TaskStatus.DONE;
        return this.taskRepository.save(task);
    }
    async filterTasks(projectId, userId, filters) {
        await this.checkViewerPermission(projectId, userId);
        const query = this.taskRepository
            .createQueryBuilder('task')
            .leftJoinAndSelect('task.assignee', 'assignee')
            .leftJoinAndSelect('task.subtasks', 'subtasks')
            .where('task.projectId = :projectId', { projectId });
        if (filters.status) {
            query.andWhere('task.status = :status', { status: filters.status });
        }
        if (filters.assigneeId) {
            query.andWhere('assignee.id = :assigneeId', {
                assigneeId: filters.assigneeId,
            });
        }
        return query.getMany();
    }
    async findSubtasks(taskNumber, projectId, userId) {
        const task = await this.findOne(taskNumber, projectId, userId);
        return this.subtaskRepository.find({
            where: { task: { id: task.id } },
            order: { id: 'ASC' },
        });
    }
    async updateSubtask(taskNumber, projectId, subtaskId, updateSubtaskDto, userId) {
        const subtask = await this.findTaskSubtask(taskNumber, projectId, subtaskId, userId);
        if (updateSubtaskDto.title !== undefined)
            subtask.title = updateSubtaskDto.title;
        if (updateSubtaskDto.completed !== undefined)
            subtask.completed = updateSubtaskDto.completed;
        return this.subtaskRepository.save(subtask);
    }
    async removeSubtask(taskNumber, projectId, subtaskId, userId) {
        const subtask = await this.findTaskSubtask(taskNumber, projectId, subtaskId, userId);
        await this.subtaskRepository.remove(subtask);
        return { message: 'Subtarea eliminada correctamente' };
    }
    async findTaskSubtask(taskNumber, projectId, subtaskId, userId) {
        const task = await this.findOne(taskNumber, projectId, userId);
        await this.checkMemberPermission(task.project.id, userId);
        const subtask = await this.subtaskRepository.findOne({
            where: { id: subtaskId, task: { id: task.id } },
        });
        if (!subtask)
            throw new common_1.NotFoundException(`Subtarea con ID ${subtaskId} no encontrada en la tarea #${taskNumber}`);
        return subtask;
    }
    async generateSubtasks(taskNumber, projectId, userId) {
        const task = await this.findOne(taskNumber, projectId, userId);
        await this.checkMemberPermission(task.project.id, userId);
        const subtaskTitles = await this.aiClient.generateSubtasks(task.title);
        const existing = await this.subtaskRepository.find({
            where: { task: { id: task.id } },
        });
        if (existing.length > 0) {
            await this.subtaskRepository.remove(existing);
        }
        const subtasks = subtaskTitles.map((title) => this.subtaskRepository.create({ title, task }));
        return this.subtaskRepository.save(subtasks);
    }
    async checkViewerPermission(projectId, userId) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('Proyecto no encontrado');
        if (project.isPublic)
            return;
        const membership = await this.memberRepository.findOne({
            where: { project: { id: projectId }, user: { id: userId } },
        });
        if (!membership)
            throw new common_1.ForbiddenException('Este proyecto es privado. Solo sus miembros pueden ver sus tareas');
    }
    async checkMemberPermission(projectId, userId) {
        const membership = await this.memberRepository.findOne({
            where: { project: { id: projectId }, user: { id: userId } },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('Necesitas ser miembro del proyecto para realizar esta acción');
        }
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
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(1, (0, typeorm_1.InjectRepository)(subtask_entity_1.Subtask)),
    __param(2, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(3, (0, typeorm_1.InjectRepository)(project_member_entity_1.ProjectMember)),
    __param(4, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        ai_client_service_1.AiClientService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map