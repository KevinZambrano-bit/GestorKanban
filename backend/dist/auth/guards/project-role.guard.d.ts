import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
export declare class ProjectRoleGuard implements CanActivate {
    private reflector;
    private memberRepository;
    private projectRepository;
    constructor(reflector: Reflector, memberRepository: Repository<ProjectMember>, projectRepository: Repository<Project>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
