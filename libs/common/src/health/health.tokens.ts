export const HEALTH_SERVICE_NAME = Symbol('HEALTH_SERVICE_NAME');
export const DATABASE_HEALTH_CHECK = Symbol('DATABASE_HEALTH_CHECK');

export type DatabaseHealthCheck = () => Promise<unknown>;
