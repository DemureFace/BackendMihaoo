import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from 'common/common';
import { UsersService } from './users.service';

// Exposes only id + email, and only to admins — this is the one place a
// slice of the real user table crosses a service boundary, so it's kept
// as narrow as the callers (analytics-service's team-member picker) need.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  search(@Query('search') search?: string) {
    return this.usersService.search(search);
  }
}
