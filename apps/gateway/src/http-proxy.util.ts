import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';

export function rethrowUpstreamError(error: unknown): never {
  const axiosError = error as AxiosError;
  if (axiosError.response) {
    throw new HttpException(
      axiosError.response.data as object,
      axiosError.response.status,
    );
  }
  throw new HttpException(
    'Upstream service unavailable',
    HttpStatus.BAD_GATEWAY,
  );
}

/** True when the call never reached the downstream service (connection
 * refused/reset, DNS failure, or our own timeout firing) as opposed to the
 * service answering with an HTTP error body. */
function isNetworkFailure(error: unknown): boolean {
  return !(error as AxiosError).response;
}

/**
 * Per docs/service-communication.md §3: a GET (idempotent) request may be
 * retried once, but only when the failure is network-level — never when the
 * downstream service answered with a 4xx/5xx body, since that means it's up
 * and retrying won't change the outcome.
 *
 * Only wrap GET calls with this. Mutations (POST/PUT/PATCH/DELETE) must
 * never be retried automatically — a duplicated mutation is worse than a
 * failed request the client can resubmit.
 */
export async function withGetRetry<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isNetworkFailure(error)) {
      throw error;
    }
    return request();
  }
}
