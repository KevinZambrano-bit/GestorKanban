import { TaskStatus } from '../entities/task.entity';
export declare class FilterTasksDto {
    status?: TaskStatus;
    assigneeId?: number;
}
