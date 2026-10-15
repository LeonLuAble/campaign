import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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

  /** Tighter than the default auth throttler (20/min). */
  @Post('admin')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  createAdmin(@Body() body: SetupAdminDto) {
    return this.setupService.createAdmin({
      setupKey: body.setupKey,
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });
  }
}
