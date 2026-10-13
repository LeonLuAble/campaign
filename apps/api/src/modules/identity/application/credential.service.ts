import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordHashingService } from './password-hashing.service.js';
import { parsePhoneNumber, PhoneNumber, CountryCode } from 'libphonenumber-js';

export const DEFAULT_PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;

export class InvalidPhoneNumberError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'InvalidPhoneNumberError';
    this.cause = cause;
  }
}

export class WeakPasswordError extends Error {
  constructor(
    message = 'Password does not meet the minimum policy',
    readonly minLength = DEFAULT_PASSWORD_MIN_LENGTH,
  ) {
    super(message);
    this.name = 'WeakPasswordError';
  }
}

@Injectable()
export class CredentialService {
  private readonly defaultPhoneRegion: CountryCode;
  private readonly passwordMinLength: number;

  constructor(
    private readonly passwordHashingService: PasswordHashingService,
    private readonly configService: ConfigService,
  ) {
    this.defaultPhoneRegion = this.configService.get<string>(
      'DEFAULT_PHONE_REGION',
      'MY',
    ) as CountryCode;
    this.passwordMinLength = Number(
      this.configService.get(
        'PASSWORD_MIN_LENGTH',
        DEFAULT_PASSWORD_MIN_LENGTH,
      ),
    );
  }

  assertPasswordPolicy(password: string): void {
    if (
      password.length < this.passwordMinLength ||
      password.length > PASSWORD_MAX_LENGTH ||
      password.trim().length === 0
    ) {
      throw new WeakPasswordError(
        `Password must be between ${this.passwordMinLength} and ${PASSWORD_MAX_LENGTH} characters`,
        this.passwordMinLength,
      );
    }
  }

  async setPassword(password: string): Promise<string> {
    this.assertPasswordPolicy(password);
    return this.passwordHashingService.hash(password);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return this.passwordHashingService.verify(hash, password);
  }

  async verifyDummyPassword(password: string): Promise<boolean> {
    return this.passwordHashingService.verifyDummy(password);
  }

  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  detectIdentifierType(identifier: string): 'email' | 'mobile' {
    return identifier.includes('@') ? 'email' : 'mobile';
  }

  normalizeIdentifier(identifier: string): string {
    if (this.detectIdentifierType(identifier) === 'email') {
      return this.normalizeEmail(identifier);
    }
    return this.normalizeMobile(identifier);
  }

  normalizeMobile(mobile: string): string {
    try {
      const phoneNumber: PhoneNumber = parsePhoneNumber(
        mobile,
        this.defaultPhoneRegion,
      );
      if (!phoneNumber.isValid()) {
        throw new InvalidPhoneNumberError(`Invalid phone number: ${mobile}`);
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
