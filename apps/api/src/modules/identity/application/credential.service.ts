import { Injectable } from '@nestjs/common';
import { PasswordHashingService } from './password-hashing.service.js';
import { parsePhoneNumber, PhoneNumber } from 'libphonenumber-js';

@Injectable()
export class CredentialService {
  constructor(
    private readonly passwordHashingService: PasswordHashingService,
  ) {}

  async setPassword(password: string): Promise<string> {
    return this.passwordHashingService.hash(password);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return this.passwordHashingService.verify(hash, password);
  }

  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  normalizeMobile(mobile: string): string {
    try {
      const phoneNumber: PhoneNumber = parsePhoneNumber(mobile);
      if (!phoneNumber.isValid()) {
        throw new Error('Invalid phone number');
      }
      return phoneNumber.format('E.164');
    } catch (error) {
      throw new Error(
        `Failed to normalize mobile number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      );
    }
  }
}
