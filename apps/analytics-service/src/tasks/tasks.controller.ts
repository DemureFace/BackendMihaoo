import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'common/common';
import { TasksService } from './tasks.service';
import { CreateTaskGroupDto } from './dto/create-task-group.dto';
import { UpdateTaskBrandDto } from './dto/update-task-brand.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { AddCommentDto } from './dto/add-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.listTaskBrands(query);
  }

  // Registered before ':id' — otherwise ParseIntPipe would try to parse
  // "duplicate" as this route's numeric id.
  @Get(':id/duplicate')
  getDuplicateTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.getDuplicateTemplate(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.getGroupDetail(id);
  }

  @Post()
  create(@Body() dto: CreateTaskGroupDto) {
    return this.tasksService.createTaskGroup(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskBrandDto,
  ) {
    return this.tasksService.updateTaskBrand(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.removeGroup(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCommentDto,
  ) {
    return this.tasksService.addComment(id, dto);
  }
}
