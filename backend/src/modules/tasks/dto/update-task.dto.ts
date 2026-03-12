import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({
    description: 'Price or cost of the task',
    example: 150.50,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Area in square feet',
    example: 250.75,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  feet2?: number;

  @ApiProperty({
    description: 'Stop recurrence for this task',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  stopRecurrence?: boolean;
}
