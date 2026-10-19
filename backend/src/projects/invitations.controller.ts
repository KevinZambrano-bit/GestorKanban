import {
  Controller,
  Get,
  Post,
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
import { InvitationsService } from './invitations.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../auth/guards/project-role.guard';
import { RequireProjectRole } from '../auth/decorators/project-role.decorator';
import { ProjectRole } from './entities/project-member.entity';

@ApiTags('Invitations')
@Controller()
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Post('projects/:id/invitations')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({
    summary: 'Invitar a un proyecto por email (solo LEADER)',
    description:
      'Siempre se envía una invitación con un token válido 7 días (tenga o no ' +
      'cuenta el invitado). La persona debe aceptarla para unirse al proyecto.',
  })
  @ApiResponse({ status: 201, description: 'Invitación enviada' })
  @ApiResponse({ status: 400, description: 'No se pudo enviar el correo' })
  invite(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Req() req,
  ) {
    return this.invitationsService.inviteMember(
      +id,
      inviteMemberDto.email,
      inviteMemberDto.role || ProjectRole.MEMBER,
      req.user.id,
    );
  }

  @Get('projects/:id/invitations')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Listar invitaciones pendientes (solo LEADER)' })
  findByProject(@Param('id') id: string) {
    return this.invitationsService.findByProject(+id);
  }

  @Delete('projects/:id/invitations/:invitationId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, ProjectRoleGuard)
  @RequireProjectRole(ProjectRole.LEADER)
  @ApiOperation({ summary: 'Revocar una invitación (solo LEADER)' })
  revoke(@Param('id') id: string, @Param('invitationId') invitationId: string) {
    return this.invitationsService.revoke(+id, +invitationId);
  }

  // ─── Endpoints públicos del enlace de invitación ───────────
  // El token viaja en la URL, así que no se exige JWT: hace falta que la
  // persona pueda ver a qué proyecto la invitaron antes de iniciar sesión.

  @Get('invitations/:token')
  @ApiOperation({
    summary: 'Ver los datos de una invitación (público)',
    description: 'Necesario para pintar la pantalla antes de iniciar sesión.',
  })
  findByToken(@Param('token') token: string) {
    return this.invitationsService.findByToken(token);
  }

  @Post('invitations/:token/accept')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Aceptar una invitación (requiere sesión)',
    description:
      'Solo el usuario invitado puede aceptarla. Es idempotente: aceptarla ' +
      'dos veces no duplica la membresía.',
  })
  @ApiResponse({ status: 400, description: 'Invitación usada o expirada' })
  @ApiResponse({
    status: 403,
    description: 'La invitación es para otro email',
  })
  accept(@Param('token') token: string, @Req() req) {
    return this.invitationsService.accept(token, req.user.id);
  }
}
