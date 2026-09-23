import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'common/common';
import { TeamMembersService } from './team-members.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { ImportTeamMemberDto } from './dto/import-team-member.dto';

@UseGuards(JwtAuthGuard)
@Controller('team-members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Get()
  findAll(@Query('active') active?: string) {
    return this.teamMembersService.findAll(active === 'true');
  }

  // Registered before ':id' — otherwise ParseIntPipe would try (and fail)
  // to parse the literal "auth-search" as this route's numeric id.
  @Get('auth-search')
  searchAuthUsers(
    @Query('search') search: string | undefined,
    @Headers('authorization') authorization: string,
  ) {
    return this.teamMembersService.searchAuthUsers(search, authorization);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamMembersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTeamMemberDto) {
    return this.teamMembersService.create(dto);
  }

  @Post('import')
  importFromAuth(@Body() dto: ImportTeamMemberDto) {
    return this.teamMembersService.importFromAuth(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teamMembersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teamMembersService.remove(id);
  }
}
