// GET /api/identity (LNCH-03, server half): the marker a launcher reads to tell its own server from any
// other process on a port. It reports exactly { app, version, instanceId, pid }, the instanceId only when
// the launcher passed a well-formed LABELORE_INSTANCE_ID, and it sits behind the same Host guard as every
// other /api route.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INSTANCE_ID_MAX, SERVER_VERSION, serverIdentity } from '../../src/server/identity.ts';
import { ProjectRegistry } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import { TEST_PORT, guardedRequest, testPolicy } from '../helpers/guarded-request.ts';

const PACKAGE_VERSION = (
  JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }
).version;
const UUID = '3f1c6d52-8a4e-4f0b-9a57-0b6f5d2c9e11';

function makeApp() {
  return createRegistryApp(new ProjectRegistry(), { policy: testPolicy(), production: false });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/identity', () => {
  it('answers exactly app, version, instanceId and pid', async () => {
    vi.stubEnv('LABELORE_INSTANCE_ID', '');
    const response = await guardedRequest(makeApp(), '/api/identity');
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['app', 'instanceId', 'pid', 'version']);
    expect(body.app).toBe('labelore');
    expect(body.version).toBe(PACKAGE_VERSION);
    expect(body.pid).toBe(process.pid);
  });

  it('reports the instance id the server was started with', async () => {
    vi.stubEnv('LABELORE_INSTANCE_ID', UUID);
    const body = (await (await guardedRequest(makeApp(), '/api/identity')).json()) as { instanceId: unknown };
    expect(body.instanceId).toBe(UUID);
  });

  it('reports a null instance id when none was passed', async () => {
    vi.stubEnv('LABELORE_INSTANCE_ID', undefined);
    const body = (await (await guardedRequest(makeApp(), '/api/identity')).json()) as { instanceId: unknown };
    expect(body.instanceId).toBeNull();
  });

  it('refuses a foreign Host the way every other /api route does', async () => {
    const app = makeApp();
    const refused = await guardedRequest(app, '/api/identity', { headers: { Host: `evil.example:${TEST_PORT}` } });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({ error: 'refused', reason: 'host' });
    const listing = await guardedRequest(app, '/api/projects', { headers: { Host: `evil.example:${TEST_PORT}` } });
    expect(listing.status).toBe(refused.status);
  });
});

describe('serverIdentity', () => {
  it('reports the package version and this process', () => {
    const identity = serverIdentity({});
    expect(SERVER_VERSION).toBe(PACKAGE_VERSION);
    expect(identity).toEqual({ app: 'labelore', version: PACKAGE_VERSION, instanceId: null, pid: process.pid });
  });

  it('passes a well-formed instance id through', () => {
    expect(serverIdentity({ LABELORE_INSTANCE_ID: UUID }).instanceId).toBe(UUID);
    expect(serverIdentity({ LABELORE_INSTANCE_ID: 'a'.repeat(INSTANCE_ID_MAX) }).instanceId).toBe(
      'a'.repeat(INSTANCE_ID_MAX),
    );
  });

  it.each([
    ['an empty string', ''],
    ['a string over the limit', 'a'.repeat(INSTANCE_ID_MAX + 1)],
    ['a string with a space', 'abc def'],
    ['a string with a path separator', '../etc'],
    ['a string with a newline', 'abc\ndef'],
  ])('reports null for %s', (_name, value) => {
    expect(serverIdentity({ LABELORE_INSTANCE_ID: value }).instanceId).toBeNull();
  });
});
