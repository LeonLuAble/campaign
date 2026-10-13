import { describe, it, expect, beforeEach } from 'vitest';
import { CredentialService } from './credential.service.js';
import { PasswordHashingService } from './password-hashing.service.js';

describe('CredentialService', () => {
  let service: CredentialService;
  let passwordHashingService: PasswordHashingService;

  beforeEach(() => {
    passwordHashingService = new PasswordHashingService();
    service = new CredentialService(passwordHashingService);
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

    it('should throw error for invalid mobile number', () => {
      const mobile = 'not-a-phone-number';

      expect(() => service.normalizeMobile(mobile)).toThrow();
    });

    it('should throw error for incomplete mobile number', () => {
      const mobile = '+1 123';

      expect(() => service.normalizeMobile(mobile)).toThrow();
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
