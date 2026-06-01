import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'GestorKanban' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Plataforma de gestión de tareas' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3, description: 'Límite de tareas en progreso' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  wipLimit?: number;

  @ApiPropertyOptional({ example: false, description: 'Proyecto público o privado' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}