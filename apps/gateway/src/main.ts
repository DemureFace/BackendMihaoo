import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from 'common/common';
import { GatewayModule } from './gateway.module';
import { correlationIdMiddleware } from './correlation-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(process.env.PORT ?? process.env.GATEWAY_PORT ?? 3000);
}
bootstrap();
