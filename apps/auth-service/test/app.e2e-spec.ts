import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthServiceModule } from './../src/auth-service.module';

describe('AuthServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirrors apps/auth-service/src/main.ts's bootstrap() — without this,
    // DTO validation (e.g. RegisterDto's @IsEmail) never runs, and this
    // suite silently tests nothing.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/register (POST) rejects an invalid email', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'password123' })
      .expect(400);
  });
});
