import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from 'common/common';
import type { JwtPayload } from 'common/common';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';
import { TournamentService } from './tournament.service';

@UseGuards(JwtAuthGuard)
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  findAll() {
    return this.tournamentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournamentService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTournamentDto, @CurrentUser() user: JwtPayload) {
    return this.tournamentService.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tournamentService.update(
      id,
      dto,
      user.sub,
      user.roles.includes('admin'),
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tournamentService.remove(
      id,
      user.sub,
      user.roles.includes('admin'),
    );
  }
}
