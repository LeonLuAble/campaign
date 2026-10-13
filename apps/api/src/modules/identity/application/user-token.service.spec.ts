import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserToken, UserTokenType } from '../domain/user-token.entity.js';
import { UserTokenService } from './user-token.service.js';

describe('UserTokenService', () => {
  let service: UserTokenService;

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
    mockDataSource.transaction.mockImplementation(
      async (
        work: (manager: {
          getRepository: () => typeof mockRepository;
        }) => unknown,
      ) => work({ getRepository: () => mockRepository }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTokenService,
        {
          provide: getRepositoryToken(UserToken),
          useValue: mockRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(UserTokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('finds a token by hash', async () => {
    mockRepository.findOne.mockResolvedValue({
      id: 'token-id',
      user_id: 'user-id',
      type: UserTokenType.ACTIVATION,
      expires_at: new Date('2026-01-02T00:00:00.000Z'),
      used_at: null,
    });

    await expect(service.findByHash('hash')).resolves.toEqual({
      id: 'token-id',
      userId: 'user-id',
      type: UserTokenType.ACTIVATION,
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      usedAt: null,
    });
  });

  it('marks unused tokens used before inserting a replacement', async () => {
    const expiresAt = new Date('2026-01-02T00:00:00.000Z');

    const created = await service.supersedeUnusedAndCreate({
      userId: 'user-id',
      type: UserTokenType.ACTIVATION,
      tokenHash: 'new-hash',
      expiresAt,
    });

    expect(mockRepository.update).toHaveBeenCalledWith(
      {
        user_id: 'user-id',
        type: UserTokenType.ACTIVATION,
        used_at: IsNull(),
      },
      { used_at: expect.any(Date) },
    );
    expect(mockRepository.save).toHaveBeenCalled();
    expect(created).toMatchObject({
      userId: 'user-id',
      type: UserTokenType.ACTIVATION,
      expiresAt,
    });
    const updateOrder = mockRepository.update.mock.invocationCallOrder[0];
    const saveOrder = mockRepository.save.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(saveOrder);
  });
});
