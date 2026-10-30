import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule],
  providers: [MailService],
  // Exportado para que projects, tasks y auth puedan enviar correos sin
  // volver a importar MailModule en cada uno.
  exports: [MailService],
})
export class MailModule {}
