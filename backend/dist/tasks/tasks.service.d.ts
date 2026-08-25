import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { AiClientService } from '../ai-client/ai-client.service';
export declare class TasksService {
    private taskRepository;
    private subtaskRepository;
    private projectRepository;
    private memberRepository;
    private userRepository;
    private aiClient;
    constructor(taskRepository: Repository<Task>, subtaskRepository: Repository<Subtask>, projectRepository: Repository<Project>, memberRepository: Repository<ProjectMember>, userRepository: Repository<User>, aiClient: AiClientService);
    create(projectId: number, createTaskDto: CreateTaskDto, userId: number): Promise<Task>;
    findByProject(projectId: number, userId: number): Promise<Task[]>;
    findMyTasks(projectId: number, userId: number): Promise<Task[]>;
    findOne(taskNumber: number, projectId: number, userId: number): Promise<Task>;
    update(taskNumber: number, projectId: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task>;
    moveTask(taskNumber: number, projectId: number, moveTaskDto: MoveTaskDto, userId: number): Promise<Task>;
    remove(taskNumber: number, projectId: number, userId: number): Promise<{
        message: string;
    }>;
    developTask(taskNumber: number, projectId: number, userId: number): Promise<Task>;
    filterTasks(projectId: number, userId: number, filters: {
        status?: TaskStatus;
        assigneeId?: number;
    }): Promise<Task[]>;
    findSubtasks(taskNumber: number, projectId: number, userId: number): Promise<Subtask[]>;
    updateSubtask(taskNumber: number, projectId: number, subtaskId: number, updateSubtaskDto: UpdateSubtaskDto, userId: number): Promise<Subtask>;
    removeSubtask(taskNumber: number, projectId: number, subtaskId: number, userId: number): Promise<{
        message: string;
    }>;
    private findTaskSubtask;
    generateSubtasks(taskNumber: number, projectId: number, userId: number): Promise<Subtask[]>;
    private checkViewerPermission;
    private checkMemberPermission;
    private checkLeaderPermission;
}
