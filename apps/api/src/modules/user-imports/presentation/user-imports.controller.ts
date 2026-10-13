import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/presentation/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import {
  USER_IMPORT_MAX_FILE_BYTES,
  UserImportService,
} from '../application/user-import.service.js';
import { MapUserImportDto } from '../dto/map-user-import.dto.js';

type UploadedCsv = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

const csvMemoryStorage = {
  _handleFile(
    _request: unknown,
    file: { stream: NodeJS.ReadableStream },
    callback: (error: Error | null, info?: { buffer: Buffer }) => void,
  ): void {
    const chunks: Buffer[] = [];
    file.stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    file.stream.on('end', () => {
      callback(null, { buffer: Buffer.concat(chunks) });
    });
    file.stream.on('error', (error: Error) => {
      callback(error);
    });
  },
  _removeFile(
    _request: unknown,
    _file: unknown,
    callback: (error: Error | null) => void,
  ): void {
    callback(null);
  },
};

@Controller('user-imports')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class UserImportsController {
  constructor(private readonly userImports: UserImportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.USER_IMPORTS_CREATE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: csvMemoryStorage,
      limits: { fileSize: USER_IMPORT_MAX_FILE_BYTES },
    }),
  )
  upload(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedCsv,
    @Query('communityId') communityId?: string,
  ) {
    return this.userImports.upload(
      tenant,
      user.userId,
      file,
      communityId ?? null,
    );
  }

  @Get()
  @RequirePermission(PERMISSIONS.USER_IMPORTS_READ)
  list(@CurrentTenant() tenant: TenantContext) {
    return this.userImports.list(tenant);
  }

  @Get(':userImportId')
  @RequirePermission(PERMISSIONS.USER_IMPORTS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('userImportId', ParseUUIDPipe) userImportId: string,
  ) {
    return this.userImports.get(tenant, userImportId);
  }

  @Get(':userImportId/rows')
  @RequirePermission(PERMISSIONS.USER_IMPORTS_READ)
  listRows(
    @CurrentTenant() tenant: TenantContext,
    @Param('userImportId', ParseUUIDPipe) userImportId: string,
  ) {
    return this.userImports.listRows(tenant, userImportId);
  }

  @Get(':userImportId/preview')
  @RequirePermission(PERMISSIONS.USER_IMPORTS_READ)
  preview(
    @CurrentTenant() tenant: TenantContext,
    @Param('userImportId', ParseUUIDPipe) userImportId: string,
  ) {
    return this.userImports.preview(tenant, userImportId);
  }

  @Patch(':userImportId/mapping')
  @RequirePermission(PERMISSIONS.USER_IMPORTS_CREATE)
  map(
    @CurrentTenant() tenant: TenantContext,
    @Param('userImportId', ParseUUIDPipe) userImportId: string,
    @Body() dto: MapUserImportDto,
  ) {
    return this.userImports.map(tenant, userImportId, dto.mapping);
  }

  @Post(':userImportId/validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.USER_IMPORTS_CREATE)
  validate(
    @CurrentTenant() tenant: TenantContext,
    @Param('userImportId', ParseUUIDPipe) userImportId: string,
  ) {
    return this.userImports.validate(tenant, userImportId);
  }

  @Post(':userImportId/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.USER_IMPORTS_CREATE)
  confirm(
    @CurrentTenant() tenant: TenantContext,
    @Param('userImportId', ParseUUIDPipe) userImportId: string,
  ) {
    return this.userImports.confirm(tenant, userImportId);
  }
}
