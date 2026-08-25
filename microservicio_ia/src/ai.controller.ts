import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { GeminiService } from './gemini/gemini.service';
import { GenerateSubtasksDto } from './dto/generate-subtasks.dto';

@Controller()
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly geminiService: GeminiService) {}

  @MessagePattern('generate_subtasks')
  async generateSubtasks(data: GenerateSubtasksDto) {
    this.logger.log(`Solicitud recibida: "${data.task.substring(0, 50)}..."`);

    try {
      const result = await this.geminiService.generateSubtasks(data.task);

      return {
        success: true,
        subtasks: result.subtasks,
      };
    } catch (error) {
      this.logger.error(
        `Error en generate_subtasks: ${(error as Error).message}`,
      );
      throw new RpcException((error as Error).message);
    }
  }
}
