// The request guard (SEC-05, D-18, D-20) over a toy app: the Host allowlist, LABELORE_ALLOWED_HOSTS
// parsing, the same-origin and content-type requirements on a mutation, and the body limit. The guard
// is registered exactly as registry-api.ts registers it (guard first, then the body limit), so what is
// proven here is what runs in front of the real routes; registry-api.test.ts proves it for every one.
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { describe, expect, it } from 'vitest';
import { GUARD_BODY_LIMIT, createHostPolicy, createRequestGuard, parseAllowedHosts } from '../../src/server/request-guard.ts';
import { TEST_PORT, guardedRequest } from '../helpers/guarded-request.ts';

function toyApp(extraHosts: readonly string[] = [], listening = true) {
  const policy = createHostPolicy(extraHosts);
  if (listening) policy.setPort(TEST_PORT);
  const app = new Hono();
  app.use('/api/*', createRequestGuard(policy));
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: GUARD_BODY_LIMIT,
      onError: (c) => c.json({ error: 'That request was too large for Labelore to read.' }, 413),
    }),
  );
  app.get('/api/x', (c) => c.json({ ok: true }));
  app.post('/api/x', async (c) => c.json({ ok: true, bytes: (await c.req.text()).length }));
  return { app, policy };
}

async function status(app: Hono, init: RequestInit): Promise<number> {
  return (await app.request('/api/x', init)).status;
}

describe('the Host allowlist', () => {
  const cases: [string, string | undefined, number][] = [
    ['an absent Host', undefined, 403],
    ['127.0.0.1 on the listening port', `127.0.0.1:${TEST_PORT}`, 200],
    ['localhost on the listening port, any case', `LOCALHOST:${TEST_PORT}`, 200],
    ['127.0.0.1 on another port', `127.0.0.1:${TEST_PORT + 1}`, 403],
    ['a foreign name on the listening port', `evil.example:${TEST_PORT}`, 403],
    ['the IPv6 loopback', `[::1]:${TEST_PORT}`, 403],
    ['127.0.0.1 without a port', '127.0.0.1', 403],
  ];

  it.each(cases)('decides %s', async (_label, host, expected) => {
    const { app } = toyApp();
    const response = await app.request('/api/x', host === undefined ? {} : { headers: { Host: host } });
    expect(response.status).toBe(expected);
    if (expected === 403) expect(await response.json()).toEqual({ error: 'refused', reason: 'host' });
  });

  it('refuses every request before the port is set', async () => {
    const { app, policy } = toyApp([], false);
    expect(policy.port()).toBeNull();
    expect((await guardedRequest(app, '/api/x')).status).toBe(403);
    policy.setPort(TEST_PORT);
    expect(policy.port()).toBe(TEST_PORT);
    expect((await guardedRequest(app, '/api/x')).status).toBe(200);
  });

  it('refuses a foreign Host on a GET and on a HEAD, so a rebinding page cannot read', async () => {
    const { app } = toyApp();
    const headers = { Host: 'evil.example:4321' };
    expect(await status(app, { headers })).toBe(403);
    expect(await status(app, { method: 'HEAD', headers })).toBe(403);
  });
});

describe('LABELORE_ALLOWED_HOSTS', () => {
  it('keeps exact lower-cased hosts and drops empty, spaced, slashed, @ and wildcard entries', () => {
    expect(parseAllowedHosts(' Labelore.Example.Test , ,a/b,*.x,u@h ')).toEqual(['labelore.example.test']);
    expect(parseAllowedHosts('a b,labelore.test:8443,')).toEqual(['labelore.test:8443']);
  });

  it('is empty when the value is unset or empty', () => {
    expect(parseAllowedHosts(undefined)).toEqual([]);
    expect(parseAllowedHosts('')).toEqual([]);
  });

  it('allows an extra host exactly, in any case, and still refuses others', async () => {
    const { app } = toyApp(parseAllowedHosts(' Labelore.Example.Test , ,a/b,*.x,u@h '));
    expect(await status(app, { headers: { Host: 'labelore.example.test' } })).toBe(200);
    expect(await status(app, { headers: { Host: 'LABELORE.EXAMPLE.TEST' } })).toBe(200);
    expect(await status(app, { headers: { Host: 'evil.example.test' } })).toBe(403);
    expect(await status(app, { headers: { Host: 'sub.labelore.example.test' } })).toBe(403);
    expect(await status(app, { headers: { Host: 'x.x' } })).toBe(403);
  });

  it('keeps the loopback hosts allowed beside the extras', async () => {
    const { app } = toyApp(['labelore.example.test']);
    expect(await status(app, { headers: { Host: `127.0.0.1:${TEST_PORT}` } })).toBe(200);
  });
});

