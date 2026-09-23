import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { OrdinaryTournamentParserService } from './ordinary-tournament-parser.service';
import { TournamentParserService } from './tournament-parser.service';
import { TournamentTemplateController } from './tournament-template.controller';
import { TournamentTemplateService } from './tournament-template.service';

@Module({
  imports: [PassportModule],
  controllers: [TournamentTemplateController],
  providers: [
    TournamentTemplateService,
    TournamentParserService,
    OrdinaryTournamentParserService,
    JwtStrategy,
  ],
})
export class TournamentTemplateModule {}
