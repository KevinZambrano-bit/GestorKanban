import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// DTO de autoservicio: solo campos seguros.
// No expone roleId a propósito, para que un usuario no pueda
// ascenderse a admin editando su propio perfil.
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Kevin Zambrano' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://foto.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;
}
