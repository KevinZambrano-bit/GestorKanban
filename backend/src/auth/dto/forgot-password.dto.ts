import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'luis@gmail.com' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email: string;
}
