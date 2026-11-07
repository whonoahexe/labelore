// 11-29 (D-09, T-11-44): the workstream scope adapter over an in-memory Brinkwater double. A scope reads
// its workstream folder for the moved names, its own files where it has them and the shared root files
// elsewhere; it hides the root's workstreams/ and the root's leftovers of the moved names; it maps a scope
// path back to the real one; and it has no way to write.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { ScopedPlanningFilesystem, isValidScopeName } from '../src/planning-fs/scoped-fs.ts';
import { PathEscapeError } from '../src/planning-fs/types.ts';
import { fromDirectory } from './helpers/from-directory.ts';

const BRINKWATER = fileURLToPath(new URL('./fixtures/brinkwater', import.meta.url)).replace(/[\\/]$/, '');

async function brinkwater(): Promise<InMemoryPlanningFilesystem> {
  return fromDirectory(BRINKWATER);
}

describe('ScopedPlanningFilesystem (11-29)', () => {
  it("reads the workstream copy of a moved name as the scope's own .planning file", async () => {
    const fs = new ScopedPlanningFilesystem(await brinkwater(), 'intake');
    expect((await fs.read('.planning/ROADMAP.md')).content).toContain('# Roadmap: Brinkwater intake');
    expect((await fs.read('.planning/STATE.md')).content).toContain('workstream: intake');
    expect(await fs.exists('.planning/phases/01-sensor-feed/01-01-PLAN.md')).toBe(true);
  });

  it('reads a shared root file from the root', async () => {
    const fs = new ScopedPlanningFilesystem(await brinkwater(), 'intake');
    expect((await fs.read('.planning/PROJECT.md')).content).toContain('Brinkwater');
    expect(await fs.exists('.planning/codebase/STACK.md')).toBe(true);
  });

  it("prefers the workstream folder's own file over the root's (the ledger's config.json)", async () => {
    const parent = await brinkwater();
    const ledger = new ScopedPlanningFilesystem(parent, 'ledger');
    const intake = new ScopedPlanningFilesystem(parent, 'intake');
    expect((await ledger.read('.planning/config.json')).content).toContain('"granularity": "fine"');
    expect((await intake.read('.planning/config.json')).content).toBe((await parent.read('.planning/config.json')).content);
  });

  it('lists .planning/ without the root workstreams/ folder and without the root copies of the moved names', async () => {
    const parent = new InMemoryPlanningFilesystem({
      '.planning/ROADMAP.md': 'root roadmap',
      '.planning/STATE.md': 'root state',
      '.planning/PROJECT.md': 'project',
      '.planning/phases/01-root/01-01-PLAN.md': 'root plan',
      '.planning/workstreams/a/ROADMAP.md': 'a roadmap',
      '.planning/workstreams/a/STATE.md': 'a state',
    });
    const fs = new ScopedPlanningFilesystem(parent, 'a');
    const names = (await fs.list('.planning')).map((entry) => entry.name).sort();
    expect(names).toEqual(['PROJECT.md', 'ROADMAP.md', 'STATE.md']);
    expect((await fs.read('.planning/ROADMAP.md')).content).toBe('a roadmap');
    // The root's phases/ is a leftover of a moved name: invisible in the scope, which has none of its own.
    expect(await fs.exists('.planning/phases')).toBe(false);
    await expect(fs.read('.planning/phases/01-root/01-01-PLAN.md')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('lists the real Brinkwater intake scope: its own files over the shared ones', async () => {
    const fs = new ScopedPlanningFilesystem(await brinkwater(), 'intake');
    const names = (await fs.list('.planning')).map((entry) => entry.name);
    expect(names).toContain('ROADMAP.md');
    expect(names).toContain('STATE.md');
    expect(names).toContain('REQUIREMENTS.md');
    expect(names).toContain('phases');
    expect(names).toContain('PROJECT.md');
    expect(names).toContain('codebase');
    expect(names).not.toContain('workstreams');
    const phases = (await fs.list('.planning/phases')).map((entry) => entry.name).sort();
    expect(phases).toEqual(['01-sensor-feed', '02-feed-alerts']);
  });

  it('hides the root workstreams/ folder from reads, listing and existence', async () => {
    const fs = new ScopedPlanningFilesystem(await brinkwater(), 'intake');
    expect(await fs.exists('.planning/workstreams')).toBe(false);
    expect(await fs.exists('.planning/workstreams/ledger/STATE.md')).toBe(false);
    await expect(fs.list('.planning/workstreams')).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.read('.planning/workstreams/ledger/STATE.md')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('maps a scope path back to the real one with realPathOf', async () => {
    const parent = await brinkwater();
    const fs = new ScopedPlanningFilesystem(parent, 'ledger');
    await fs.list('.planning');
    expect(fs.realPathOf('.planning/ROADMAP.md')).toBe('.planning/workstreams/ledger/ROADMAP.md');
    expect(fs.realPathOf('.planning/phases/04-tide-tables/04-01-SUMMARY.md')).toBe(
      '.planning/workstreams/ledger/phases/04-tide-tables/04-01-SUMMARY.md',
    );
    expect(fs.realPathOf('.planning/config.json')).toBe('.planning/workstreams/ledger/config.json');
    expect(fs.realPathOf('.planning/PROJECT.md')).toBe('.planning/PROJECT.md');
    const intake = new ScopedPlanningFilesystem(parent, 'intake');
    await intake.list('.planning');
    expect(intake.realPathOf('.planning/config.json')).toBe('.planning/config.json');
    // A path outside .planning/ is its own real path.
    expect(intake.realPathOf('src/app.css')).toBe('src/app.css');
  });

  it('has no write or watch member, and reports neither capability', async () => {
    const fs = new ScopedPlanningFilesystem(await brinkwater(), 'intake');
    expect(fs.capabilities).toEqual({ watch: false, write: false });
    expect('write' in fs).toBe(false);
    expect('watch' in fs).toBe(false);
  });

  it('keeps the base-directory confinement of the byte reads and the head read', async () => {
    const parent = new InMemoryPlanningFilesystem({
      '.planning/workstreams/a/ROADMAP.md': '# Roadmap',
      '.planning/sketches/one/a.png': new Uint8Array([1, 2, 3]),
      '.planning/PROJECT.md': 'project',
    });
    const fs = new ScopedPlanningFilesystem(parent, 'a');
    const bytes = await fs.readBytesWithin!('.planning/sketches', '.planning/sketches/one/a.png');
    expect(Array.from(bytes.bytes)).toEqual([1, 2, 3]);
    await expect(fs.readBytesWithin!('.planning/sketches', '.planning/PROJECT.md')).rejects.toBeInstanceOf(PathEscapeError);
    expect(new TextDecoder().decode(await fs.readHead!('.planning/ROADMAP.md', 4))).toBe('# Ro');
  });

  it('refuses a path that climbs, and a name that is not a workstream name', async () => {
    const parent = await brinkwater();
    const fs = new ScopedPlanningFilesystem(parent, 'intake');
    await expect(fs.read('.planning/../../etc/passwd')).rejects.toBeInstanceOf(PathEscapeError);
    await expect(fs.read('.planning/phases/../../workstreams/ledger/STATE.md')).rejects.toBeInstanceOf(PathEscapeError);
    for (const bad of ['', '.', '..', 'a/b', '%2e%2e', 'none', '../x', 'a b']) {
      expect(() => new ScopedPlanningFilesystem(parent, bad)).toThrow();
    }
    expect(isValidScopeName('v1.1')).toBe(true);
  });

  it('does not change the parent: a scope reads and never mutates it', async () => {
    const parent = await brinkwater();
    const before = await parent.list('.planning');
    const fs = new ScopedPlanningFilesystem(parent, 'notices');
    await fs.list('.planning');
    await fs.read('.planning/STATE.md');
    expect(await parent.list('.planning')).toEqual(before);
  });
});
