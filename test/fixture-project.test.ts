// The Lendshed loader fails loudly (D-01, D-05, TEST-02): a missing file or a missing tree throws, never
// skips, and the real fixture loads through the same repository the server uses. The missing-tree case
// plants an empty folder in a mkdtemp directory, never inside the repository.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FX_PLANNING, FX_ROOT, fxPath, fxRead, loadFixtureProject, planningFiles } from './helpers/fixture-project.ts';

describe('Lendshed fixture loader', () => {
  let scratch: string | undefined;

  afterEach(async () => {
    if (scratch) await rm(scratch, { recursive: true, force: true });
    scratch = undefined;
  });

  it('points at the in-repo Lendshed project with no trailing slash', () => {
    expect(FX_ROOT.endsWith('/test/fixtures/lendshed')).toBe(true);
    expect(FX_PLANNING).toBe(`${FX_ROOT}/.planning`);
  });

  it('fxPath throws on a file the fixture does not hold', () => {
    expect(() => fxPath('no/such/file.md')).toThrow('Lendshed fixture file missing');
  });

  it('fxPath and fxRead resolve a file the fixture holds', () => {
    expect(fxPath('PROJECT.md')).toBe(`${FX_PLANNING}/PROJECT.md`);
    expect(fxRead('PROJECT.md').startsWith('# Lendshed')).toBe(true);
  });

  it('planningFiles throws on a root without a .planning folder', async () => {
    scratch = await mkdtemp(join(tmpdir(), 'labelore-fixture-project-'));
    expect(() => planningFiles(scratch as string)).toThrow();
  });

  it('planningFiles lists the Lendshed files keyed by project-relative path', () => {
    const files = planningFiles(FX_ROOT);
    expect(Object.keys(files)).toContain('.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md');
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(9);
  });

  it('loadFixtureProject returns a presentation holding the phase 01 CONTEXT', async () => {
    const project = await loadFixtureProject();
    const paths = project.presentation.artifacts.map((artifact) => artifact.path);
    expect(paths).toContain('.planning/phases/01-member-sign-in-sessions/01-CONTEXT.md');
  });
});
