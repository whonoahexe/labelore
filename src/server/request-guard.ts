// The request guard in front of every /api route (SEC-05, D-18, D-20).
//
// Two checks, in this order:
//   1. Host allowlist, on EVERY request, GETs included. A DNS-rebinding page reaches 127.0.0.1 under
//      its own host name, so it can read every project unless the Host header is checked. The Host
//      check runs first because c.req.url is built from the Host header: an attacker who controls the
//      Host controls both sides of an Origin-versus-url comparison, so Origin is only ever compared
//      with a Host that already passed the allowlist.
//   2. For every method other than GET and HEAD: proof of same origin (Sec-Fetch-Site same-origin, or,
//      when that header is absent, an Origin whose host equals the Host header) and a JSON content
//      type, which a cross-site HTML form cannot send without a preflight.
//
// No Access-Control-* header is ever set: the API is same-origin only. Hono's bundled CSRF middleware
// is not used: it inspects form content types only and does no Host check.
//
// LABELORE_ALLOWED_HOSTS (D-20) is an opt-in, comma-separated list of exact hosts or host:port values
// for a tunnel or reverse proxy. It is empty by default and never accepts a wildcard.
import type { MiddlewareHandler } from 'hono';

/** The most bytes a request body on /api may hold (research A10). Reversible: change this constant. */
export const GUARD_BODY_LIMIT = 4096;

export interface HostPolicy {
  /** Called once the server is listening; until then every request is refused. */
  setPort(port: number): void;
  port(): number | null;
  allows(host: string | undefined): boolean;
}

/** Splits LABELORE_ALLOWED_HOSTS: trimmed, lower-cased, empties dropped, and any entry holding
 * whitespace, '/', '@' or '*' dropped so no wildcard or URL-shaped value can widen the allowlist. */
export function parseAllowedHosts(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '' && !/[\s/@*]/.test(entry));
}

export function createHostPolicy(
  extraHosts: readonly string[] = parseAllowedHosts(process.env.LABELORE_ALLOWED_HOSTS),
): HostPolicy {
  let port: number | null = null;
  const extras = new Set(extraHosts.map((entry) => entry.toLowerCase()));
  return {
    setPort(next) {
      port = next;
    },
    port() {
      return port;
    },
    allows(host) {
      if (host === undefined || host === '' || port === null) return false;
      const value = host.toLowerCase();
      if (value === `127.0.0.1:${port}` || value === `localhost:${port}`) return true;
      return extras.has(value);
    },
  };
}

function isMutating(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

/** The host of an Origin header, lower-cased; null for the literal "null" or anything unparsable. */
function originHost(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

export function createRequestGuard(policy: HostPolicy): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header('host');
    if (!policy.allows(host)) return c.json({ error: 'refused', reason: 'host' }, 403);

    if (isMutating(c.req.method)) {
      const site = c.req.header('sec-fetch-site');
      const origin = c.req.header('origin');
      // Sec-Fetch-Site, when present, is authoritative; otherwise Origin must name the Host it was sent to.
      const sameOrigin =
        site !== undefined
          ? site === 'same-origin'
          : origin !== undefined && originHost(origin) !== null && originHost(origin) === host?.toLowerCase();
      if (!sameOrigin) return c.json({ error: 'refused', reason: 'cross-site' }, 403);
      if (!/^application\/json\b/i.test(c.req.header('content-type') ?? '')) {
        return c.json({ error: 'refused', reason: 'content-type' }, 415);
      }
    }

    await next();
  };
}
