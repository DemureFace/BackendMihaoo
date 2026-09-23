import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from 'common/common';
import { BonusServiceModule } from './bonus-service.module';

async function bootstrap() {
  const app = await NestFactory.create(BonusServiceModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(process.env.PORT ?? process.env.BONUS_SERVICE_PORT ?? 3005);
}
bootstrap();
