import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

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
      this.logger.warn('Microservicio IA no disponible, reintentará en cada solicitud');
    }
  }

  async generateSubtasks(task: string): Promise<string[]> {
    this.logger.log(`Enviando tarea al microservicio IA: "${task.substring(0, 50)}..."`);

    const result = await this.client
      .send<{ success: boolean; subtasks: string[] }>('generate_subtasks', { task })
      .toPromise();

    if (!result?.success || !Array.isArray(result?.subtasks)) {
      throw new Error('Respuesta inválida del microservicio IA');
    }

    return result.subtasks;
  }
}
