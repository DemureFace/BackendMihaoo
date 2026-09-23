import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from 'common/common';
import { ChecklistServiceModule } from './checklist-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ChecklistServiceModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(
    process.env.PORT ?? process.env.CHECKLIST_SERVICE_PORT ?? 3006,
  );
}
bootstrap();
