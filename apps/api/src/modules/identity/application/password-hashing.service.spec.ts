import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordHashingService } from './password-hashing.service.js';

describe('PasswordHashingService', () => {
  let service: PasswordHashingService;

  beforeEach(() => {
    service = new PasswordHashingService();
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toContain('$argon2id$');
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty passwords', async () => {
      const password = '';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hash(password);

      const isValid = await service.verify(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await service.hash(password);

      const isValid = await service.verify(hash, wrongPassword);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const password = 'testPassword123!';
      const invalidHash = 'not-a-valid-hash';

      const isValid = await service.verify(invalidHash, password);

      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const isValidLower = await service.verify(hash, 'testpassword123!');

      expect(isValidLower).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return false for a recently hashed password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hash(password);

      const needsRehash = await service.needsRehash(hash);

      expect(needsRehash).toBe(false);
    });
  });
});
