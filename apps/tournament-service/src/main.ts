import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from 'common/common';
import { TournamentServiceModule } from './tournament-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TournamentServiceModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(
    process.env.PORT ?? process.env.TOURNAMENT_SERVICE_PORT ?? 3004,
  );
}
bootstrap();
