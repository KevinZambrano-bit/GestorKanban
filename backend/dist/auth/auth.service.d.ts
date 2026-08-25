import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private userRepository;
    private jwtService;
    private rolesService;
    constructor(userRepository: Repository<User>, jwtService: JwtService, rolesService: RolesService);
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
    }>;
    validateGoogleUser(profile: {
        googleId: string;
        email: string;
        name: string;
        avatar: string;
    }): Promise<User>;
    generateToken(user: User): {
        access_token: string;
        user: Partial<User>;
    };
    getProfile(userId: number): Promise<User>;
}
