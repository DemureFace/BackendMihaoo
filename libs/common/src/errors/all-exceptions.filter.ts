import { randomUUID } from 'crypto';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../http/correlation-id';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

const ENVELOPE_RESERVED_KEYS = new Set(['message', 'statusCode', 'error']);

/**
 * Unifies every service's error responses into
 * `{ error: { code, message, correlationId, timestamp, path, details? } }`
 * (docs/service-communication.md #7). Two kinds of exception bodies are left
 * untouched instead of being forced into that shape:
 *  - already-enveloped bodies (an upstream service behind the gateway already
 *    ran this same filter — `rethrowUpstreamError` rethrows its body as-is)
 *  - "opaque" bodies with neither `message` nor `error` (e.g. the /health,
 *    /ready, /health/system controllers, which define their own documented
 *    response contract and aren't really "errors")
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (status >= 500) {
        this.logException(request, status, exception);
      }

      if (this.isAlreadyEnvelope(body) || this.isOpaqueBody(body)) {
        response.status(status).json(body);
        return;
      }

      const message = this.extractMessage(body, exception.message);
      const code = this.deriveCode(status, body);
      const details = this.extractDetails(body);
      response
        .status(status)
        .json(this.buildEnvelope(request, code, message, details));
      return;
    }

    this.logException(request, HttpStatus.INTERNAL_SERVER_ERROR, exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.buildEnvelope(
          request,
          'INTERNAL_SERVER_ERROR',
          'Internal server error',
        ),
      );
  }

  private logException(request: Request, status: number, exception: unknown) {
    const stack =
      exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(`${request.method} ${request.url} -> ${status}`, stack);
  }

  private isAlreadyEnvelope(body: unknown): boolean {
    if (typeof body !== 'object' || body === null) return false;
    const err = (body as Record<string, unknown>).error;
    return (
      typeof err === 'object' &&
      err !== null &&
      typeof (err as Record<string, unknown>).code === 'string' &&
      typeof (err as Record<string, unknown>).message === 'string'
    );
  }

  private isOpaqueBody(body: unknown): boolean {
    if (typeof body !== 'object' || body === null) return false;
    const record = body as Record<string, unknown>;
    return !('message' in record) && !('error' in record);
  }

  private extractMessage(body: unknown, fallback: string): string {
    if (typeof body === 'string') return body;
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as Record<string, unknown>).message;
      if (Array.isArray(message)) return message.join('; ');
      if (typeof message === 'string') return message;
    }
    return fallback;
  }

  private deriveCode(status: number, body: unknown): string {
    const isValidationBody =
      typeof body === 'object' &&
      body !== null &&
      Array.isArray((body as Record<string, unknown>).message);

    if (status === 400 && isValidationBody) {
      return 'VALIDATION_ERROR';
    }
    return STATUS_CODES[status] ?? `HTTP_${status}`;
  }

  private extractDetails(body: unknown): Record<string, unknown> | undefined {
    if (typeof body !== 'object' || body === null) return undefined;
    const details = Object.fromEntries(
      Object.entries(body as Record<string, unknown>).filter(
        ([key]) => !ENVELOPE_RESERVED_KEYS.has(key),
      ),
    );
    return Object.keys(details).length > 0 ? details : undefined;
  }

  private buildEnvelope(
    request: Request,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    return {
      error: {
        code,
        message,
        correlationId: this.getCorrelationId(request),
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(details ? { details } : {}),
      },
    };
  }

  private getCorrelationId(request: Request): string {
    const header = request.headers[CORRELATION_ID_HEADER];
    return typeof header === 'string' && header.length > 0
      ? header
      : randomUUID();
  }
}
