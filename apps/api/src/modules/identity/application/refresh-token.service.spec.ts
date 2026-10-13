import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshToken } from '../domain/refresh-token.entity.js';
import { RefreshTokenService } from './refresh-token.service.js';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  const mockRepository = {
    findOne: vi.fn(),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 'token-id', ...value })),
    update: vi.fn(),
  };

  const mockDataSource = {
    transaction: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('revokeIfActive updates only when revoked_at is null', async () => {
    mockRepository.update.mockResolvedValue({ affected: 1 });

    await expect(service.revokeIfActive('token-id', 'ROTATED')).resolves.toBe(
      true,
    );
    expect(mockRepository.update).toHaveBeenCalledWith(
      { id: 'token-id', revoked_at: IsNull() },
      {
        revoked_at: expect.any(Date),
        revocation_reason: 'ROTATED',
      },
    );
  });

  it('revokeIfActive returns false when no active row was updated', async () => {
    mockRepository.update.mockResolvedValue({ affected: 0 });

    await expect(service.revokeIfActive('token-id', 'ROTATED')).resolves.toBe(
      false,
    );
  });
});
