import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';

export const SUBMISSION_REVIEW_AUTO = 'auto';
export const SUBMISSION_REVIEW_MANUAL = 'manual';

export type SubmissionReviewMode =
  typeof SUBMISSION_REVIEW_AUTO | typeof SUBMISSION_REVIEW_MANUAL;

export function readSubmissionReview(
  configuration: Record<string, unknown>,
): SubmissionReviewMode {
  const raw = configuration.submissionReview;
  if (raw === undefined || raw === null || raw === '') {
    return SUBMISSION_REVIEW_AUTO;
  }
  if (raw === SUBMISSION_REVIEW_AUTO || raw === SUBMISSION_REVIEW_MANUAL) {
    return raw;
  }
  throw new InvalidRequestException(
    "submissionReview must be 'auto' or 'manual'",
  );
}
