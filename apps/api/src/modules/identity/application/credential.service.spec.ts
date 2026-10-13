import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  CredentialService,
  InvalidPhoneNumberError,
} from './credential.service.js';
import { PasswordHashingService } from './password-hashing.service.js';

describe('CredentialService', () => {
  let service: CredentialService;
  let passwordHashingService: PasswordHashingService;
  let configService: ConfigService;

  beforeEach(() => {
    passwordHashingService = new PasswordHashingService();
    configService = {
      get: (key: string, defaultValue?: string) => {
        if (key === 'DEFAULT_PHONE_REGION') {
          return defaultValue || 'MY';
        }
        return defaultValue;
      },
    } as ConfigService;
    service = new CredentialService(passwordHashingService, configService);
  });

  describe('normalizeEmail', () => {
    it('should lowercase email addresses', () => {
      const email = 'Test@Example.COM';
      const normalized = service.normalizeEmail(email);

      expect(normalized).toBe('test@example.com');
    });

    it('should trim whitespace from email addresses', () => {
      const email = '  test@example.com  ';
      const normalized = service.normalizeEmail(email);

      expect(normalized).toBe('test@example.com');
    });

    it('should handle already normalized emails', () => {
      const email = 'test@example.com';
      const normalized = service.normalizeEmail(email);

      expect(normalized).toBe('test@example.com');
    });

    it('should handle emails with mixed case and whitespace', () => {
      const email = '  TeSt@ExAmPlE.cOm  ';
      const normalized = service.normalizeEmail(email);

      expect(normalized).toBe('test@example.com');
    });
  });

  describe('normalizeMobile', () => {
    it('should normalize valid US mobile number to E.164', () => {
      const mobile = '+1 (650) 253-0000';
      const normalized = service.normalizeMobile(mobile);

      expect(normalized).toBe('+16502530000');
    });

    it('should normalize valid Malaysian mobile number to E.164', () => {
      const mobile = '+60 12-345 6789';
      const normalized = service.normalizeMobile(mobile);

      expect(normalized).toBe('+60123456789');
    });

    it('should handle mobile numbers without formatting', () => {
      const mobile = '+16502530000';
      const normalized = service.normalizeMobile(mobile);

      expect(normalized).toBe('+16502530000');
    });

    it('should normalize local Malaysian mobile number without prefix', () => {
      const mobile = '012-345 6789';
      const normalized = service.normalizeMobile(mobile);

      expect(normalized).toBe('+60123456789');
    });

    it('should normalize local Malaysian mobile number without dashes', () => {
      const mobile = '0123456789';
      const normalized = service.normalizeMobile(mobile);

      expect(normalized).toBe('+60123456789');
    });

    it('should throw InvalidPhoneNumberError for invalid mobile number', () => {
      const mobile = 'not-a-phone-number';

      expect(() => service.normalizeMobile(mobile)).toThrow(
        InvalidPhoneNumberError,
      );
    });

    it('should throw InvalidPhoneNumberError for incomplete mobile number', () => {
      const mobile = '+1 123';

      expect(() => service.normalizeMobile(mobile)).toThrow(
        InvalidPhoneNumberError,
      );
    });

    it('should throw InvalidPhoneNumberError for empty string', () => {
      const mobile = '';

      expect(() => service.normalizeMobile(mobile)).toThrow(
        InvalidPhoneNumberError,
      );
    });

    it('should throw InvalidPhoneNumberError with descriptive message', () => {
      const mobile = 'invalid-number';

      try {
        service.normalizeMobile(mobile);
        expect.fail('Should have thrown InvalidPhoneNumberError');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPhoneNumberError);
        expect((error as Error).message).toContain(
          'Failed to normalize mobile number',
        );
      }
    });
  });

  describe('normalizeIdentifier', () => {
    it('should treat values containing @ as email', () => {
      expect(service.detectIdentifierType('Test@Example.COM')).toBe('email');
      expect(service.normalizeIdentifier('  TeSt@ExAmPlE.cOm  ')).toBe(
        'test@example.com',
      );
    });

    it('should treat values without @ as mobile numbers', () => {
      expect(service.detectIdentifierType('0123456789')).toBe('mobile');
      expect(service.normalizeIdentifier('0123456789')).toBe('+60123456789');
    });
  });

  describe('setPassword', () => {
    it('should hash password using password hashing service', async () => {
      const password = 'testPassword123!';
      const hash = await service.setPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toContain('$argon2id$');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123!';
      const hash = await service.setPassword(password);

      const isValid = await service.verifyPassword(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await service.setPassword(password);

      const isValid = await service.verifyPassword(hash, wrongPassword);

      expect(isValid).toBe(false);
    });
  });
});