describe('a mutating request', () => {
  const host = `127.0.0.1:${TEST_PORT}`;
  const json = { 'Content-Type': 'application/json' };
  const post = (headers: Record<string, string>) => status(toyApp().app, { method: 'POST', body: '{}', headers: { Host: host, ...headers } });

  it('passes with same-origin proof and JSON', async () => {
    expect(await post({ 'Sec-Fetch-Site': 'same-origin', ...json })).toBe(200);
  });

  it('passes with a JSON content type that carries a charset', async () => {
    expect(await post({ 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json; charset=utf-8' })).toBe(200);
  });

  it.each(['cross-site', 'same-site', 'none'])('refuses Sec-Fetch-Site %s with 403', async (site) => {
    expect(await post({ 'Sec-Fetch-Site': site, ...json })).toBe(403);
  });

  it('refuses a cross-site Sec-Fetch-Site even when Origin names the Host', async () => {
    expect(await post({ 'Sec-Fetch-Site': 'cross-site', Origin: `http://${host}`, ...json })).toBe(403);
  });

  it('falls back to Origin when Sec-Fetch-Site is absent', async () => {
    expect(await post({ Origin: `http://${host}`, ...json })).toBe(200);
    expect(await post({ Origin: 'null', ...json })).toBe(403);
    expect(await post({ Origin: 'http://evil.example', ...json })).toBe(403);
    expect(await post({ Origin: 'not a url', ...json })).toBe(403);
  });

  it('refuses a request with no proof at all', async () => {
    expect(await post({ ...json })).toBe(403);
  });

  it('refuses a non-JSON content type with 415, after proof of same origin', async () => {
    const { app } = toyApp();
    const wrong = await app.request('/api/x', {
      method: 'POST',
      body: 'a=b',
      headers: { Host: host, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'text/plain' },
    });
    expect(wrong.status).toBe(415);
    expect(await wrong.json()).toEqual({ error: 'refused', reason: 'content-type' });
    // No body means fetch adds no Content-Type of its own, so this request has none.
    const none = await app.request('/api/x', {
      method: 'POST',
      headers: { Host: host, 'Sec-Fetch-Site': 'same-origin' },
    });
    expect(none.status).toBe(415);
  });

  it('refuses a cross-site request with 403 before it looks at the content type', async () => {
    expect(await post({ 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'text/plain' })).toBe(403);
  });

  it('treats HEAD as a read: no proof and no content type are needed', async () => {
    const { app } = toyApp();
    expect(await status(app, { method: 'HEAD', headers: { Host: host } })).toBe(200);
  });
});

describe('what a refusal and an answer carry', () => {
  it('sets no Access-Control header on a refusal, a pass or a too-large answer', async () => {
    const { app } = toyApp();
    const answers = [
      await app.request('/api/x', { headers: { Host: 'evil.example:4321' } }),
      await guardedRequest(app, '/api/x'),
      await guardedRequest(app, '/api/x', { method: 'POST', body: 'x'.repeat(GUARD_BODY_LIMIT + 1) }),
      await guardedRequest(app, '/api/x', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } }),
    ];
    for (const response of answers) {
      expect([...response.headers.keys()].filter((name) => name.startsWith('access-control-'))).toEqual([]);
    }
  });

  it('answers a 5000-byte JSON body with 413 and the too-large copy, and a small one normally', async () => {
    const { app } = toyApp();
    const big = JSON.stringify({ text: 'x'.repeat(5000) });
    expect(big.length).toBeGreaterThan(5000);
    const refused = await guardedRequest(app, '/api/x', { method: 'POST', body: big });
    expect(refused.status).toBe(413);
    expect(await refused.json()).toEqual({ error: 'That request was too large for Labelore to read.' });

    const fine = await guardedRequest(app, '/api/x', { method: 'POST', body: JSON.stringify({ text: 'small' }) });
    expect(fine.status).toBe(200);
  });

  it('refuses a request from a foreign Host before reading its body', async () => {
    const { app } = toyApp();
    const response = await app.request('/api/x', {
      method: 'POST',
      body: 'x'.repeat(GUARD_BODY_LIMIT + 1),
      headers: { Host: 'evil.example:4321', 'Content-Type': 'application/json' },
    });
    expect(response.status).toBe(403);
  });
});
