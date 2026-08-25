import { GeminiService } from './gemini/gemini.service';
import { GenerateSubtasksDto } from './dto/generate-subtasks.dto';
export declare class AiController {
    private readonly geminiService;
    private readonly logger;
    constructor(geminiService: GeminiService);
    generateSubtasks(data: GenerateSubtasksDto): Promise<{
        success: boolean;
        subtasks: string[];
    }>;
}
