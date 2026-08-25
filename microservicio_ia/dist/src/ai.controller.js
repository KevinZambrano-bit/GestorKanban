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
var AiController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const gemini_service_1 = require("./gemini/gemini.service");
const generate_subtasks_dto_1 = require("./dto/generate-subtasks.dto");
let AiController = AiController_1 = class AiController {
    geminiService;
    logger = new common_1.Logger(AiController_1.name);
    constructor(geminiService) {
        this.geminiService = geminiService;
    }
    async generateSubtasks(data) {
        this.logger.log(`Solicitud recibida: "${data.task.substring(0, 50)}..."`);
        try {
            const result = await this.geminiService.generateSubtasks(data.task);
            return {
                success: true,
                subtasks: result.subtasks,
            };
        }
        catch (error) {
            this.logger.error(`Error en generate_subtasks: ${error.message}`);
            throw new microservices_1.RpcException(error.message);
        }
    }
};
exports.AiController = AiController;
__decorate([
    (0, microservices_1.MessagePattern)('generate_subtasks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_subtasks_dto_1.GenerateSubtasksDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateSubtasks", null);
exports.AiController = AiController = AiController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map