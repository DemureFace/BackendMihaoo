/**
 * Default timeout for gateway -> service calls, per REL-03
 * (docs/service-communication.md). Applied via HttpModule.register({ timeout }).
 */
export const INTERNAL_HTTP_TIMEOUT_MS = 5000;
