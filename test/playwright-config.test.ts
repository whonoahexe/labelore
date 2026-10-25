// The Playwright config is the browser layer's fail-loud seam (D-01, D-05, TEST-04): the fixture server on
// 4198 is unconditional, the config throws at load when the fixture tree is missing, and no home-directory
// route to another project exists. The missing-tree case uses a mkdtemp folder, never the repository.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import config from '../playwright.config.ts';
import { FIXTURE_BASE_URL, FIXTURE_PORT, FIXTURE_ROOT, resolveFixtureRoot } from './e2e/fixture-root.ts';

describe('fixture root resolution', () => {
  let scratch: string | undefined;

  afterEach(async () => {
    if (scratch) await rm(scratch, { recursive: true, force: true });
    scratch = undefined;
  });

  it('throws when the folder has no .planning directory', async () => {
    scratch = await mkdtemp(join(tmpdir(), 'labelore-fixture-root-'));
    expect(() => resolveFixtureRoot(scratch)).toThrow('it is missing');
  });

  it('returns the in-repo Lendshed root when it is present', () => {
    expect(resolveFixtureRoot(FIXTURE_ROOT)).toBe(FIXTURE_ROOT);
    expect(FIXTURE_PORT).toBe(4198);
    expect(FIXTURE_BASE_URL).toBe('http://127.0.0.1:4198');
  });
});

describe('playwright.config.ts webServer shape', () => {
  const servers = (Array.isArray(config.webServer) ? config.webServer : [config.webServer]).filter(
    (entry) => entry !== undefined,
  );

  it('has exactly two entries, on ports 4199 and 4198, in that order', () => {
    expect(servers).toHaveLength(2);
    expect(servers[0].command).toContain('--port 4199');
    expect(servers[1].command).toContain('--port 4198');
  });

  it('never reuses an existing server on either port', () => {
    for (const entry of servers) expect(entry.reuseExistingServer).toBe(false);
  });

  it('points the 4198 server at the Lendshed fixture root', () => {
    expect(servers[1].command).toContain(FIXTURE_ROOT);
    expect(servers[1].url).toBe('http://127.0.0.1:4198/api/dashboard');
  });
});
