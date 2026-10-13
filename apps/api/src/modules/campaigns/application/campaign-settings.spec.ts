import { describe, expect, it } from 'vitest';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import { readSubmissionReview } from './campaign-settings.js';

describe('campaign settings', () => {
  it('defaults submissionReview to auto', () => {
    expect(readSubmissionReview({})).toBe('auto');
    expect(readSubmissionReview({ submissionReview: '' })).toBe('auto');
  });

  it('accepts auto and manual', () => {
    expect(readSubmissionReview({ submissionReview: 'auto' })).toBe('auto');
    expect(readSubmissionReview({ submissionReview: 'manual' })).toBe('manual');
  });

  it('rejects unknown review modes', () => {
    expect(() =>
      readSubmissionReview({ submissionReview: 'sometimes' }),
    ).toThrow(InvalidRequestException);
  });
});
