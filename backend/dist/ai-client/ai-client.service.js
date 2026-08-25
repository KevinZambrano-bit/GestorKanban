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
var AiClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiClientService = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
let AiClientService = AiClientService_1 = class AiClientService {
    constructor() {
        this.logger = new common_1.Logger(AiClientService_1.name);
        this.client = microservices_1.ClientProxyFactory.create({
            transport: microservices_1.Transport.TCP,
            options: {
                host: 'localhost',
                port: 3001,
            },
        });
    }
    async onModuleInit() {
        try {
            await this.client.connect();
            this.logger.log('Conectado al microservicio IA (TCP localhost:3001)');
        }
        catch {
            this.logger.warn('Microservicio IA no disponible, reintentará en cada solicitud');
        }
    }
    async generateSubtasks(task) {
        this.logger.log(`Enviando tarea al microservicio IA: "${task.substring(0, 50)}..."`);
        const result = await this.client
            .send('generate_subtasks', { task })
            .toPromise();
        if (!result?.success || !Array.isArray(result?.subtasks)) {
            throw new Error('Respuesta inválida del microservicio IA');
        }
        return result.subtasks;
    }
};
exports.AiClientService = AiClientService;
exports.AiClientService = AiClientService = AiClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiClientService);
//# sourceMappingURL=ai-client.service.js.map