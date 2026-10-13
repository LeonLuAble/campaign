export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  correlationId: string | null;
  timestamp: string;
  path: string;
}
