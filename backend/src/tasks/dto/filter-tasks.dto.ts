import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../entities/task.entity';

export class FilterTasksDto {
  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    example: 2,
    description: 'Filtrar por ID del responsable',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assigneeId?: number;
}
