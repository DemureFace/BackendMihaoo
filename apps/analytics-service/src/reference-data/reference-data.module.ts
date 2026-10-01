import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';

@Module({
  imports: [PassportModule],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService, JwtStrategy],
  exports: [ReferenceDataService],
})
export class ReferenceDataModule {}
