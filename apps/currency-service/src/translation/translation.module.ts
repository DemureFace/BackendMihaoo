import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';

@Module({
  imports: [HttpModule],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
