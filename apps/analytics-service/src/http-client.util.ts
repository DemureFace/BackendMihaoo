import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';

// Mirrors apps/gateway/src/http-proxy.util.ts's rethrowUpstreamError — kept
// local rather than shared, since this is the only outbound call this
// service makes to another service.
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
