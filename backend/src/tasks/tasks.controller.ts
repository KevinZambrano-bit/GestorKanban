import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../auth/guards/project-role.guard';
import { RequireProjectRole } from '../auth/decorators/project-role.decorator';
import { ProjectRole } from '../projects/entities/project-member.entity';
import { TaskStatus } from './entities/task.entity';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  // POST /api/projects/:projectId/tasks
  @Post()
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Crear tarea (member, leader)' })
  create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req,
  ) {
    return this.tasksService.create(+projectId, createTaskDto, req.user.id);
  }

  // GET /api/projects/:projectId/tasks
  @Get()
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Listar tareas del proyecto' })
  findAll(@Param('projectId') projectId: string, @Req() req) {
    return this.tasksService.findByProject(+projectId, req.user.id);
  }

  // GET /api/projects/:projectId/tasks/my-tasks
  @Get('my-tasks')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({
    summary: 'Ver tareas asignadas al usuario autenticado en el proyecto',
  })
  findMyTasks(@Param('projectId') projectId: string, @Req() req) {
    return this.tasksService.findMyTasks(+projectId, req.user.id);
  }

  // GET /api/projects/:projectId/tasks/filter?status=&assigneeId=
  @Get('filter')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Filtrar tareas por estado y/o responsable' })
  filterTasks(
    @Param('projectId') projectId: string,
    @Query() filters: FilterTasksDto,
    @Req() req,
  ) {
    return this.tasksService.filterTasks(+projectId, req.user.id, filters);
  }

  // GET /api/projects/:projectId/tasks/:taskNumber
  @Get(':taskNumber')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Ver tarea por número dentro del proyecto' })
  findOne(
    @Param('taskNumber') taskNumber: string,
    @Param('projectId') projectId: string,
    @Req() req,
  ) {
    return this.tasksService.findOne(+taskNumber, +projectId, req.user.id);
  }

  // PATCH /api/projects/:projectId/tasks/:taskNumber
  @Patch(':taskNumber')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Editar tarea (member)' })
  update(
    @Param('taskNumber') taskNumber: string,
    @Param('projectId') projectId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    return this.tasksService.update(
      +taskNumber,
      +projectId,
      updateTaskDto,
      req.user.id,
    );
  }

  // DELETE /api/projects/:projectId/tasks/:taskNumber
  @Delete(':taskNumber')
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Eliminar tarea (solo LEADER)' })
  remove(
    @Param('taskNumber') taskNumber: string,
    @Param('projectId') projectId: string,
    @Req() req,
  ) {
    return this.tasksService.remove(+taskNumber, +projectId, req.user.id);
  }

  // PATCH /api/projects/:projectId/tasks/:taskNumber/move
  @Patch(':taskNumber/move')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Mover tarea entre columnas (valida WIP)' })
  moveTask(
    @Param('taskNumber') taskNumber: string,
    @Param('projectId') projectId: string,
    @Body() moveTaskDto: MoveTaskDto,
    @Req() req,
  ) {
    return this.tasksService.moveTask(
      +taskNumber,
      +projectId,
      moveTaskDto,
      req.user.id,
    );
  }

  // GET /api/projects/:projectId/tasks/:taskNumber/subtasks
  @Get(':taskNumber/subtasks')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Obtener subtareas de una tarea (member, leader)' })
  findSubtasks(
    @Param('taskNumber') taskNumber: string,
    @Param('projectId') projectId: string,
    @Req() req,
  ) {
    return this.tasksService.findSubtasks(+taskNumber, +projectId, req.user.id);
  }

  // PATCH /api/projects/:projectId/tasks/:taskNumber/subtasks/:subtaskId
  @Patch(':taskNumber/subtasks/:subtaskId')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({
    summary:
      'Actualizar subtarea: marcar completada o editar título (member, leader)',
  })
  @ApiResponse({ status: 404, description: 'Subtarea no encontrada' })
  updateSubtask(
    @Param('taskNumber') taskNumber: string,
    @Param('subtaskId') subtaskId: string,
    @Param('projectId') projectId: string,
    @Body() updateSubtaskDto: UpdateSubtaskDto,
    @Req() req,
  ) {
    return this.tasksService.updateSubtask(
      +taskNumber,
      +projectId,
      +subtaskId,
      updateSubtaskDto,
      req.user.id,
    );
  }

  // DELETE /api/projects/:projectId/tasks/:taskNumber/subtasks/:subtaskId
  @Delete(':taskNumber/subtasks/:subtaskId')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Eliminar subtarea (member, leader)' })
  @ApiResponse({ status: 404, description: 'Subtarea no encontrada' })
  removeSubtask(
    @Param('taskNumber') taskNumber: string,
    @Param('subtaskId') subtaskId: string,
    @Param('projectId') projectId: string,
    @Req() req,
  ) {
    return this.tasksService.removeSubtask(
      +taskNumber,
      +projectId,
      +subtaskId,
      req.user.id,
    );
  }

  // POST /api/projects/:projectId/tasks/:taskNumber/generate-subtasks
  @Post(':taskNumber/generate-subtasks')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Generar subtareas con IA (member, leader)' })
  generateSubtasks(
    @Param('taskNumber') taskNumber: string,
    @Param('projectId') projectId: string,
    @Req() req,
  ) {
    return this.tasksService.generateSubtasks(
      +taskNumber,
      +projectId,
      req.user.id,
    );
  }

  // PATCH /api/projects/:projectId/tasks/:taskNumber/develop
  @Patch(':taskNumber/develop')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({
    summary: 'Marcar tarea como desarrollada (solo el miembro asignado)',
  })
  developTask(
    @Param('taskNumber') taskNumber: string,
    @Param('projectId') projectId: string,
    @Req() req,
  ) {
    return this.tasksService.developTask(+taskNumber, +projectId, req.user.id);
  }
}
