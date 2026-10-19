import { describe, expect, it } from 'vitest';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import {
  ENROLMENT_MODE_AUTO,
  ENROLMENT_MODE_OPT_IN,
  readEnrolmentMode,
  validateCampaignSettings,
} from './campaign-settings.js';

describe('campaign-settings enrolmentMode', () => {
  it('defaults to opt_in when unset', () => {
    expect(readEnrolmentMode({})).toBe(ENROLMENT_MODE_OPT_IN);
  });

  it('accepts opt_in and auto', () => {
    expect(readEnrolmentMode({ enrolmentMode: 'opt_in' })).toBe(
      ENROLMENT_MODE_OPT_IN,
    );
    expect(readEnrolmentMode({ enrolmentMode: 'auto' })).toBe(
      ENROLMENT_MODE_AUTO,
    );
  });

  it('rejects unknown enrolmentMode values', () => {
    expect(() => readEnrolmentMode({ enrolmentMode: 'forced' })).toThrow(
      InvalidRequestException,
    );
  });

  it('validateCampaignSettings checks enrolmentMode', () => {
    expect(() =>
      validateCampaignSettings({
        submissionReview: 'auto',
        enrolmentMode: 'auto',
      }),
    ).not.toThrow();
    expect(() =>
      validateCampaignSettings({ enrolmentMode: 'nope' }),
    ).toThrow(InvalidRequestException);
  });
});
