import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from 'common/common';
import type { JwtPayload } from 'common/common';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';

@UseGuards(JwtAuthGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get()
  findAll() {
    return this.checklistsService.findAll();
  }

  // Registered before `completions/:id` — otherwise ParseIntPipe would try
  // (and fail) to parse the literal "all" as that route's numeric id.
  @Get('completions/all')
  findAllCompletions() {
    return this.checklistsService.findAllCompletions();
  }

  @Get('completions/:id')
  findCompletion(@Param('id', ParseIntPipe) id: number) {
    return this.checklistsService.findCompletion(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.checklistsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateChecklistDto) {
    return this.checklistsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.checklistsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.checklistsService.remove(id);
  }

  @Post(':id/completions')
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitChecklistDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.checklistsService.submit(id, dto, user.sub);
  }
}
