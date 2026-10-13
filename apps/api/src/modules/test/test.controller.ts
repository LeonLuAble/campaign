import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';

class TestDto {
  @IsString()
  name!: string;
}

@Controller('test')
export class TestController {
  @Post('validate')
  validate(@Body() dto: TestDto) {
    return { success: true, name: dto.name };
  }
}
