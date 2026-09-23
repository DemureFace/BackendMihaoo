import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from 'common/common';
import { BannerExportServiceModule } from './banner-export-service.module';

async function bootstrap() {
  const app = await NestFactory.create(BannerExportServiceModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(
    process.env.PORT ?? process.env.BANNER_EXPORT_SERVICE_PORT ?? 3007,
  );
}
bootstrap();
