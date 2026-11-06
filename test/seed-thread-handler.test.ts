// Phase 11 (11-20, VIEW-15, VIEW-16, D-02): the seed and thread handlers. A seed lifts to its idea, trigger as
// written, scope, status and sections with the writer's placeholder text read as "not stated"; a thread lifts to
// its status, goal, references and next steps in the author's order. Over the Lendshed and Shapes fixtures
// through the real repository, plus the files exactly as plant-seed and thread write them before any enrich.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { SeedHandler, ThreadHandler } from '../src/planning-repo/handlers/seed-thread.ts';
import {
  LIFT_LIST_CAP,
  extractSeed,
  extractThread,
  seedIdFromStem,
} from '../src/planning-repo/handlers/seed-thread-lift.ts';
import type { SeedLift, ThreadLift } from '../src/planning-repo/handlers/seed-thread-lift.ts';
import { FX_PLANNING, loadFixtureProject } from './helpers/fixture-project.ts';
import { loadShapesProject } from './helpers/shapes-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const SEEDS = '.planning/seeds/';
const THREADS = '.planning/threads/';

function refOf(path: string, kind: string): ArtifactRef {
  return { path, kind, location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as ArtifactRef;
}

function rawOf(path: string, text: string): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

const lendshedText = (relative: string): string => readFileSync(join(FX_PLANNING, relative), 'utf8');

function seedOf(path: string, text: string): SeedLift {
  const result = SeedHandler.parse(rawOf(path, text), refOf(path, 'seed'));
  return (result.structured as { seed: SeedLift }).seed;
}

function threadOf(path: string, text: string): ThreadLift {
  const result = ThreadHandler.parse(rawOf(path, text), refOf(path, 'thread'));
  return (result.structured as { thread: ThreadLift }).thread;
}

describe('SeedHandler and ThreadHandler registration', () => {
  it('claim only their own kind, sit before the generic handler and keep it last', () => {
    expect(SeedHandler.match(refOf(`${SEEDS}SEED-001-x.md`, 'seed'))).toBe(true);
    expect(SeedHandler.match(refOf(`${THREADS}x.md`, 'thread'))).toBe(false);
    expect(ThreadHandler.match(refOf(`${THREADS}x.md`, 'thread'))).toBe(true);
    expect(ThreadHandler.match(refOf(`${SEEDS}SEED-001-x.md`, 'seed'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(refOf(`${SEEDS}SEED-001-x.md`, 'seed')))).toBe(SeedHandler);
    expect(HANDLERS.find((h) => h.match(refOf(`${THREADS}x.md`, 'thread')))).toBe(ThreadHandler);
    expect(HANDLERS.indexOf(SeedHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS.indexOf(ThreadHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });
});

describe('seedIdFromStem', () => {
  it('keeps the dated id with its three characters and the plain numbered id, and a stray stem whole', () => {
    expect(seedIdFromStem('SEED-260411-m2x-borrower-reminders')).toBe('SEED-260411-m2x');
    expect(seedIdFromStem('SEED-003-paper-forms')).toBe('SEED-003');
    expect(seedIdFromStem('SEED-001')).toBe('SEED-001');
    expect(seedIdFromStem('glaze-ideas')).toBe('glaze-ideas');
  });
});

describe('Lendshed seeds', () => {
  it('lifts the enriched seed with its trigger as written, its medium scope and its audit stamp', async () => {
    const { presentation } = await loadFixtureProject();
    const artifact = presentation.artifacts.find((a) => a.path === `${SEEDS}SEED-260304-k7q-shed-capacity-alerts.md`)!;
    const seed = (artifact.structured as { seed: SeedLift }).seed;
    expect(seed.id).toBe('SEED-260304-k7q');
    expect(seed.idea).toBe("Alert a steward when a shed's stock of a popular tool runs low");
    expect(seed.status).toBe('dormant');
    expect(seed.planted).toBe('2026-03-04');
    expect(seed.plantedDuring).toBe('v1.0 / Phase 4 (Shed-to-Shed Transfers)');
    expect(seed.triggerWhen).toBe('when stewards ask to be told before a shed runs out of a popular tool');
    expect(seed.scope).toBe('Medium');
    expect(seed.auditAcknowledged).toEqual({ milestone: 'v1.0', at: '2026-03-20', status: 'dormant' });
    expect(seed.why).toContain('Stewards learn a shed has run out');
    expect(seed.whenToSurface.trigger).toBe(seed.triggerWhen);
    // The stock surfacing sentence is the writer's boilerplate, not a statement of when to surface.
    expect(seed.whenToSurface.text).toBeNull();
    expect(seed.scopeEstimate).toContain('a per-tool threshold setting');
    expect(seed.breadcrumbs).toHaveLength(3);
    expect(seed.breadcrumbs[0]).toBe('`.planning/ROADMAP.md` — the v1.0 transfer phase this idea grew out of');
    // The Notes line is the writer's boilerplate.
    expect(seed.notes).toBeNull();
  });

  it('lifts the seed with no trigger as triggerWhen null, small scope and no audit stamp', async () => {
    const { presentation } = await loadFixtureProject();
    const artifact = presentation.artifacts.find((a) => a.path === `${SEEDS}SEED-260411-m2x-borrower-reminders.md`)!;
    const seed = (artifact.structured as { seed: SeedLift }).seed;
    expect(seed.id).toBe('SEED-260411-m2x');
    expect(seed.status).toBe('active');
    expect(seed.triggerWhen).toBeNull();
    expect(seed.scope).toBe('Small');
    expect(seed.auditAcknowledged).toBeNull();
    expect(seed.breadcrumbs).toHaveLength(2);
  });

  it("keeps 'when relevant' verbatim for the default-trigger seed and reads its placeholders as not stated", async () => {
    const { presentation } = await loadFixtureProject();
    const artifact = presentation.artifacts.find((a) => a.path === `${SEEDS}SEED-003-paper-forms.md`)!;
    const seed = (artifact.structured as { seed: SeedLift }).seed;
    expect(seed.id).toBe('SEED-003');
    expect(seed.triggerWhen).toBe('when relevant');
    expect(seed.scope).toBeNull();
    expect(seed.why).toBeNull();
    expect(seed.scopeEstimate).toBeNull();
    expect(seed.breadcrumbs).toEqual([]);
    expect(seed.notes).toBeNull();
    // No field reports the trigger as met or due: the lift carries the condition as written and nothing else.
    expect(Object.keys(seed).filter((key) => /^(met|due|fired|surfaced|triggerMet|isDue|conditionMet)$/i.test(key))).toEqual([]);
  });
});

describe('Lendshed threads', () => {
  it('lifts the in-progress thread: frontmatter fields, the numbered next steps in the author order', async () => {
    const { presentation } = await loadFixtureProject();
    const thread = (presentation.artifacts.find((a) => a.path === `${THREADS}loan-limit-policy.md`)!.structured as { thread: ThreadLift }).thread;
    expect(thread).toMatchObject({
      slug: 'loan-limit-policy',
      title: 'How many tools one member may hold at a time',
      status: 'in_progress',
      created: '2026-03-27',
      updated: '2026-04-12',
    });
    expect(thread.goal).toContain('per-member limit on open loans');
    expect(thread.nextSteps).toEqual([
      'Count open loans per member from the last quarter and see how many exceed four.',
      'Draft the limit as a per-shed setting and show it to two stewards.',
      'Decide whether lifting the limit for one member needs a reason on record.',
    ]);
    expect(thread.references).toHaveLength(2);
  });

  it('lifts the resolved thread with plain-bullet next steps', async () => {
    const { presentation } = await loadFixtureProject();
    const thread = (presentation.artifacts.find((a) => a.path === `${THREADS}kiosk-printer-swap.md`)!.structured as { thread: ThreadLift }).thread;
    expect(thread.status).toBe('resolved');
    expect(thread.nextSteps).toEqual([
      'Order the thermal printer and fit it at the east shed',
      'Print twenty test receipts and note any jam',
      'Close this thread once a month passes with no jam report',
    ]);
    expect(thread.context).toContain('*Created 2026-02-02.*');
  });

  it('lifts the older shape from its heading and status line', async () => {
    const { presentation } = await loadFixtureProject();
    const thread = (presentation.artifacts.find((a) => a.path === `${THREADS}offline-mode.md`)!.structured as { thread: ThreadLift }).thread;
    expect(thread.title).toBe("Let a kiosk keep taking loans when the shed's network drops");
    expect(thread.status).toBe('OPEN');
    expect(thread.slug).toBeNull();
    expect(thread.goal).toContain('record a loan while the network is down');
    // The placeholder bullets read as empty.
    expect(thread.references).toEqual([]);
    expect(thread.nextSteps).toEqual([]);
  });
});

describe('Shapes seed and thread', () => {
  it('lifts the frontmatter-less seed from its heading, its file name and its Trigger line', async () => {
    const { presentation } = await loadShapesProject();
    const artifact = presentation.artifacts.find((a) => a.path === `${SEEDS}SEED-001-glaze-library.md`)!;
    const seed = (artifact.structured as { seed: SeedLift }).seed;
    expect(seed.id).toBe('SEED-001');
    expect(seed.idea).toBe('Glaze library');
    expect(seed.status).toBeNull();
    expect(seed.triggerWhen).toBe('when the recipe list passes fifty entries.');
    expect(seed.scope).toBeNull();
  });

  it('lifts the thread whose title comes from the plain heading', async () => {
    const { presentation } = await loadShapesProject();
    const artifact = presentation.artifacts.find((a) => a.path === `${THREADS}kiln-vendor-call.md`)!;
    const thread = (artifact.structured as { thread: ThreadLift }).thread;
    expect(thread.title).toBe('Kiln vendor call');
    expect(thread.status).toBe('open');
    expect(thread.nextSteps).toEqual([]);
  });
});

describe('list order and bounds', () => {
  it('keeps next steps in the author order, wrapped lines joined, never merged or re-worded', () => {
    const body = ['# Thread: Order', '', '## Next Steps', '', '3. Zeta first', '1. Alpha second', '   wrapped on', '2. Mid third', ''].join('\n');
    expect(extractThread({}, body).nextSteps).toEqual(['Zeta first', 'Alpha second wrapped on', 'Mid third']);
  });

  it('caps a very long list and a very long line', () => {
    const many = Array.from({ length: LIFT_LIST_CAP + 50 }, (_, i) => `- step ${i}`).join('\n');
    expect(extractThread({}, `## Next Steps\n\n${many}\n`).nextSteps).toHaveLength(LIFT_LIST_CAP);
    const long = `## Next Steps\n\n- ${'x'.repeat(5000)}\n`;
    expect(extractThread({}, long).nextSteps[0].length).toBeLessThanOrEqual(1000);
  });

  it('reads a list inside a fence as no list', () => {
    expect(extractThread({}, '## Next Steps\n\n```\n- hidden\n```\n').nextSteps).toEqual([]);
  });

  it('is linear in the size of the body', () => {
    const growth = measureGrowth({
      make: (n) => `# Thread: Big\n\n## Next Steps\n\n${Array.from({ length: n }, (_, i) => `- step ${i}`).join('\n')}\n`,
      run: (body) => {
        extractThread({}, body);
        extractSeed('.planning/seeds/SEED-001-x.md', {}, body);
      },
      startSize: 200,
      maxSize: 1 << 13,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('guards', () => {
  it('reads an author key through own properties only', () => {
    const polluted = JSON.parse('{"__proto__":{"status":"hacked"},"constructor":"x"}') as Record<string, unknown>;
    expect(extractThread(polluted, '# Thread: T\n').status).toBeNull();
    expect(extractSeed('.planning/seeds/SEED-001-x.md', polluted, '# SEED-001: T\n').status).toBeNull();
  });

  it('keeps title, body and frontmatter and omits structured.seed when the lift throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/seed-thread-lift.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/seed-thread-lift.ts')>()),
      extractSeed: () => {
        throw new Error('boom');
      },
      extractThread: () => {
        throw new Error('boom');
      },
    }));
    const { SeedHandler: GuardedSeed, ThreadHandler: GuardedThread } = await import('../src/planning-repo/handlers/seed-thread.ts');
    const seed = GuardedSeed.parse(rawOf(`${SEEDS}SEED-001-x.md`, '---\nmade_up_example: true\n---\n# SEED-001: Idea\n\nBody text\n'), refOf(`${SEEDS}SEED-001-x.md`, 'seed'));
    expect(seed.title).toBe('SEED-001: Idea');
    expect(seed.body).toContain('Body text');
    expect(seed.frontmatter.made_up_example).toBe(true);
    expect(seed.structured).toEqual({});
    const thread = GuardedThread.parse(rawOf(`${THREADS}t.md`, '# Thread: T\n\nBody text\n'), refOf(`${THREADS}t.md`, 'thread'));
    expect(thread.title).toBe('Thread: T');
    expect(thread.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/seed-thread-lift.ts');
  });

  it('keeps a file with unreadable frontmatter: the body lifts, the warning stays', () => {
    const result = SeedHandler.parse(rawOf(`${SEEDS}SEED-009-x.md`, '---\nid: [unclosed\n---\n# SEED-009: Idea\n\n## Why This Matters\n\nBecause.\n'), refOf(`${SEEDS}SEED-009-x.md`, 'seed'));
    expect(result.warning).toBeDefined();
    const seed = (result.structured as { seed: SeedLift }).seed;
    expect(seed.id).toBe('SEED-009');
    expect(seed.why).toBe('Because.');
  });
});

// The writer's own files, planted inline exactly as plant-seed's write-seed step and thread.md's create step
// leave them before any enrich or session.
describe('edge probes: seeds', () => {
  const PLANTED_SEED = [
    '---',
    'id: SEED-260501-q4z',
    'status: dormant',
    'planted: 2026-05-01',
    'planted_during: v1.2 / Phase 2 (Roles)',
    'trigger_when: when relevant',
    'scope: unknown',
    '---',
    '',
    '# SEED-260501-q4z: Let stewards pin a tool to the front of the list',
    '',
    '## Why This Matters',
    '',
    '_To be filled in. Run `/gsd-capture --seed --enrich SEED-260501-q4z` to add context._',
    '',
    '## When to Surface',
    '',
    '**Trigger:** when relevant',
    '',
    'This seed will surface during `/gsd-new-milestone` when the milestone scope matches.',
    '',
    '## Scope Estimate',
    '',
    '**Unknown** — run `/gsd-capture --seed --enrich SEED-260501-q4z` to estimate effort.',
    '',
    '## Breadcrumbs',
    '',
    '_No breadcrumbs collected yet._',
    '',
    '## Notes',
    '',
    '_Captured via one-shot seed capture. Enrich with trigger, why, and scope at your convenience._',
    '',
  ].join('\n');

  it("edge probe VIEW-15: a seed exactly as write-seed leaves it keeps 'when relevant' and reads every placeholder as not stated", () => {
    const seed = seedOf(`${SEEDS}SEED-260501-q4z-pin-a-tool.md`, PLANTED_SEED);
    expect(seed.id).toBe('SEED-260501-q4z');
    expect(seed.idea).toBe('Let stewards pin a tool to the front of the list');
    expect(seed.status).toBe('dormant');
    expect(seed.triggerWhen).toBe('when relevant');
    expect(seed.scope).toBeNull();
    expect(seed.why).toBeNull();
    expect(seed.scopeEstimate).toBeNull();
    expect(seed.breadcrumbs).toEqual([]);
    expect(seed.notes).toBeNull();
    expect(seed.whenToSurface).toEqual({ trigger: 'when relevant', text: null });
    expect(JSON.stringify(seed)).not.toContain('To be filled in');
    expect(JSON.stringify(seed)).not.toContain('No breadcrumbs collected');
  });

  it('edge probe VIEW-15: a seed with no frontmatter lifts from its heading with the id from the file name and every other field null', () => {
    const seed = seedOf(`${SEEDS}SEED-260502-w7k-bare-seed.md`, '# SEED-260502-w7k: A bare idea\n\nJust a line of prose.\n');
    expect(seed).toMatchObject({
      id: 'SEED-260502-w7k',
      idea: 'A bare idea',
      status: null,
      planted: null,
      plantedDuring: null,
      triggerWhen: null,
      scope: null,
      auditAcknowledged: null,
    });
    // A heading that does not agree with the file name still gives the id from the file name.
    const odd = seedOf(`${SEEDS}SEED-004-odd.md`, '# Something else entirely\n');
    expect(odd.id).toBe('SEED-004');
    expect(odd.idea).toBe('Something else entirely');
  });

  it('edge probe VIEW-15: an empty file lifts to an id from the file name and nothing else', () => {
    const seed = seedOf(`${SEEDS}SEED-005-empty.md`, '');
    expect(seed.id).toBe('SEED-005');
    expect(seed.idea).toBeNull();
    expect(seed.triggerWhen).toBeNull();
    expect(seed.breadcrumbs).toEqual([]);
  });

  it('reads a planted date with a time as its UTC day, and an audit stamp with a Date', () => {
    const text = '---\nid: SEED-006\nplanted: 2026-05-01T23:30:00Z\naudit_acknowledged:\n  milestone: v1.0\n  at: 2026-05-02\n  status: dormant\n---\n# SEED-006: T\n';
    const seed = seedOf(`${SEEDS}SEED-006-t.md`, text);
    expect(seed.planted).toBe('2026-05-01');
    expect(seed.auditAcknowledged).toEqual({ milestone: 'v1.0', at: '2026-05-02', status: 'dormant' });
  });

  it('takes the scope from the Scope Estimate size word when the frontmatter has none', () => {
    const seed = seedOf(`${SEEDS}SEED-007-s.md`, '# SEED-007: T\n\n## Scope Estimate\n\n**Large** — a whole milestone of work.\n');
    expect(seed.scope).toBe('Large');
    expect(seed.scopeEstimate).toBe('a whole milestone of work.');
  });
});

describe('edge probes: threads', () => {
  const PLANTED_THREAD = [
    '---',
    'slug: tool-pinning',
    'title: Pin a tool to the front of the list',
    'status: open',
    'created: 2026-05-01',
    'updated: 2026-05-01',
    '---',
    '',
    '# Thread: Pin a tool to the front of the list',
    '',
    '## Goal',
    '',
    'Pin a tool to the front of the list',
    '',
    '## Context',
    '',
    '*Created 2026-05-01.*',
    '',
    '## References',
    '',
    '- *(add links, file paths, or issue numbers)*',
    '',
    '## Next Steps',
    '',
    '- *(what the next session should do first)*',
    '',
  ].join('\n');

  it("edge probe VIEW-16: a thread exactly as /gsd-thread writes it keeps status 'open', its Goal and empty lists", () => {
    const thread = threadOf(`${THREADS}tool-pinning.md`, PLANTED_THREAD);
    expect(thread.status).toBe('open');
    expect(thread.title).toBe('Pin a tool to the front of the list');
    expect(thread.goal).toBe('Pin a tool to the front of the list');
    expect(thread.references).toEqual([]);
    expect(thread.nextSteps).toEqual([]);
    expect(JSON.stringify(thread)).not.toContain('what the next session should do first');
  });

  it("edge probe VIEW-16: offline-mode, the older shape with no frontmatter, takes its title from '# Thread:' and its status from '## Status:'", () => {
    const thread = threadOf(`${THREADS}offline-mode.md`, lendshedText('threads/offline-mode.md'));
    expect(thread.title).toBe("Let a kiosk keep taking loans when the shed's network drops");
    expect(thread.status).toBe('OPEN');
    expect(thread.created).toBeNull();
    expect(thread.nextSteps).toEqual([]);
  });

  it('edge probe VIEW-16: a thread with neither a frontmatter status nor a Status line has a null status, never a guess', () => {
    const thread = threadOf(`${THREADS}no-status.md`, '# Thread: Unmarked\n\n## Goal\n\nSomething.\n');
    expect(thread.status).toBeNull();
    expect(thread.title).toBe('Unmarked');
  });
});
