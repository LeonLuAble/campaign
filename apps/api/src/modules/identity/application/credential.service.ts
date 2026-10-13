import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordHashingService } from './password-hashing.service.js';
import { parsePhoneNumber, PhoneNumber, CountryCode } from 'libphonenumber-js';

export class InvalidPhoneNumberError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'InvalidPhoneNumberError';
    this.cause = cause;
  }
}

@Injectable()
export class CredentialService {
  private readonly defaultPhoneRegion: CountryCode;

  constructor(
    private readonly passwordHashingService: PasswordHashingService,
    private readonly configService: ConfigService,
  ) {
    this.defaultPhoneRegion = this.configService.get<string>(
      'DEFAULT_PHONE_REGION',
      'MY',
    ) as CountryCode;
  }

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
      const phoneNumber: PhoneNumber = parsePhoneNumber(
        mobile,
        this.defaultPhoneRegion,
      );
      if (!phoneNumber.isValid()) {
        throw new InvalidPhoneNumberError(
          `Invalid phone number: ${mobile}`,
        );
      }
      return phoneNumber.format('E.164');
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        throw error;
      }
      throw new InvalidPhoneNumberError(
        `Failed to normalize mobile number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
    }
  }
}
