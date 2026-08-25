import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
export declare class GlobalRoleGuard implements CanActivate {
    private reflector;
    private userRepository;
    constructor(reflector: Reflector, userRepository: Repository<User>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
