import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TestValidationController } from './test-validation.controller.js';

@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
  controllers: [TestValidationController],
})
export class TestValidationModule {}
