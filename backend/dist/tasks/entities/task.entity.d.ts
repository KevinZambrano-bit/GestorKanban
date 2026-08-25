import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Subtask } from './subtask.entity';
export declare enum TaskStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    DONE = "done"
}
export declare class Task {
    id: number;
    taskNumber: number;
    title: string;
    description: string;
    status: TaskStatus;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    project: Project;
    assignee: User;
    subtasks: Subtask[];
}
