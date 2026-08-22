import { describe, it, expect } from 'vitest';
import { discover } from '../src/planning-repo/discovery.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';

function fsFrom(contents: Record<string, string>): InMemoryPlanningFilesystem {
  return new InMemoryPlanningFilesystem(contents);
}

describe('discover — position-aware classification', () => {
  it('classifies a root file with location root and no owning identity', async () => {
    const fs = fsFrom({ '.planning/STATE.md': '# state' });
    const { refs } = await discover(fs);
    expect(refs).toEqual([
      {
        path: '.planning/STATE.md',
        kind: 'state',
        location: 'root',
        phaseIdentity: null,
        milestoneVersion: null,
        quickTaskId: null,
      },
    ]);
  });

  it('classifies a live phase file with a resolved phaseIdentity and null milestoneVersion', async () => {
    const fs = fsFrom({ '.planning/phases/01-foundation/01-01-PLAN.md': '# plan' });
    const { refs } = await discover(fs);
    expect(refs).toHaveLength(1);
    expect(refs[0].location).toBe('phase');
    expect(refs[0].kind).toBe('plan');
    expect(refs[0].phaseIdentity).toEqual({ milestoneVersion: null, number: '01', projectCode: null, slug: 'foundation' });
    expect(refs[0].milestoneVersion).toBeNull();
  });

  it('classifies an archived phase file with milestoneVersion resolved from the vX.Y-phases/ dirname', async () => {
    const fs = fsFrom({ '.planning/milestones/v1.0-phases/01-identity/01-01-SUMMARY.md': '# summary' });
    const { refs } = await discover(fs);
    expect(refs).toHaveLength(1);
    expect(refs[0].location).toBe('archived-phase');
    expect(refs[0].milestoneVersion).toBe('v1.0');
    expect(refs[0].phaseIdentity).toEqual({ milestoneVersion: 'v1.0', number: '01', projectCode: null, slug: 'identity' });
  });

  it('a live phase 01 and an archived phase 01 under a different milestone stay distinguishable by phaseIdentity.milestoneVersion', async () => {
    const fs = fsFrom({
      '.planning/phases/01-foundation/01-CONTEXT.md': '# ctx',
      '.planning/milestones/v1.0-phases/01-identity/01-CONTEXT.md': '# ctx',
    });
    const { refs } = await discover(fs);
    const live = refs.find((r) => r.location === 'phase');
    const archived = refs.find((r) => r.location === 'archived-phase');
    expect(live?.phaseIdentity?.milestoneVersion).toBeNull();
    expect(archived?.phaseIdentity?.milestoneVersion).toBe('v1.0');
  });

  it('classifies a quick-task file with its quickTaskId derived from the directory name', async () => {
    const fs = fsFrom({ '.planning/quick/260726-unp-add-a-toggle/260726-unp-PLAN.md': '# plan' });
    const { refs } = await discover(fs);
    expect(refs[0].location).toBe('quick');
    expect(refs[0].quickTaskId).toBe('260726-unp');
  });

  it('classifies a milestone-root file with milestoneVersion resolved from its own filename', async () => {
    const fs = fsFrom({ '.planning/milestones/v1.0-ROADMAP.md': '# roadmap' });
    const { refs } = await discover(fs);
    expect(refs[0].location).toBe('milestone-root');
    expect(refs[0].milestoneVersion).toBe('v1.0');
  });

  it('classifies a research file with location research', async () => {
    const fs = fsFrom({ '.planning/research/GSD-DOMAIN.md': '# research' });
    const { refs } = await discover(fs);
    expect(refs[0].location).toBe('research');
  });

  it('classifies a file under an unrecognized top-level directory as location other, with no owning phase', async () => {
    const fs = fsFrom({ '.planning/spikes/idea.md': '# idea' });
    const { refs } = await discover(fs);
    expect(refs[0].location).toBe('other');
    expect(refs[0].phaseIdentity).toBeNull();
  });

  it('still discovers files inside a subdirectory whose name does not match the phase grammar', async () => {
    const fs = fsFrom({ '.planning/phases/not-a-phase-dir/notes.md': '# notes' });
    const { refs } = await discover(fs);
    expect(refs).toHaveLength(1);
    expect(refs[0].location).toBe('phase');
    expect(refs[0].phaseIdentity).toBeNull();
  });
});

describe('discover — exclusions', () => {
  it('excludes research/.cache/ with a non-empty reason and keeps it out of the ref list', async () => {
    const fs = fsFrom({
      '.planning/research/.cache/x.json': '{}',
      '.planning/research/GSD-DOMAIN.md': '# research',
    });
    const { refs, exclusions } = await discover(fs);
    expect(refs.map((r) => r.path)).not.toContain('.planning/research/.cache/x.json');
    const excluded = exclusions.find((e) => e.path.includes('research/.cache'));
    expect(excluded).toBeDefined();
    expect(excluded?.reason.length).toBeGreaterThan(0);
  });

  it('terminates a runaway-depth walk (simulating a symlink cycle) and records the truncation point as an exclusion', async () => {
    // InMemoryPlanningFilesystem cannot model a real symlink, so a pathological/cyclic tree is
    // simulated the way the walker itself guards against one: a nesting depth beyond
    // MAX_WALK_DEPTH. This proves the walk terminates and the truncation is visible rather than
    // looping or silently vanishing.
    const deepSegments = Array.from({ length: 80 }, (_, i) => `d${i}`).join('/');
    const fs = fsFrom({ [`.planning/${deepSegments}/file.md`]: '# deep' });
    const { exclusions } = await discover(fs);
    expect(exclusions.length).toBeGreaterThan(0);
    expect(exclusions.some((e) => e.reason.toLowerCase().includes('depth'))).toBe(true);
  });
});

describe('discover — empty input', () => {
  it('returns an empty ref list and an empty exclusion list for an empty .planning/', async () => {
    const fs = fsFrom({});
    const { refs, exclusions } = await discover(fs);
    expect(refs).toEqual([]);
    expect(exclusions).toEqual([]);
  });
});

describe('discover — deterministic ordering', () => {
  it('returns identically-ordered ref arrays regardless of the backing record key order', async () => {
    const contentsForward: Record<string, string> = {
      '.planning/STATE.md': 'a',
      '.planning/PROJECT.md': 'b',
      '.planning/phases/02-second/02-01-PLAN.md': 'c',
      '.planning/phases/01-first/01-01-PLAN.md': 'd',
    };
    const contentsReversed: Record<string, string> = Object.fromEntries(Object.entries(contentsForward).reverse());

    const fsA = fsFrom(contentsForward);
    const fsB = fsFrom(contentsReversed);

    const resultA = await discover(fsA);
    const resultB = await discover(fsB);

    expect(resultA.refs.map((r) => r.path)).toEqual(resultB.refs.map((r) => r.path));
  });

  it('orders phase directories by dotted-numeric phase number, not lexicographically', async () => {
    const fs = fsFrom({
      '.planning/phases/10-tenth/10-CONTEXT.md': 'a',
      '.planning/phases/2-second/2-CONTEXT.md': 'b',
      '.planning/phases/2.1-urgent/2.1-CONTEXT.md': 'c',
    });
    const { refs } = await discover(fs);
    expect(refs.map((r) => r.phaseIdentity?.number)).toEqual(['2', '2.1', '10']);
  });
});
