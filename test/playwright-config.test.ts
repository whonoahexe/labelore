// The Playwright config is the browser layer's fail-loud seam (D-01, D-05, TEST-04): the fixture servers on
// 4198, 4197 and 4196 are unconditional, the config throws at load when a fixture tree is missing, and no
// home-directory route to another project exists. The missing-tree case uses a mkdtemp folder, never the repository.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import config from '../playwright.config.ts';
import {
  FIXTURE_BASE_URL,
  FIXTURE_PORT,
  FIXTURE_ROOT,
  SHAPES_BASE_URL,
  SHAPES_BUILT_BASE_URL,
  SHAPES_BUILT_PORT,
  SHAPES_FIXTURE_ROOT,
  SHAPES_PORT,
  resolveFixtureRoot,
} from './e2e/fixture-root.ts';

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

  it('returns the in-repo Shapes root and its two ports when it is present', () => {
    expect(resolveFixtureRoot(SHAPES_FIXTURE_ROOT)).toBe(SHAPES_FIXTURE_ROOT);
    expect(SHAPES_PORT).toBe(4197);
    expect(SHAPES_BASE_URL).toBe('http://127.0.0.1:4197');
    expect(SHAPES_BUILT_PORT).toBe(4196);
    expect(SHAPES_BUILT_BASE_URL).toBe('http://127.0.0.1:4196');
  });
});

describe('playwright.config.ts webServer shape', () => {
  const servers = (Array.isArray(config.webServer) ? config.webServer : [config.webServer]).filter(
    (entry) => entry !== undefined,
  );

  it('has exactly four entries, on ports 4199, 4198, 4197 and 4196, in that order', () => {
    expect(servers).toHaveLength(4);
    expect(servers[0].command).toContain('--port 4199');
    expect(servers[1].command).toContain('--port 4198');
    expect(servers[2].command).toContain('--port 4197');
    expect(servers[3].command).toContain('--port 4196');
  });

  it('never reuses an existing server on any port', () => {
    for (const entry of servers) expect(entry.reuseExistingServer).toBe(false);
  });

  it('points the 4198 server at the Lendshed fixture root', () => {
    expect(servers[1].command).toContain(FIXTURE_ROOT);
    expect(servers[1].url).toBe('http://127.0.0.1:4198/api/dashboard');
  });

  it('points the 4197 server at the Shapes root through the development server, without a build', () => {
    expect(servers[2].command).toContain(SHAPES_FIXTURE_ROOT);
    expect(servers[2].command).not.toContain('npm run build');
    expect(servers[2].url).toBe('http://127.0.0.1:4197/api/dashboard');
  });

  it('builds first and then starts the built app on the Shapes root for 4196', () => {
    expect(servers[3].command?.startsWith('npm run build && npm start -- ')).toBe(true);
    expect(servers[3].command).toContain(SHAPES_FIXTURE_ROOT);
    expect(servers[3].url).toBe('http://127.0.0.1:4196/api/dashboard');
    expect(servers[3].timeout).toBe(180_000);
  });
});
