import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubtaskDto {
  @ApiPropertyOptional({ example: 'Diseñar el modelo de datos' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Marcar o desmarcar como completada',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
