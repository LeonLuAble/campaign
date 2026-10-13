import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { AuthorizationService } from '../application/authorization.service.js';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get()
  list() {
    return this.authorization.listPermissions();
  }
}
