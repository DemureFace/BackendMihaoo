# Service Communication Rules

Rules for REST communication between the API gateway (`apps/gateway`) and the
backend services (`auth`, `currency`, `tournament`, `bonus`,
`checklist`, `banner-export`, `analytics`). Only the gateway calls services
directly; services never call each other.

## 1. Internal service URLs

Format: `http://<service-name>:<port>` inside the Docker network,
`http://localhost:<port>` for local dev — never a hardcoded IP. Each service's
base URL is injected into the gateway as a `<SERVICE>_SERVICE_URL` env var
(e.g. `AUTH_SERVICE_URL`, `ANALYTICS_SERVICE_URL`), read via
`ConfigService.getOrThrow` in each proxy controller's constructor — a missing
URL is a startup-time failure, not a runtime surprise.

## 2. Timeout

**5000 ms** default per gateway → service call, defined once as
`INTERNAL_HTTP_TIMEOUT_MS` in `libs/common/src/http/internal-http.constants.ts`
and applied via `HttpModule.register({ timeout: INTERNAL_HTTP_TIMEOUT_MS })` in
every proxy module. Before this, no timeout was set at all — a stuck
downstream call hung the gateway request indefinitely.

Exception: `banner-export-proxy` (Figma rendering / zip assembly, which can
legitimately run past 5s) sets its own **30000 ms** timeout per call via
`EXPORT_JOB_TIMEOUT_MS`, documented at the call site. Any other endpoint that
needs a longer budget should do the same — override per-request, don't raise
the global default.

## 3. Retry policy

- **GET (idempotent) requests** may be retried **once**, only on a
  network-level failure (connection refused, connection timeout) — never on
  an HTTP error response (4xx/5xx body), since that means the service
  answered and retrying won't change the outcome.
- **Mutation requests (POST, PUT, PATCH, DELETE) are never retried
  automatically.** A duplicated mutation (e.g. double-charging, double-created
  resource) is worse than a failed request the client can explicitly resubmit.

Implemented as `withGetRetry` in
`apps/gateway/src/http-proxy.util.ts`: it re-runs the request exactly once
when the rejection carries no Axios `response` (i.e. the call never reached
the service), and rethrows immediately otherwise. Every proxy controller's
GET handlers wrap their call in it; mutation handlers never do — that
omission, not a flag or config check, is what enforces the "mutations are
never retried" rule.

## 4. Correlation ID

Header: **`X-Correlation-Id`**. Implemented in
`apps/gateway/src/correlation-id.middleware.ts`, applied globally via
`app.use(correlationIdMiddleware)` in `main.ts`:

- If the incoming request already carries `X-Correlation-Id`, it's reused.
- Otherwise the gateway mints one (`crypto.randomUUID()`).
- It's echoed back on the response so a client (or a test) can capture it.

Every proxy controller method also declares
`@Headers(CORRELATION_ID_HEADER) correlationId: string` and includes it in
the headers it sends downstream, so the id set (or reused) by the middleware
survives the hop to the service. Each service's own `AllExceptionsFilter`
then picks it back up from that inbound header for its error responses (§7),
rather than minting its own — closing the loop end-to-end.

The 8th proxy path (`system-health`'s `/health/system` aggregator) does not
forward it: those are gateway-initiated probes of each service's `/health`,
not a hop of a client's own request, so there's no client correlation id to
carry through.

## 5. User context

The gateway forwards the client's `Authorization: Bearer <token>` header
as-is; it does not decode the JWT and re-issue a "trusted" identity header.
Each service independently re-verifies the token via the shared
`JwtAuthGuard`/`JwtStrategy` (`libs/common/src/auth/`) and reads the user off
the token's own claims. **No service should ever trust an unsigned identity
header (e.g. `X-User-Id`) from the gateway** — the JWT is the only source of
truth for who the caller is.

## 6. Downstream service unavailable

Handled by `rethrowUpstreamError` (`apps/gateway/src/http-proxy.util.ts`):

- If the downstream service responded with an error (it's up, just returned
  4xx/5xx), the gateway forwards that exact status and body to the client —
  the service's error is authoritative.
- If the call failed before getting a response (connection refused, DNS
  failure, or the timeout above firing), the gateway returns **502 Bad
  Gateway** with the message `"Upstream service unavailable"`.

## 7. Unified API error format

Implemented via `AllExceptionsFilter` (`libs/common/src/errors/`), registered
with `app.useGlobalFilters(new AllExceptionsFilter())` in every service's
`main.ts` (including the gateway). Any thrown exception is normalized to:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email must be a valid email",
    "correlationId": "8a3ffaeb-ddaa-4f51-aeaf-fee37fd4a680",
    "timestamp": "2026-09-08T12:00:00.000Z",
    "path": "/auth/register"
  }
}
```

- **`code`** — `VALIDATION_ERROR` for a 400 whose body is a `class-validator`
  message array (the `ValidationPipe` case); otherwise a status-derived code
  (`NOT_FOUND`, `UNAUTHORIZED`, `CONFLICT`, `INTERNAL_SERVER_ERROR`, ...). An
  unexpected (non-`HttpException`) error always becomes a 500
  `INTERNAL_SERVER_ERROR` with a generic message — the real error is logged
  server-side, never leaked to the client.
- **`message`** — a single string; a `class-validator` array is joined with
  `'; '`.
- **`details`** — optional, present only when the thrown exception's body had
  fields beyond `message`/`statusCode`/`error` (e.g.
  `banner-export-service`'s rate-limit response carries `retryAfterSeconds`
  and `retryAvailableAt`) — those are preserved here instead of being dropped.
- **`correlationId`** — the inbound `X-Correlation-Id` if present, otherwise a
  freshly minted one (see §4 — it isn't forwarded downstream yet, so each
  service still mints its own most of the time).

Two kinds of exception bodies are deliberately **not** wrapped, and are
returned exactly as thrown instead:
- an already-enveloped body (`{ error: { code, message } }`) — happens when
  the gateway's `rethrowUpstreamError` rethrows a downstream service's own
  (already-filtered) error body as-is;
- an "opaque" body with neither `message` nor `error` — the `/health`,
  `/ready`, and `/health/system` controllers return their own documented
  contract (`{ status, checks, ... }`) and aren't errors in this sense.
