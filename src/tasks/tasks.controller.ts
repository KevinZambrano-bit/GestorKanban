import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
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

  // Crear tarea — member y leader
  @Post()
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Crear tarea (member, leader)' })
  create(@Param('projectId') projectId: string, @Body() createTaskDto: CreateTaskDto, @Req() req) {
    return this.tasksService.create(+projectId, createTaskDto, req.user.id);
  }

  // Listar tareas — member, leader
  @Get()
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Listar tareas del proyecto' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  findAll(
    @Param('projectId') projectId: string,
    @Req() req,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
  ) {
    if (status || assigneeId) {
      return this.tasksService.filterTasks(+projectId, req.user.id, {
        status,
        assigneeId: assigneeId ? +assigneeId : undefined,
      });
    }
    return this.tasksService.findByProject(+projectId, req.user.id);
  }

  // Ver tarea — member, leader
  @Get(':id')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Ver tarea por ID' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.tasksService.findOne(+id, req.user.id);
  }

  // Editar tarea — member 
  @Patch(':id')
  @RequireProjectRole(ProjectRole.MEMBER)
  @ApiOperation({ summary: 'Editar tarea (member)' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Req() req) {
    return this.tasksService.update(+id, updateTaskDto, req.user.id);
  }

  // Mover tarea — member y leader
  @Patch(':id/move')
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Mover tarea entre columnas (valida WIP)' })
  moveTask(@Param('id') id: string, @Body() moveTaskDto: MoveTaskDto, @Req() req) {
    return this.tasksService.moveTask(+id, moveTaskDto, req.user.id);
  }

  // Asignar tarea — solo leader
  @Patch(':id/assign')
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Asignar tarea (solo LEADER)' })
  assignTask(@Param('id') id: string, @Body('assigneeId') assigneeId: number, @Req() req) {
    return this.tasksService.assignTask(+id, assigneeId, req.user.id);
  }

  // Eliminar tarea — solo leader
  @Delete(':id')
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Eliminar tarea (solo LEADER)' })
  remove(@Param('id') id: string, @Req() req) {
    return this.tasksService.remove(+id, req.user.id);
  }
}