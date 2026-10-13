export type DependencyStatus = 'up' | 'down';

export interface LivenessResponse {
  status: 'ok';
  timestamp: string;
}

export interface ReadinessResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
}
