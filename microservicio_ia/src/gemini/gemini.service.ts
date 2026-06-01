import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { buildSubtaskPrompt } from '../prompts/subtask.prompt';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY no está definida');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async generateSubtasks(task: string): Promise<{ subtasks: string[] }> {
    const prompt = buildSubtaskPrompt(task);
    this.logger.log(`Enviando prompt a Gemini: "${task.substring(0, 50)}..."`);

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-lite',
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
      const parsed = JSON.parse(jsonStr) as { subtasks?: string[] };

      if (
        !parsed.subtasks ||
        !Array.isArray(parsed.subtasks) ||
        parsed.subtasks.length === 0
      ) {
        throw new Error('El formato JSON no contiene subtasks válidas');
      }

      return { subtasks: parsed.subtasks };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Error al generar subtareas: ${msg}`);

      if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        this.logger.warn('Cuota excedida — usando fallback local');
        return this.fallbackSubtasks(task);
      }

      throw error;
    }
  }

  private fallbackSubtasks(task: string): { subtasks: string[] } {
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
}
