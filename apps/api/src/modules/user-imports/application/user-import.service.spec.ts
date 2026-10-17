import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import { RegistrationService } from '../../auth/application/registration.service.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { CredentialService } from '../../identity/application/credential.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import { UserImportRow } from '../domain/user-import-row.entity.js';
import { UserImport, UserImportStatus } from '../domain/user-import.entity.js';
import { UserImportService } from './user-import.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';
const importId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function tenantContext(
  tenantId: string,
  permissions = new Set(['user_imports.create', 'user_imports.read']),
): TenantContext {
  return {
    tenantId,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'membership-admin',
        tenantId,
        userId: 'admin-user',
        communityId: null,
        isActive: true,
      },
    ],
    permissions,
  };
}

function csvFile(contents: string, name = 'users.csv') {
  const buffer = Buffer.from(contents);
  return {
    buffer,
    originalname: name,
    mimetype: 'text/csv',
    size: buffer.length,
  };
}

describe('UserImportService', () => {
  let service: UserImportService;
  const importRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const rowRepository = {
    find: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
    createQueryBuilder: vi.fn(),
  };
  const customers = { requireActive: vi.fn() };
  const communities = { get: vi.fn(), list: vi.fn() };
  const identities = {
    findIdentity: vi.fn(),
    createImportedAccount: vi.fn(),
  };
  const credentials = {
    normalizeEmail: vi.fn((value: string) => value.toLowerCase().trim()),
    normalizeMobile: vi.fn((value: string) =>
      value.startsWith('+') ? value : `+60${value.replace(/^0/, '')}`,
    ),
  };
  const memberships = {
    listActiveForUserInTenant: vi.fn(),
    create: vi.fn(),
    assignSystemRole: vi.fn(),
  };
  const registration = { sendActivationInvitation: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    communities.list.mockResolvedValue([]);
    importRepository.save.mockImplementation(async (value: UserImport) => ({
      ...value,
      id: value.id ?? importId,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    }));
    rowRepository.save.mockImplementation(async (value: unknown) => value);
    const module = await Test.createTestingModule({
      providers: [
        UserImportService,
        { provide: getRepositoryToken(UserImport), useValue: importRepository },
        {
          provide: getRepositoryToken(UserImportRow),
          useValue: rowRepository,
        },
        { provide: CustomerService, useValue: customers },
        { provide: CommunityService, useValue: communities },
        { provide: IdentityAccountService, useValue: identities },
        { provide: CredentialService, useValue: credentials },
        { provide: MembershipService, useValue: memberships },
        { provide: RegistrationService, useValue: registration },
      ],
    }).compile();
    service = module.get(UserImportService);
  });

  it('uploads a CSV and auto-maps canonical headers', async () => {
    const summary = await service.upload(
      tenantContext(tenantA),
      'admin-user',
      csvFile('email,first_name\nmei@example.com,Mei\n'),
      null,
    );

    expect(summary.status).toBe(UserImportStatus.MAPPED);
    expect(summary.mapping).toEqual({
      email: 'email',
      firstName: 'first_name',
    });
    expect(summary.counts.total).toBe(1);
    expect(importRepository.save).toHaveBeenCalled();
    expect(rowRepository.save).toHaveBeenCalled();
  });

  it('hides imports from another tenant', async () => {
    importRepository.findOne.mockResolvedValue(null);
    await expect(
      service.get(tenantContext(tenantA), importId),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(importRepository.findOne).toHaveBeenCalledWith({
      where: { id: importId, tenant_id: tenantA },
    });
  });

  it('validates rows, marks duplicates, and reviews out-of-tenant identities', async () => {
    importRepository.findOne.mockResolvedValue({
      id: importId,
      tenant_id: tenantA,
      status: UserImportStatus.MAPPED,
      headers: ['email', 'mobile', 'external_id'],
      column_mapping: {
        email: 'email',
        mobile: 'mobile',
        externalId: 'external_id',
      },
      default_community_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const rows = [
      {
        id: 'r1',
        import_id: importId,
        row_number: 2,
        raw_data: { email: 'a@example.com', mobile: '', external_id: 'E1' },
        status: 'pending',
        error_code: null as string | null,
        resolved_user_id: null as string | null,
      },
      {
        id: 'r2',
        import_id: importId,
        row_number: 3,
        raw_data: { email: 'a@example.com', mobile: '', external_id: 'E2' },
        status: 'pending',
        error_code: null as string | null,
        resolved_user_id: null as string | null,
      },
      {
        id: 'r3',
        import_id: importId,
        row_number: 4,
        raw_data: { email: 'b@example.com', mobile: '', external_id: '' },
        status: 'pending',
        error_code: null as string | null,
        resolved_user_id: null as string | null,
      },
    ];
    rowRepository.find.mockResolvedValue(rows);
    identities.findIdentity.mockImplementation(
      async (type: IdentityType, identifier: string) => {
        if (type === IdentityType.EMAIL && identifier === 'b@example.com') {
          return {
            userId: 'other-tenant-user',
            identityId: 'id-b',
            type,
            identifier,
            isVerified: true,
            isActive: true,
          };
        }
        return null;
      },
    );
    memberships.listActiveForUserInTenant.mockImplementation(
      async (userId: string, tenantId: string) => {
        if (userId === 'other-tenant-user' && tenantId === tenantB) {
          return [
            {
              id: 'mb',
              tenantId: tenantB,
              userId,
              communityId: null,
              isActive: true,
            },
          ];
        }
        return [];
      },
    );
    rowRepository.createQueryBuilder.mockReturnValue({
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(null),
    });

    const summary = await service.validate(tenantContext(tenantA), importId);

    expect(rows[0].status).toBe('valid');
    expect(rows[1].status).toBe('invalid');
    expect(rows[1].error_code).toBe('DUPLICATE_ROW');
    expect(rows[2].status).toBe('review');
    expect(rows[2].error_code).toBe('EXISTING_IDENTITY');
    expect(summary.status).toBe(UserImportStatus.VALIDATED);
  });

  it('confirms valid rows through identity and membership services and sends an invitation', async () => {
    importRepository.findOne.mockResolvedValue({
      id: importId,
      tenant_id: tenantA,
      status: UserImportStatus.VALIDATED,
      headers: ['email'],
      column_mapping: { email: 'email' },
      default_community_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const row = {
      id: 'r1',
      import_id: importId,
      row_number: 2,
      raw_data: { email: 'mei@example.com' },
      email: 'mei@example.com',
      mobile: null,
      first_name: 'Mei',
      last_name: null,
      display_name: null,
      community_id: null,
      status: 'valid',
      resolved_user_id: null,
    };
    rowRepository.find.mockResolvedValue([row]);
    identities.createImportedAccount.mockResolvedValue({
      userId: 'imported-user',
      identities: [
        {
          id: 'identity-1',
          type: IdentityType.EMAIL,
          identifier: 'mei@example.com',
        },
      ],
    });
    memberships.listActiveForUserInTenant.mockResolvedValue([]);
    memberships.create.mockResolvedValue({ id: 'membership-1' });
    memberships.assignSystemRole.mockResolvedValue([
      { id: 'role-member', key: 'member', name: 'Member' },
    ]);

    const summary = await service.confirm(tenantContext(tenantA), importId);

    expect(identities.createImportedAccount).toHaveBeenCalledWith({
      firstName: 'Mei',
      lastName: null,
      displayName: null,
      identities: [
        {
          type: IdentityType.EMAIL,
          identifier: 'mei@example.com',
          normalizedIdentifier: 'mei@example.com',
        },
      ],
    });
    expect(memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: tenantA }),
      { userId: 'imported-user', communityId: null },
    );
    expect(memberships.assignSystemRole).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: tenantA }),
      'membership-1',
      'member',
    );
    expect(registration.sendActivationInvitation).toHaveBeenCalledWith(
      'mei@example.com',
    );
    expect(row.status).toBe('created');
    expect(row.resolved_user_id).toBe('imported-user');
    expect(summary.status).toBe(UserImportStatus.CONFIRMED);
  });

  it('assigns the system member role when confirming a matched in-tenant user', async () => {
    importRepository.findOne.mockResolvedValue({
      id: importId,
      tenant_id: tenantA,
      status: UserImportStatus.VALIDATED,
      headers: ['email'],
      column_mapping: { email: 'email' },
      default_community_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const row = {
      id: 'r1',
      import_id: importId,
      row_number: 2,
      raw_data: { email: 'admin@example.com' },
      email: 'admin@example.com',
      mobile: null,
      first_name: null,
      last_name: null,
      display_name: null,
      community_id: null,
      status: 'valid',
      resolved_user_id: 'admin-user',
    };
    rowRepository.find.mockResolvedValue([row]);
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: 'membership-admin',
        tenantId: tenantA,
        userId: 'admin-user',
        communityId: null,
        isActive: true,
      },
    ]);
    memberships.assignSystemRole.mockResolvedValue([
      { id: 'role-member', key: 'member', name: 'Member' },
    ]);

    await service.confirm(tenantContext(tenantA), importId);

    expect(identities.createImportedAccount).not.toHaveBeenCalled();
    expect(memberships.create).not.toHaveBeenCalled();
    expect(memberships.assignSystemRole).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: tenantA }),
      'membership-admin',
      'member',
    );
    expect(row.status).toBe('matched');
  });

  it('does not create users when confirm is repeated', async () => {
    importRepository.findOne.mockResolvedValue({
      id: importId,
      tenant_id: tenantA,
      status: UserImportStatus.CONFIRMED,
      headers: ['email'],
      column_mapping: { email: 'email' },
      created_at: new Date(),
      updated_at: new Date(),
      confirmed_at: new Date(),
    });
    rowRepository.find.mockResolvedValue([]);

    await service.confirm(tenantContext(tenantA), importId);

    expect(identities.createImportedAccount).not.toHaveBeenCalled();
    expect(registration.sendActivationInvitation).not.toHaveBeenCalled();
  });

  it('rejects confirm before validation', async () => {
    importRepository.findOne.mockResolvedValue({
      id: importId,
      tenant_id: tenantA,
      status: UserImportStatus.MAPPED,
      headers: ['email'],
      column_mapping: { email: 'email' },
      created_at: new Date(),
      updated_at: new Date(),
    });
    rowRepository.find.mockResolvedValue([]);

    await expect(
      service.confirm(tenantContext(tenantA), importId),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('matches an in-tenant user instead of creating a second account', async () => {
    importRepository.findOne.mockResolvedValue({
      id: importId,
      tenant_id: tenantA,
      status: UserImportStatus.MAPPED,
      headers: ['email'],
      column_mapping: { email: 'email' },
      default_community_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const row = {
      id: 'r1',
      import_id: importId,
      row_number: 2,
      raw_data: { email: 'admin@example.com' },
      status: 'pending',
      error_code: null as string | null,
      resolved_user_id: null as string | null,
    };
    rowRepository.find.mockResolvedValue([row]);
    identities.findIdentity.mockResolvedValue({
      userId: 'admin-user',
      identityId: 'id-admin',
      type: IdentityType.EMAIL,
      identifier: 'admin@example.com',
      isVerified: true,
      isActive: true,
    });
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: 'membership-admin',
        tenantId: tenantA,
        userId: 'admin-user',
        communityId: null,
        isActive: true,
      },
    ]);
    rowRepository.createQueryBuilder.mockReturnValue({
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(null),
    });

    await service.validate(tenantContext(tenantA), importId);

    expect(row.status).toBe('valid');
    expect(row.resolved_user_id).toBe('admin-user');
  });
});
