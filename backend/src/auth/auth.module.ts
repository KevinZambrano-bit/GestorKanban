import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { RolesModule } from '../roles/roles.module';

const googleStrategyProvider = {
  provide: GoogleStrategy,
  useFactory: (config: ConfigService, authService: AuthService) => {
    if (!config.get<string>('GOOGLE_CLIENT_ID')) return null;
    return new GoogleStrategy(config, authService);
  },
  inject: [ConfigService, AuthService],
};

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User]),
    RolesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, googleStrategyProvider, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
