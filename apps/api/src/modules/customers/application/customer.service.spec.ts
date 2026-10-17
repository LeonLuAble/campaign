import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import { RegistrationService } from '../../auth/application/registration.service.js';
import { MEMBERSHIP_SERVICE } from '../../authorization/application/access-readers.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import { CredentialService } from '../../identity/application/credential.service.js';
import {
  IdentityAccountService,
  IdentityAlreadyExistsError,
} from '../../identity/application/identity-account.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { Tenant } from '../domain/tenant.entity.js';
import { CustomerService } from './customer.service.js';

describe('CustomerService', () => {
  let service: CustomerService;
  const tenantRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
  };
  const memberships = {
    listTenantIdsForUser: vi.fn(),
    listActiveForUserInTenant: vi.fn(),
    createInTransaction: vi.fn(),
  };
  const authorization = {
    seedSystemRoles: vi.fn(),
    findSystemRole: vi.fn(),
    assignRoleInTransaction: vi.fn(),
  };
  const identities = {
    isPlatformAdmin: vi.fn(),
    isUserActive: vi.fn(),
    findIdentity: vi.fn(),
    createImportedAccountInTransaction: vi.fn(),
  };
  const credentials = {
    normalizeEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  };
  const registration = {
    issueActivationTokenForIdentity: vi.fn(),
    sendCustomerAddedNotice: vi.fn(),
    sendActivationInvitation: vi.fn(),
  };
  const dataSource = { transaction: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    credentials.normalizeEmail.mockImplementation((email: string) =>
      email.trim().toLowerCase(),
    );
    const module = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Tenant), useValue: tenantRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: MEMBERSHIP_SERVICE, useValue: memberships },
        { provide: AuthorizationService, useValue: authorization },
        { provide: IdentityAccountService, useValue: identities },
        { provide: CredentialService, useValue: credentials },
        { provide: RegistrationService, useValue: registration },
      ],
    }).compile();
    service = module.get(CustomerService);
  });

  it('lists only tenants the user belongs to', async () => {
    memberships.listTenantIdsForUser.mockResolvedValue(['t1']);
    tenantRepository.find.mockResolvedValue([
      {
        id: 't1',
        name: 'Tzu Chi Malaysia',
        slug: 'tzu-chi-malaysia',
        is_active: true,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.listForUser('user-1');

    expect(result).toEqual([
      {
        id: 't1',
        name: 'Tzu Chi Malaysia',
        slug: 'tzu-chi-malaysia',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(tenantRepository.find).toHaveBeenCalledWith({
      where: { id: expect.anything() },
      order: { created_at: 'ASC' },
    });
  });

  it('returns an empty list when the user has no memberships', async () => {
    memberships.listTenantIdsForUser.mockResolvedValue([]);
    await expect(service.listForUser('user-1')).resolves.toEqual([]);
    expect(tenantRepository.find).not.toHaveBeenCalled();
  });

  it('refuses to create a customer unless the caller is a platform admin', async () => {
    identities.isPlatformAdmin.mockResolvedValue(false);
    await expect(
      service.create('user-1', { name: 'Tzu Chi Malaysia' }),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects initialAdminUserId when the user is not active', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    identities.isUserActive.mockResolvedValue(false);
    await expect(
      service.create('creator-1', {
        name: 'Tzu Chi Malaysia',
        initialAdminUserId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(identities.isUserActive).toHaveBeenCalledWith('admin-1');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects providing both initialAdminUserId and initialAdmin', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    await expect(
      service.create('creator-1', {
        name: 'Acme',
        initialAdminUserId: 'admin-1',
        initialAdmin: { email: 'a@example.com' },
      }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates a pending initial admin and returns an activation token', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    identities.findIdentity.mockResolvedValue(null);
    registration.issueActivationTokenForIdentity.mockResolvedValue('raw-token');
    dataSource.transaction.mockImplementation(async (fn) => {
      const manager = {
        getRepository: () => ({
          create: (row: unknown) => row,
          save: vi.fn(async (row: { name: string; slug: string }) => ({
            id: 'tenant-1',
            name: row.name,
            slug: row.slug,
            is_active: true,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-01T00:00:00.000Z'),
          })),
        }),
      };
      identities.createImportedAccountInTransaction.mockResolvedValue({
        userId: 'new-admin',
        identities: [
          {
            id: 'id-1',
            type: IdentityType.EMAIL,
            identifier: 'admin@example.com',
          },
        ],
      });
      authorization.findSystemRole.mockResolvedValue({ id: 'role-admin' });
      memberships.createInTransaction.mockResolvedValue({ id: 'mem-1' });
      return fn(manager);
    });

    const result = await service.create('creator-1', {
      name: 'Acme',
      initialAdmin: { email: 'admin@example.com', displayName: 'Admin' },
    });

    expect(result.activationToken).toBe('raw-token');
    expect(identities.createImportedAccountInTransaction).toHaveBeenCalled();
    expect(registration.issueActivationTokenForIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'new-admin',
        identityId: 'id-1',
      }),
    );
  });

  it('adds membership for an existing active verified user without a token', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    identities.findIdentity.mockResolvedValue({
      userId: 'existing',
      identityId: 'id-existing',
      type: IdentityType.EMAIL,
      identifier: 'existing@example.com',
      isVerified: true,
      isActive: true,
    });
    dataSource.transaction.mockImplementation(async (fn) => {
      const manager = {
        getRepository: () => ({
          create: (row: unknown) => row,
          save: vi.fn(async (row: { name: string; slug: string }) => ({
            id: 'tenant-2',
            name: row.name,
            slug: row.slug,
            is_active: true,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-01T00:00:00.000Z'),
          })),
        }),
      };
      authorization.findSystemRole.mockResolvedValue({ id: 'role-admin' });
      memberships.createInTransaction.mockResolvedValue({ id: 'mem-2' });
      return fn(manager);
    });

    const result = await service.create('creator-1', {
      name: 'Acme',
      initialAdmin: { email: 'existing@example.com' },
    });

    expect(result.activationToken).toBeUndefined();
    expect(identities.createImportedAccountInTransaction).not.toHaveBeenCalled();
    expect(memberships.createInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'existing' }),
    );
    expect(registration.issueActivationTokenForIdentity).not.toHaveBeenCalled();
    expect(registration.sendCustomerAddedNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'existing',
        email: 'existing@example.com',
        customerName: 'Acme',
      }),
    );
  });

  it('keeps the customer when activation send fails after commit', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    identities.findIdentity.mockResolvedValue(null);
    registration.issueActivationTokenForIdentity.mockRejectedValue(
      new Error('smtp down'),
    );
    dataSource.transaction.mockImplementation(async (fn) => {
      const manager = {
        getRepository: () => ({
          create: (row: unknown) => row,
          save: vi.fn(async (row: { name: string; slug: string }) => ({
            id: 'tenant-send-fail',
            name: row.name,
            slug: row.slug,
            is_active: true,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-01T00:00:00.000Z'),
          })),
        }),
      };
      identities.createImportedAccountInTransaction.mockResolvedValue({
        userId: 'new-admin',
        identities: [
          {
            id: 'id-1',
            type: IdentityType.EMAIL,
            identifier: 'admin@example.com',
          },
        ],
      });
      authorization.findSystemRole.mockResolvedValue({ id: 'role-admin' });
      memberships.createInTransaction.mockResolvedValue({ id: 'mem-1' });
      return fn(manager);
    });

    const result = await service.create('creator-1', {
      name: 'Acme',
      initialAdmin: { email: 'admin@example.com' },
    });

    expect(result.id).toBe('tenant-send-fail');
    expect(result.activationToken).toBeUndefined();
  });

  it('maps duplicate identity errors to a conflict', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    identities.findIdentity.mockResolvedValue(null);
    dataSource.transaction.mockImplementation(async (fn) => {
      const manager = {
        getRepository: () => ({
          create: (row: unknown) => row,
          save: vi.fn(async (row: { name: string; slug: string }) => ({
            id: 'tenant-3',
            name: row.name,
            slug: row.slug,
            is_active: true,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-01T00:00:00.000Z'),
          })),
        }),
      };
      identities.createImportedAccountInTransaction.mockRejectedValue(
        new IdentityAlreadyExistsError(),
      );
      return fn(manager);
    });

    await expect(
      service.create('creator-1', {
        name: 'Acme',
        initialAdmin: { email: 'dup@example.com' },
      }),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it('rolls back when membership creation fails', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    identities.findIdentity.mockResolvedValue(null);
    dataSource.transaction.mockImplementation(async (fn) => {
      const manager = {
        getRepository: () => ({
          create: (row: unknown) => row,
          save: vi.fn(async (row: { name: string; slug: string }) => ({
            id: 'tenant-4',
            name: row.name,
            slug: row.slug,
            is_active: true,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-01T00:00:00.000Z'),
          })),
        }),
      };
      identities.createImportedAccountInTransaction.mockResolvedValue({
        userId: 'new-admin',
        identities: [
          {
            id: 'id-1',
            type: IdentityType.EMAIL,
            identifier: 'admin@example.com',
          },
        ],
      });
      authorization.seedSystemRoles.mockResolvedValue(undefined);
      memberships.createInTransaction.mockRejectedValue(
        new Error('membership failed'),
      );
      return fn(manager);
    });

    await expect(
      service.create('creator-1', {
        name: 'Acme',
        initialAdmin: { email: 'admin@example.com' },
      }),
    ).rejects.toThrow('membership failed');
    expect(registration.issueActivationTokenForIdentity).not.toHaveBeenCalled();
  });
});
