import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from 'common/common';
import { GatewayModule } from './gateway.module';
import { correlationIdMiddleware } from './correlation-id.middleware';

// One image runs in every environment (APP_NAME picks the app, not the
// build) — allowed origins must therefore come from env, not a literal
// list, so staging/production can each allow their own frontend without a
// code change or a deploy of new code.
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'https://mihaoo.netlify.app',
];

function resolveCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS;
  if (!configured) {
    return DEFAULT_CORS_ORIGINS;
  }
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.enableCors({
    origin: resolveCorsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
  });
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(process.env.PORT ?? process.env.GATEWAY_PORT ?? 3000);
}
bootstrap();
