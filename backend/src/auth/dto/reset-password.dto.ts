import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo' })
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8, example: 'NuevaClave123' })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  password: string;
}
