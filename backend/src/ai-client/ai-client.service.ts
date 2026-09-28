import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

// Generar subtareas tarda 4-20 s contra la API de Gemini. El margen es
// holgado a propósito: sin él, una llamada colgada dejaría al usuario
// esperando indefinidamente sin ver nunca un mensaje de error.
const AI_REQUEST_TIMEOUT_MS = 30_000;

@Injectable()
export class AiClientService implements OnModuleInit {
  private readonly logger = new Logger(AiClientService.name);
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
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
    } catch {
      this.logger.warn(
        'Microservicio IA no disponible, reintentará en cada solicitud',
      );
    }
  }

  async generateSubtasks(task: string): Promise<string[]> {
    this.logger.log(
      `Enviando tarea al microservicio IA: "${task.substring(0, 50)}..."`,
    );

    let result: { success: boolean; subtasks: string[] } | undefined;
    try {
      result = await firstValueFrom(
        this.client
          .send<{ success: boolean; subtasks: string[] }>('generate_subtasks', {
            task,
          })
          .pipe(timeout(AI_REQUEST_TIMEOUT_MS)),
      );
    } catch (error) {
      this.logger.error(
        `Fallo al contactar con el microservicio IA: ${(error as Error).message}`,
      );
      throw new Error('El microservicio IA no respondió a tiempo');
    }

    if (!result?.success || !Array.isArray(result?.subtasks)) {
      throw new Error('Respuesta inválida del microservicio IA');
    }

    return result.subtasks;
  }
}
