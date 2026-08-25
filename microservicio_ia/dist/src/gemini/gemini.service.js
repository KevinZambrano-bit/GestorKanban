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
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const genai_1 = require("@google/genai");
const subtask_prompt_1 = require("../prompts/subtask.prompt");
let GeminiService = GeminiService_1 = class GeminiService {
    logger = new common_1.Logger(GeminiService_1.name);
    ai;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY no está definida');
        }
        this.ai = new genai_1.GoogleGenAI({ apiKey: apiKey || '' });
    }
    async generateSubtasks(task) {
        const prompt = (0, subtask_prompt_1.buildSubtaskPrompt)(task);
        this.logger.log(`Enviando prompt a Gemini: "${task.substring(0, 50)}..."`);
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
            });
            const text = response.text?.trim();
            if (!text) {
                throw new Error('Respuesta vacía de Gemini');
            }
            const jsonStr = text
                .replace(/```json\n?/gi, '')
                .replace(/```\n?/gi, '')
                .trim();
            const parsed = JSON.parse(jsonStr);
            if (!parsed.subtasks ||
                !Array.isArray(parsed.subtasks) ||
                parsed.subtasks.length === 0) {
                throw new Error('El formato JSON no contiene subtasks válidas');
            }
            return { subtasks: parsed.subtasks };
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Error al generar subtareas: ${msg}`);
            this.logger.warn('Usando fallback local');
            return this.fallbackSubtasks(task);
        }
    }
    fallbackSubtasks(task) {
        return {
            subtasks: [
                `Analizar requisitos de: ${task}`,
                'Diseñar la arquitectura de la solución',
                'Configurar el entorno de desarrollo',
                'Implementar la funcionalidad principal',
                'Escribir pruebas unitarias',
                'Realizar pruebas de integración',
                'Documentar el código y la API',
            ],
        };
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map