import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SetupService } from '../application/setup.service.js';
import { SetupAdminDto } from '../dto/setup-admin.dto.js';

@Controller('setup')
@UseGuards(ThrottlerGuard)
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  getStatus() {
    return this.setupService.getStatus();
  }

  @Post('admin')
  @HttpCode(HttpStatus.OK)
  createAdmin(@Body() body: SetupAdminDto) {
    return this.setupService.createAdmin({
      setupKey: body.setupKey,
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });
  }
}
