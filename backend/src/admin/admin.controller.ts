import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalRoleGuard } from '../auth/guards/global-role.guard';
import { RequireGlobalRole } from '../auth/decorators/global-role.decorator';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, GlobalRoleGuard)
@RequireGlobalRole('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // GET /api/admin/stats
  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas globales de la plataforma (solo ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Totales de usuarios, proyectos y tareas (con desglose por estado)',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos de administrador',
  })
  getStats() {
    return this.adminService.getStats();
  }
}
