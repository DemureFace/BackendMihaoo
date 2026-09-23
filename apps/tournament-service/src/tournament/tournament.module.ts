import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'common/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';

@Module({
  imports: [PassportModule],
  controllers: [TournamentController],
  providers: [TournamentService, JwtStrategy],
})
export class TournamentModule {}
