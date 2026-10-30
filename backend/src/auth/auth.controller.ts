import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { frontendUrl } from '../common/app-urls';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario con email y contraseña' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  // Endpoint público que dispara un envío real de correo. El mensaje es
  // siempre el mismo (no revela qué correos existen), pero sin este límite
  // cualquiera podría usarlo para agotar la cuota diaria de Gmail o bombardear
  // con correos a un tercero. 10 por hora e IP deja pasar un uso legítimo (quien
  // olvida la clave reintenta alguna vez) y corta el abuso automatizado.
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({
    summary: 'Solicitar enlace para restablecer la contraseña',
    description:
      'Responde siempre igual para no revelar qué correos tienen cuenta. ' +
      'Limitado a 10 solicitudes por hora e IP.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud procesada' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos, espera unos minutos',
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Establecer una nueva contraseña con el token' })
  @ApiResponse({ status: 201, description: 'Contraseña actualizada' })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, usado o expirado',
  })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('google')
  @ApiOperation({ summary: 'Iniciar login con Google OAuth2' })
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @ApiOperation({ summary: 'Callback de Google OAuth2' })
  @ApiResponse({
    status: 302,
    description:
      'Redirige al frontend con el token en la query (?token=...). Ruta de destino: FRONTEND_URL + /oauth/callback',
  })
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req, @Res() res) {
    const token = this.authService.generateToken(req.user);
    return res.redirect(
      `${frontendUrl(this.configService)}/oauth/callback?token=${token.access_token}`,
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    return this.authService.getProfile(req.user.id);
  }
}
