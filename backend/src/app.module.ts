import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { AiClientModule } from './ai-client/ai-client.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Límite por defecto para toda la API; los endpoints que disparan envíos o
    // intentos de acceso lo ajustan con @Throttle. Los valores vienen del
    // entorno para poder endurecerlos en producción sin tocar el código.
    //
    // Ojo: aquí deben declararse SOLO los limitadores que aplican a toda la
    // API. ThrottlerGuard evalúa *todos* los throttlers de esta lista en cada
    // petición, así que un limitador específico (p.ej. 10/hora para
    // forgot-password) puesto aquí estrangularía todas las rutas. Para un tope
    // puntual se usa @Throttle sobre la ruta, que sobrescribe a 'default'.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('THROTTLE_TTL_MS') ?? 60_000,
          limit: config.get<number>('THROTTLE_LIMIT') ?? 120,
        },
      ],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    TasksModule,
    AiClientModule,
    AdminModule,
    MailModule,
  ],
  providers: [
    // El guard se registra globalmente para que ningún endpoint nuevo quede
    // sin protección por olvido al declararlo.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
