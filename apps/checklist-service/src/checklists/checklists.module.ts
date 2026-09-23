import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';

@Module({
  imports: [PassportModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService, JwtStrategy],
})
export class ChecklistsModule {}
