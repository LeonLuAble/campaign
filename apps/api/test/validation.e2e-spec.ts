import { Body, Controller, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureApp } from '../src/bootstrap/configure-app.js';

class TestValidationDto {
  @IsString()
  name!: string;
}

@Controller('test')
class TestValidationController {
  @Post('validate')
  validate(@Body() dto: TestValidationDto) {
    return { success: true, name: dto.name };
  }
}

@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
  controllers: [TestValidationController],
})
class TestValidationModule {}

describe('Validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestValidationModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 with VALIDATION_FAILED code for invalid request body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/test/validate')
      .send({ name: 123 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      error: 'Bad Request',
      path: '/api/v1/test/validate',
    });
    expect(response.body.message).toEqual(expect.any(Array));
    expect(response.body.correlationId).toEqual(expect.any(String));
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('returns 400 with VALIDATION_FAILED code for missing required field', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/test/validate')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.message).toEqual(expect.any(Array));
  });
});
