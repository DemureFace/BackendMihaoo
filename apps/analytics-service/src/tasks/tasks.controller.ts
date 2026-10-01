import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from 'common/common';
import type { JwtPayload } from 'common/common';
import { TasksService } from './tasks.service';
import { CreateTaskGroupDto } from './dto/create-task-group.dto';
import { UpdateTaskBrandDto } from './dto/update-task-brand.dto';
import { UpdateTaskGroupDto } from './dto/update-task-group.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { AddProgressEntryDto } from './dto/add-progress-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.listTaskBrands(query);
  }

  // Registered before ':id' — otherwise ParseIntPipe would try to parse
  // "export" (and "duplicate", below) as this route's numeric id. Ignores
  // skip/take: the export is always the full filtered set, not one page.
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tasks.csv"')
  exportCsv(@Query() query: QueryTasksDto) {
    return this.tasksService.exportTasksCsv(query);
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

  // The "explicit group action" — edits title/description/taskType/
  // requester/jiraKey/dueDate, which live on the shared TaskGroup rather
  // than this row. Deliberately a separate route from PATCH /tasks/:id
  // above, which never touches these fields, so editing one row can never
  // silently change its siblings and vice versa.
  @Patch(':id/group')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskGroupDto,
  ) {
    return this.tasksService.updateTaskGroup(id, dto);
  }

  // Soft-deletes just this one branded row — siblings in the same group
  // are untouched. See TasksService.softDeleteTaskBrand.
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.softDeleteTaskBrand(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.restoreTaskBrand(id);
  }

  // :id is a TaskBrand id here too, same as every other route in this
  // controller — previously this treated it as a TaskGroup id instead,
  // which silently targeted the wrong (or a nonexistent) group as soon as
  // any group had more than one brand.
  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.addComment(id, dto, user);
  }

  // Appends one journal entry; there's no corresponding PATCH/DELETE — see
  // TasksService.addProgressEntry.
  @Post(':id/progress')
  addProgressEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProgressEntryDto,
  ) {
    return this.tasksService.addProgressEntry(id, dto);
  }
}
