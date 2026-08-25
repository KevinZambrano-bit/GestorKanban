export declare class GeminiService {
    private readonly logger;
    private readonly ai;
    constructor();
    generateSubtasks(task: string): Promise<{
        subtasks: string[];
    }>;
    private fallbackSubtasks;
}
