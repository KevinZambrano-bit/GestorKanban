import { IsString, MinLength } from 'class-validator';

export class GenerateSubtasksDto {
  @IsString()
  @MinLength(5)
  task: string;
}
