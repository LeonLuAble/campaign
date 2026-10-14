import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { CredentialService } from '../../identity/application/credential.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { TokenService } from '../../auth/application/token.service.js';
import { SetupNotAvailableException } from './setup.exceptions.js';
import { SetupService } from './setup.service.js';

describe('SetupService', () => {
  const identityAccountService = {
    hasPlatformAdmin: vi.fn(),
    createFirstPlatformAdmin: vi.fn(),
  };
  const credentialService = {
    setPassword: vi.fn(),
    normalizeEmail: vi.fn((email: string) => email.toLowerCase().trim()),
  };
  const tokenService = {
    createRefreshToken: vi.fn(),
  };
  let configValues: Record<string, string | undefined>;

  function buildService(): SetupService {
    const configService = {
      get: vi.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    return new SetupService(
      configService,
      identityAccountService as unknown as IdentityAccountService,
      credentialService as unknown as CredentialService,
      tokenService as unknown as TokenService,
    );
  }

  beforeEach(() => {
    vi.resetAllMocks();
    configValues = {};
    credentialService.normalizeEmail.mockImplementation((email: string) =>
      email.toLowerCase().trim(),
    );
  });

  it('reports setupRequired false when SETUP_KEY is unset', async () => {
    const service = buildService();
    await expect(service.getStatus()).resolves.toEqual({
      setupRequired: false,
    });
    expect(identityAccountService.hasPlatformAdmin).not.toHaveBeenCalled();
  });

  it('rejects createAdmin when SETUP_KEY is unset', async () => {
    const service = buildService();
    await expect(
      service.createAdmin({
        setupKey: 'x'.repeat(32),
        email: 'admin@example.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(SetupNotAvailableException);
  });

  it('reports setupRequired true when key is set and no admin exists', async () => {
    configValues['setup.key'] = 'k'.repeat(32);
    identityAccountService.hasPlatformAdmin.mockResolvedValue(false);
    const service = buildService();
    await expect(service.getStatus()).resolves.toEqual({
      setupRequired: true,
    });
  });

  it('caches setupRequired false after an admin is known to exist', async () => {
    configValues['setup.key'] = 'k'.repeat(32);
    identityAccountService.hasPlatformAdmin.mockResolvedValue(true);
    const service = buildService();
    await expect(service.getStatus()).resolves.toEqual({
      setupRequired: false,
    });
    await expect(service.getStatus()).resolves.toEqual({
      setupRequired: false,
    });
    expect(identityAccountService.hasPlatformAdmin).toHaveBeenCalledTimes(1);
  });
});
