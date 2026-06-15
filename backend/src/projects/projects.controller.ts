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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../auth/guards/project-role.guard';
import { RequireProjectRole } from '../auth/decorators/project-role.decorator';
import { ProjectRole } from './entities/project-member.entity';
import { GlobalRoleGuard } from '../auth/guards/global-role.guard';
import { RequireGlobalRole } from '../auth/decorators/global-role.decorator';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo proyecto' })
  create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get('admin/all')
  @UseGuards(GlobalRoleGuard)
  @RequireGlobalRole('admin')
  @ApiOperation({
    summary: 'Ver todos los proyectos de la plataforma (solo ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los proyectos con creador',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos de administrador',
  })
  findAllProjects() {
    return this.projectsService.findAllProjects();
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis proyectos' })
  findMyProjects(@Req() req) {
    return this.projectsService.findMyProjects(req.user.id);
  }

  @Get(':id')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Ver proyecto (member, leader)' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.projectsService.findOne(+id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Editar proyecto (solo LEADER)' })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() req,
  ) {
    return this.projectsService.update(+id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Eliminar proyecto (solo LEADER)' })
  remove(@Param('id') id: string, @Req() req) {
    return this.projectsService.remove(+id, req.user.id);
  }

  @Post(':id/members')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Invitar miembro (solo LEADER)' })
  inviteMember(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Req() req,
  ) {
    return this.projectsService.inviteMember(+id, inviteMemberDto, req.user.id);
  }

  @Get(':id/members')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.MEMBER, ProjectRole.LEADER)
  @ApiOperation({ summary: 'Obtener miembros del proyecto (member, leader)' })
  getProjectMembers(@Param('id') id: string, @Req() req) {
    return this.projectsService.getProjectMembers(+id, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Eliminar miembro del proyecto (solo LEADER)' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req,
  ) {
    return this.projectsService.removeMember(+id, +memberId, req.user.id);
  }

  @Patch(':id/wip')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Configurar límite WIP (solo LEADER)' })
  updateWip(
    @Param('id') id: string,
    @Body('wipLimit') wipLimit: number,
    @Req() req,
  ) {
    return this.projectsService.updateWipLimit(+id, wipLimit, req.user.id);
  }
}
