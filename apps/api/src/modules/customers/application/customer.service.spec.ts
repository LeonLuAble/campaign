import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
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
  };
  const authorization = {};
  const dataSource = { transaction: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Tenant), useValue: tenantRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: MembershipService, useValue: memberships },
        { provide: AuthorizationService, useValue: authorization },
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
});
