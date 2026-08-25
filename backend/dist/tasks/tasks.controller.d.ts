import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
export declare class TasksController {
    private tasksService;
    constructor(tasksService: TasksService);
    create(projectId: string, createTaskDto: CreateTaskDto, req: any): Promise<import("./entities/task.entity").Task>;
    findAll(projectId: string, req: any): Promise<import("./entities/task.entity").Task[]>;
    findMyTasks(projectId: string, req: any): Promise<import("./entities/task.entity").Task[]>;
    filterTasks(projectId: string, filters: FilterTasksDto, req: any): Promise<import("./entities/task.entity").Task[]>;
    findOne(taskNumber: string, projectId: string, req: any): Promise<import("./entities/task.entity").Task>;
    update(taskNumber: string, projectId: string, updateTaskDto: UpdateTaskDto, req: any): Promise<import("./entities/task.entity").Task>;
    remove(taskNumber: string, projectId: string, req: any): Promise<{
        message: string;
    }>;
    moveTask(taskNumber: string, projectId: string, moveTaskDto: MoveTaskDto, req: any): Promise<import("./entities/task.entity").Task>;
    findSubtasks(taskNumber: string, projectId: string, req: any): Promise<import("./entities/subtask.entity").Subtask[]>;
    updateSubtask(taskNumber: string, subtaskId: string, projectId: string, updateSubtaskDto: UpdateSubtaskDto, req: any): Promise<import("./entities/subtask.entity").Subtask>;
    removeSubtask(taskNumber: string, subtaskId: string, projectId: string, req: any): Promise<{
        message: string;
    }>;
    generateSubtasks(taskNumber: string, projectId: string, req: any): Promise<import("./entities/subtask.entity").Subtask[]>;
    developTask(taskNumber: string, projectId: string, req: any): Promise<import("./entities/task.entity").Task>;
}
