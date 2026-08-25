import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWipDto {
  @ApiProperty({
    example: 5,
    description: 'Límite de tareas en progreso (in_progress)',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  wipLimit: number;
}
