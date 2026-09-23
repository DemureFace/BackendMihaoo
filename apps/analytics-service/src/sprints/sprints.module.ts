import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';

@Module({
  imports: [PassportModule],
  controllers: [SprintsController],
  providers: [SprintsService, JwtStrategy],
  exports: [SprintsService],
})
export class SprintsModule {}
