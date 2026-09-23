import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';

@Module({
  imports: [PassportModule, HttpModule],
  controllers: [TeamMembersController],
  providers: [TeamMembersService, JwtStrategy],
})
export class TeamMembersModule {}
