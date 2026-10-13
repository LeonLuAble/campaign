import type { Request } from 'express';

export type CorrelatedRequest = Request & {
  id?: string;
};
