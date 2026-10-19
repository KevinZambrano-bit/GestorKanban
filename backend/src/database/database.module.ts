import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // synchronize le da a TypeORM permiso para ALTERAR el esquema real a
        // partir del código de las entidades en cada arranque: si una entidad
        // cambia, se toca la tabla y se pueden perder datos sin avisar. Por eso
        // solo se activa fuera de produccion, y se puede forzar con la variable
        // DB_SYNCHRONIZE para levantar un entorno limpio.
        const synchronize =
          config.get<string>('DB_SYNCHRONIZE') ??
          (config.get<string>('NODE_ENV') === 'production' ? 'false' : 'true');

        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASS'),
          database: config.get<string>('DB_NAME'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: synchronize === 'true',
          logging: config.get<string>('DB_LOGGING') === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
