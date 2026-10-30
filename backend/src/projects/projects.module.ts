import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectInvitation } from './entities/project-invitation.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { MailModule } from '../mail/mail.module';
import { EmailVerifierService } from '../common/email-verifier.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      ProjectInvitation,
      User,
      Task,
    ]),
    MailModule,
  ],
  controllers: [ProjectsController, InvitationsController],
  providers: [ProjectsService, InvitationsService, EmailVerifierService],
  exports: [ProjectsService, InvitationsService, TypeOrmModule],
})
export class ProjectsModule {}
