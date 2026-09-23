import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PassportModule],
  controllers: [TasksController],
  providers: [TasksService, JwtStrategy],
})
export class TasksModule {}
