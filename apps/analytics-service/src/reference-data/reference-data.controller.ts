import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'common/common';
import { ReferenceDataService } from './reference-data.service';

@UseGuards(JwtAuthGuard)
@Controller('reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get()
  get() {
    return this.referenceDataService.getReferenceData();
  }
}
