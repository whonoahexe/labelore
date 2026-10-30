// Requests that pass the registry app's request guard (SEC-05): the Host the server listens on and,
// for a write, same-origin proof and a JSON content type. app.request sends no Host header of its own
// (Hono builds the URL from http://localhost), so every test that drives createRegistryApp goes
// through here. Build the policy with createHostPolicy([]) and call policy.setPort(TEST_PORT).
import { createHostPolicy } from '../../src/server/request-guard.ts';
import type { HostPolicy } from '../../src/server/request-guard.ts';

export const TEST_PORT = 4321;

/** A policy already listening on TEST_PORT, with no extra hosts (the environment is not read). */
export function testPolicy(): HostPolicy {
  const policy = createHostPolicy([]);
  policy.setPort(TEST_PORT);
  return policy;
}

export function guardedHeaders(
  kind: 'read' | 'write',
  overrides: Record<string, string> = {},
): Record<string, string> {
  const base: Record<string, string> = { Host: `127.0.0.1:${TEST_PORT}` };
  if (kind === 'write') {
    base['Sec-Fetch-Site'] = 'same-origin';
    base['Content-Type'] = 'application/json';
  }
  return { ...base, ...overrides };
}

interface RequestableApp {
  request: (input: string, init?: RequestInit) => Response | Promise<Response>;
}

/** Sends `path` with the guarded headers; a non-GET, non-HEAD request gets the write headers and a
 * '{}' body unless the caller supplied one. Headers in `init` override the guarded ones. */
export async function guardedRequest(app: RequestableApp, path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const write = method !== 'GET' && method !== 'HEAD';
  // A Headers object, so a caller's lower-case name replaces the guarded default instead of joining it.
  const headers = new Headers(guardedHeaders(write ? 'write' : 'read'));
  new Headers(init.headers).forEach((value, name) => headers.set(name, value));
  const body = write && init.body === undefined ? '{}' : init.body;
  return app.request(path, { ...init, method, headers, ...(body === undefined ? {} : { body }) });
}
