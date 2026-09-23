import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from 'common/common';
import { CurrencyServiceModule } from './currency-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CurrencyServiceModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(
    process.env.PORT ?? process.env.CURRENCY_SERVICE_PORT ?? 3003,
  );
}
bootstrap();
