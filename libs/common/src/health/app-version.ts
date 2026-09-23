import { readFileSync } from 'fs';
import { join } from 'path';

let cachedVersion: string | undefined;

/**
 * Reads `version` from the repo-root package.json. Cwd is the repo root in
 * dev (npm scripts) and `/usr/src/app` in the runtime Docker image, where the
 * Dockerfile copies package.json alongside dist/.
 */
export function getAppVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const version =
      typeof parsed === 'object' && parsed !== null && 'version' in parsed
        ? (parsed as { version?: unknown }).version
        : undefined;
    cachedVersion =
      typeof version === 'string' && version.length > 0 ? version : '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}
