import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';

export const SUBMISSION_REVIEW_AUTO = 'auto';
export const SUBMISSION_REVIEW_MANUAL = 'manual';

export type SubmissionReviewMode =
  | typeof SUBMISSION_REVIEW_AUTO
  | typeof SUBMISSION_REVIEW_MANUAL;

export const ENROLMENT_MODE_OPT_IN = 'opt_in';
export const ENROLMENT_MODE_AUTO = 'auto';

export type EnrolmentMode =
  | typeof ENROLMENT_MODE_OPT_IN
  | typeof ENROLMENT_MODE_AUTO;

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

/** Default opt_in keeps existing campaigns and the demo seed unchanged. */
export function readEnrolmentMode(
  configuration: Record<string, unknown>,
): EnrolmentMode {
  const raw = configuration.enrolmentMode;
  if (raw === undefined || raw === null || raw === '') {
    return ENROLMENT_MODE_OPT_IN;
  }
  if (raw === ENROLMENT_MODE_OPT_IN || raw === ENROLMENT_MODE_AUTO) {
    return raw;
  }
  throw new InvalidRequestException(
    "enrolmentMode must be 'opt_in' or 'auto'",
  );
}

/** Validates known configuration keys used by the platform. */
export function validateCampaignSettings(
  configuration: Record<string, unknown>,
): void {
  readSubmissionReview(configuration);
  readEnrolmentMode(configuration);
}
