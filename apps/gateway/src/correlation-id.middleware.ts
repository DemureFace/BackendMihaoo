import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from 'common/common';

/**
 * Assigns a correlation id to every request (reusing an inbound one from a
 * client or another hop, otherwise minting a new one) and echoes it on the
 * response. Per docs/service-communication.md — each proxy controller reads
 * it back off the (now-normalized) request headers and forwards it on to the
 * downstream service it calls.
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.headers[CORRELATION_ID_HEADER];
  const correlationId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();

  req.headers[CORRELATION_ID_HEADER] = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}
