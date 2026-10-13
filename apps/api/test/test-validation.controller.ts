import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';

export class TestValidationDto {
  @IsString()
  name!: string;
}

@Controller('test')
export class TestValidationController {
  @Post('validate')
  validate(@Body() dto: TestValidationDto) {
    return { success: true, name: dto.name };
  }
}
