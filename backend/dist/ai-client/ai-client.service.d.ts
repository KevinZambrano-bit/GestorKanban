import { OnModuleInit } from '@nestjs/common';
export declare class AiClientService implements OnModuleInit {
    private readonly logger;
    private client;
    constructor();
    onModuleInit(): Promise<void>;
    generateSubtasks(task: string): Promise<string[]>;
}
