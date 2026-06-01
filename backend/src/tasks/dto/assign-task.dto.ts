import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTaskDto {
  @ApiProperty({ example: 2, description: 'ID del miembro del proyecto al que se asigna la tarea' })
  @IsNumber()
  assigneeId: number;
}