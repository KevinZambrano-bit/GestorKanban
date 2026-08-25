"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalRoleGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const global_role_decorator_1 = require("../decorators/global-role.decorator");
let GlobalRoleGuard = class GlobalRoleGuard {
    constructor(reflector, userRepository) {
        this.reflector = reflector;
        this.userRepository = userRepository;
    }
    async canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(global_role_decorator_1.GLOBAL_ROLE_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role'],
        });
        if (!user)
            throw new common_1.ForbiddenException('Usuario no encontrado');
        const hasRole = requiredRoles.includes(user.role?.name);
        if (!hasRole) {
            throw new common_1.ForbiddenException(`Necesitas rol ${requiredRoles.join(' o ')} para realizar esta acción`);
        }
        return true;
    }
};
exports.GlobalRoleGuard = GlobalRoleGuard;
exports.GlobalRoleGuard = GlobalRoleGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [core_1.Reflector,
        typeorm_2.Repository])
], GlobalRoleGuard);
//# sourceMappingURL=global-role.guard.js.map