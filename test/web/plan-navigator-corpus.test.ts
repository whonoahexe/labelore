// quick-261006-iz6 (QKIZ6-10): real-corpus guards over every PLAN.md in this repo's `.planning/`
// (excluding the sketches), fixtures/dense and `~/studio-portal/.planning/` — the ui-review-corpus idiom
// (a missing studio-portal checkout skips its files). Every file must extract without throwing and
// compose through the real handler; the rows pinned below match values independently confirmed with
// grep / awk / git over the source files (task and list counts read by hand, dates from
// `git log --diff-filter=A --follow --format=%aI`) — never copied from the extractor's own output.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { PlanHandler } from '../../src/planning-repo/handlers/plan.ts';
import type { ArtifactLocation, ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { composePlanNavigator } from '../../src/web/views/plan-navigator.ts';
import type { ComposedPlanNavigator } from '../../src/web/views/plan-navigator.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;
const DENSE_PLANNING = new URL('../../fixtures/dense/.planning', import.meta.url).pathname;

function walk(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules' || entry === 'worktrees') continue;
        stack.push(abs);
      } else if (entry.endsWith('-PLAN.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

interface Built {
  ref: ArtifactRef;
  path: string;
}

/** The ref the real discovery would build for a PLAN file, from its path under `.planning/`. */
function refFor(planningRoot: string, abs: string): Built | null {
  const path = `.planning/${relative(planningRoot, abs)}`;
  const parts = path.split('/');
  const name = basename(path);
  let location: ArtifactLocation | null = null;
  let phaseDir: string | null = null;
  let version: string | null = null;
  if (parts[1] === 'phases') {
    location = 'phase';
    phaseDir = parts[2];
  } else if (parts[1] === 'milestones' && parts[2]?.endsWith('-phases')) {
    location = 'archived-phase';
    phaseDir = parts[3];
    version = parts[2].slice(0, parts[2].indexOf('-'));
  } else if (parts[1] === 'quick') {
    location = 'quick';
  } else if (parts[1] === 'milestones' && parts[2]?.endsWith('-quick')) {
    location = 'milestone-root';
  }
  if (location === null) return null;
  let phaseIdentity: ArtifactRef['phaseIdentity'] = null;
  if (phaseDir !== null) {
    const dash = phaseDir.indexOf('-');
    if (dash < 0) return null;
    phaseIdentity = { milestoneVersion: version, number: phaseDir.slice(0, dash), projectCode: null, slug: phaseDir.slice(dash + 1) };
  }
  const quickTaskId = location === 'quick' ? name.slice(0, name.indexOf('-PLAN.md')) : null;
  return { path, ref: { path, kind: 'plan', location, phaseIdentity, milestoneVersion: version, quickTaskId } };
}

interface Row {
  key: string;
  root: string;
  /** The file, relative to the root's `.planning`. */
  file: string;
  addedAt?: string;
  /** Pretend a paired SUMMARY sits beside a quick plan, as it does on disk. */
  sibling?: boolean;
  headings?: string[];
  expect: {
    eyebrow: string;
    title: string;
    titleStarts?: boolean;
    chips: string[];
    triggers: [number, number, number];
    stats: [string, string, string];
    types: string[];
    gates: (string | null)[];
    tdd: boolean[];
    done: [number, number];
    doneLead?: string | null;
    strip: string[];
    sourceRows: string[][];
    planned: string | null;
    plannedSource?: string;
    files?: number[];
    acceptance?: (number | null)[];
    objectiveRows: [boolean, boolean, boolean];
    restStarts?: string;
  };
}

const LB = REPO_PLANNING;
const SP = SP_PLANNING;

const ROWS: Row[] = [
  {
    key: '0501',
    root: LB,
    file: 'milestones/v1.1-phases/05-per-type-document-views/05-01-PLAN.md',
    addedAt: '2026-09-20T20:31:13+05:30',
    headings: ["Artifacts this phase produces (this plan's share)"],
    expect: {
      eyebrow: 'Plan 05-01 · Phase 5 · Per type document views',
      title: "Prove the per-type view architecture end to end on the phase's flagship case",
      chips: ['Execute', 'Wave 1', 'Autonomous', 'Executed'],
      triggers: [0, 18, 3],
      stats: ['2', 'low', '160k'],
      types: ['tracer', 'auto'],
      gates: [null, null],
      tdd: [false, false],
      done: [2, 4],
      strip: [
        'Must-haves',
        'Threat model',
        'Context files',
        'Execution context',
        'Assumption delta decision',
        'Output',
        "Artifacts this phase produces (this plan's share)",
        'Frontmatter',
      ],
      sourceRows: [['Read first'], ['Read first']],
      planned: '20 Sep 2026',
      plannedSource: 'git',
      files: [13, 6],
      acceptance: [10, 6],
      objectiveRows: [true, true, true],
    },
  },
  {
    key: '0x4',
    root: LB,
    file: 'milestones/v1.0-quick/260910-0x4-close-every-tech-debt-item-in-planning-v/260910-0x4-PLAN.md',
    sibling: true,
    expect: {
      eyebrow: 'Quick plan 260910-0x4',
      title:
        'Close the fourteen tech-debt items recorded in .planning/v1.0-MILESTONE-AUDIT.md so a re-audit reads zero open debt — or, for any item that does not genuinely close, leave it listed with an honest reason and do not flip the audit status',
      chips: ['Execute', 'Wave 1', 'Autonomous', 'Executed'],
      triggers: [0, 23, 14],
      stats: ['7', 'low', '190k'],
      types: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
      gates: [null, null, null, null, null, null, null],
      tdd: [false, true, true, false, false, false, false],
      done: [1, 8],
      doneLead: 'Run at the end of the plan, on the final tree:',
      strip: ['Must-haves', 'Threat model', 'Context files', 'Execution context', 'Measured baseline', 'Global rules', 'Output', 'Frontmatter'],
      sourceRows: [['Pre-condition'], [], [], ['Pre-condition'], ['Pre-condition'], [], ['Pre-condition']],
      planned: '10 Sep 2026',
      plannedSource: 'quick-id',
      objectiveRows: [false, true, true],
    },
  },
  {
    key: '0106',
    root: SP,
    file: 'phases/01-portal-owned-identity-sessions/01-06-PLAN.md',
    addedAt: '2026-08-03T22:12:52+05:30',
    expect: {
      eyebrow: 'Plan 01-06 · Phase 1 · Portal owned identity sessions',
      title: 'Close the loop',
      chips: ['Execute', 'Wave 4', '1 checkpoint', 'Executed'],
      triggers: [3, 8, 3],
      stats: ['3', 'low', '54k'],
      types: ['auto', 'auto', 'checkpoint:human-action'],
      gates: [null, null, 'blocking'],
      tdd: [true, false, false],
      done: [4, 3],
      strip: [
        'Must-haves',
        'Threat model',
        'Context files',
        'Execution context',
        'Artifacts this phase produces',
        'Flagged assumptions',
        'Output',
        'Frontmatter',
      ],
      sourceRows: [
        ['Pre-condition', 'Read first'],
        ['Pre-condition', 'Read first'],
        ['Read first', 'Resume signal', 'After resume'],
      ],
      planned: '3 Aug 2026',
      plannedSource: 'git',
      objectiveRows: [true, true, true],
      restStarts: 'Give a temporary-password holder',
    },
  },
  {
    key: '0402',
    root: SP,
    file: 'phases/04-bulk-archive-downloads/04-02-PLAN.md',
    addedAt: '2026-08-21T10:00:00+05:30',
    expect: {
      eyebrow: 'Plan 04-02 · Phase 4 · Bulk archive downloads',
      title: 'Persist the irreversible ordered-manifest contract and enforce authoritative preflight',
      chips: ['Execute', 'Wave 2', '1 checkpoint', 'Executed'],
      triggers: [1, 8, 2],
      stats: ['2', '—', '—'],
      types: ['checkpoint:decision', 'auto'],
      gates: ['blocking', null],
      tdd: [false, true],
      done: [1, 1],
      strip: [
        'Must-haves',
        'Threat model',
        'Context files',
        'Execution context',
        'Assumption delta decision',
        'Output',
        'Artifacts this phase produces',
        'Frontmatter',
      ],
      sourceRows: [['Read first', 'Resume signal'], ['Read first']],
      planned: '21 Aug 2026',
      plannedSource: 'git',
      objectiveRows: [false, true, true],
    },
  },
  {
    key: 'sya',
    root: SP,
    file: 'quick/260802-sya-improve-navbar-visual-design-to-match-br/260802-sya-PLAN.md',
    sibling: true,
    expect: {
      eyebrow: 'Quick plan 260802-sya',
      title: 'Make the header stop reading as undesigned chrome, using only the design language already present in this codebase',
      chips: ['Execute', 'Wave 1', '1 checkpoint', 'Executed'],
      triggers: [0, 1, 1],
      stats: ['3', 'low', '40k'],
      types: ['tracer', 'auto', 'checkpoint:human-verify'],
      gates: [null, null, 'blocking'],
      tdd: [false, false, false],
      done: [6, 7],
      strip: ['Must-haves', 'Threat model', 'Context files', 'Execution context', 'Constraints', 'Output', 'Wrapper warnings · 2', 'Frontmatter'],
      sourceRows: [['Read first'], ['Read first'], ['Resume signal']],
      planned: '2 Aug 2026',
      plannedSource: 'quick-id',
      objectiveRows: [true, true, true],
    },
  },
  {
    key: 'q528',
    root: LB,
    file: 'quick/261003-528-build-sketch-018-b-as-the-ui-review-page-view-use-gsd-browse/261003-528-PLAN.md',
    sibling: true,
    expect: {
      eyebrow: 'Quick plan 261003-528',
      title: "Build sketch 018's winner, B: Scorecard — hexagon radar + pillar inspector, as the UI-REVIEW page view",
      chips: ['Execute', 'Wave 1', 'Autonomous', 'Executed'],
      triggers: [0, 16, 9],
      stats: ['3', '—', '—'],
      types: ['tracer', 'auto', 'auto'],
      gates: [null, null, null],
      tdd: [true, true, false],
      done: [6, 6],
      strip: [
        'Must-haves',
        'Threat model',
        'Context files',
        'Execution context',
        'Winner spec',
        'Interfaces',
        'Corpus facts',
        'Gates',
        'Planner notes',
        'Source audit',
        'Output',
        'Wrapper warnings · 1',
        'Frontmatter',
      ],
      sourceRows: [['Pre-condition', 'Read first'], ['Read first'], ['Pre-condition', 'Read first']],
      planned: '3 Oct 2026',
      plannedSource: 'quick-id',
      objectiveRows: [true, true, true],
    },
  },
  {
    key: 'lb0217',
    root: LB,
    file: 'milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-17-PLAN.md',
    addedAt: '2026-08-31T00:44:11+05:30',
    expect: {
      eyebrow: 'Plan 02-17 · Phase 2 · Situational awareness artifact reading',
      title: 'Re-run the Phase 02 human gate on a fresh build with a complete matrix that closes the six process shortfalls from 02-13',
      chips: ['Execute', 'Wave 13', '1 checkpoint', 'Gap closure', 'Executed'],
      triggers: [3, 0, 10],
      stats: ['1', 'low', '14k'],
      types: ['checkpoint:human-verify'],
      gates: ['blocking-human'],
      tdd: [false],
      done: [4, 3],
      strip: [
        'Must-haves',
        'Threat model',
        'Context files',
        'Execution context',
        'Prohibitions',
        'Assumption delta',
        'Output',
        'Artifacts this phase produces',
        'Multi-Source Coverage Audit',
        'Frontmatter',
      ],
      sourceRows: [['Pre-condition', 'Read first', 'Resume signal']],
      planned: '31 Aug 2026',
      plannedSource: 'git',
      objectiveRows: [false, true, true],
    },
  },
];

function compose(row: Row): { plan: ComposedPlanNavigator; built: Built } {
  const abs = join(row.root, row.file);
  const built = refFor(row.root, abs) as Built;
  const content = readFileSync(abs, 'utf8');
  const raw: RawArtifact = { path: built.path, content, mtimeMs: 0, size: content.length };
  const parsed = PlanHandler.parse(raw, built.ref);
  const phase = built.ref.phaseIdentity !== null;
  const input: ViewInput = {
    kind: 'plan',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    planProgress: phase ? { complete: true, summaryStatus: 'complete' } : null,
    siblingArtifacts: row.sibling
      ? [{ kind: 'summary', path: built.path.replace('-PLAN.md', '-SUMMARY.md'), url: '/s' }]
      : [],
    headings: (row.headings ?? []).map((text, index) => ({ id: `h-${index}`, text, depth: 2 })),
    planContext: { addedAt: row.addedAt ?? null, mtimeMs: null, description: null, dependencies: [], requirementTexts: {} },
  };
  const plan = composePlanNavigator(input);
  if (plan === null) throw new Error(`no navigator for ${row.key}`);
  return { plan, built };
}

describe('PLAN corpus — pinned rows', () => {
  for (const row of ROWS) {
    const available = existsSync(join(row.root, row.file));
    it.runIf(available)(`${row.key} composes with the pinned values`, () => {
      const { plan } = compose(row);
      const want = row.expect;
      expect(plan.intro.eyebrow).toBe(want.eyebrow);
      expect(plan.intro.title).toBe(want.title);
      expect(plan.head.chips.map((chip) => chip.label)).toEqual(want.chips);
      expect([plan.head.triggers.deps.count, plan.head.triggers.files.count, plan.head.triggers.requirements.count]).toEqual(want.triggers);
      expect(plan.head.stats.map((stat) => stat.value)).toEqual(want.stats);
      const structured = plan.tasks;
      expect(structured.map((task) => task.type)).toEqual(want.types);
      expect(structured.map((task) => task.gateValue)).toEqual(want.gates);
      expect(structured.map((task) => task.tdd)).toEqual(want.tdd);
      expect([plan.doneWhen?.outcomes.items.length, plan.doneWhen?.checks.items.length]).toEqual(want.done);
      if (want.doneLead !== undefined) expect(plan.doneWhen?.checks.lead).toBe(want.doneLead);
      expect(plan.sourceOnly.map((entry) => entry.label)).toEqual(want.strip);
      expect(structured.map((task) => task.sourceRow?.labels.map((entry) => entry.label) ?? [])).toEqual(want.sourceRows);
      expect(plan.intro.planned?.date ?? null).toBe(want.planned);
      if (want.plannedSource) expect(plan.intro.planned?.source).toBe(want.plannedSource);
      expect([plan.objective.rest !== null, plan.objective.why !== null, plan.objective.youGet !== null]).toEqual(want.objectiveRows);
      if (want.restStarts) expect(JSON.stringify(plan.objective.rest)).toContain(want.restStarts);
    });
  }

  it.runIf(existsSync(join(LB, ROWS[0].file)))('0501 counts its files and acceptance items per task', () => {
    const { plan } = compose(ROWS[0]);
    expect(plan.tasks.map((task) => task.sub)).toEqual(['T1 · Tracer · 13 files', 'T2 · Auto · 6 files']);
    expect(plan.tasks.map((task) => task.tabs.find((tab) => tab.key === 'side')?.count)).toEqual([10, 6]);
  });

  it.runIf(existsSync(join(SP, ROWS[2].file)))('0106 reads Done when from the top-level verification, and T3 reads as an Action checkpoint', () => {
    const { plan } = compose(ROWS[2]);
    expect(plan.doneWhen?.checks.items).toHaveLength(3);
    expect(plan.tasks[2].sub).toBe('T3 · Action · waits');
    expect(plan.tasks[2].tabs.map((tab) => tab.label)).toEqual(['Action', 'Afterwards']);
  });

  it.runIf(existsSync(join(SP, ROWS[3].file)))('04-02 reads its inline options as two cards and keeps no Objective row', () => {
    const { plan } = compose(ROWS[3]);
    const options = plan.tasks[0].sections.main.find((section) => section.kind === 'options');
    expect(options).toMatchObject({ kind: 'options' });
    expect((options as { options: { name: string | null }[] }).options.map((option) => option.name)).toEqual([
      expect.stringContaining('Proceed'),
      expect.stringContaining('Stop'),
    ]);
    expect(plan.objective.rest).toBeNull();
    expect(plan.tasks[0].sub).toBe('T1 · Decision · waits');
  });

  it.runIf(existsSync(join(SP, ROWS[4].file)))('sya derives the name of its human-verify task from what-built', () => {
    const { plan } = compose(ROWS[4]);
    expect(plan.tasks[2].name.startsWith('A visual pass over')).toBe(true);
  });

  it.runIf(existsSync(join(SP, 'phases/02-roles-permission-enforcement/02-01-PLAN.md')))(
    'a decision checkpoint with structured <option> children reads name / pros / cons',
    () => {
      const abs = join(SP, 'phases/02-roles-permission-enforcement/02-01-PLAN.md');
      const built = refFor(SP, abs) as Built;
      const content = readFileSync(abs, 'utf8');
      const parsed = PlanHandler.parse({ path: built.path, content, mtimeMs: 0, size: content.length }, built.ref);
      const tasks = (parsed.structured as { plan: { tasks: { type: string; fields: { options: { items: { name: string | null; pros: string | null; cons: string | null }[] } | null } }[] } }).plan.tasks;
      const decision = tasks.find((task) => task.type === 'checkpoint:decision');
      expect(decision?.fields.options?.items.length).toBeGreaterThanOrEqual(2);
      expect(decision?.fields.options?.items[0].name).toContain('Proceed as planned');
      expect(decision?.fields.options?.items[0].pros).toBeTruthy();
      expect(decision?.fields.options?.items[0].cons).toBeTruthy();
    },
  );
});

describe('PLAN corpus — every plan extracts and composes', () => {
  const files: { planning: string; abs: string }[] = [
    ...walk(REPO_PLANNING).map((abs) => ({ planning: REPO_PLANNING, abs })),
    ...walk(DENSE_PLANNING).map((abs) => ({ planning: DENSE_PLANNING, abs })),
    ...walk(SP_PLANNING).map((abs) => ({ planning: SP_PLANNING, abs })),
  ];

  it('finds a real corpus', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('never throws, and composes whenever the file holds a task', () => {
    let composed = 0;
    let skipped = 0;
    for (const { planning, abs } of files) {
      const built = refFor(planning, abs);
      if (built === null) {
        skipped += 1;
        continue;
      }
      const content = readFileSync(abs, 'utf8');
      const parsed = PlanHandler.parse({ path: built.path, content, mtimeMs: 0, size: content.length }, built.ref);
      const plan = (parsed.structured as { plan?: { tasks: unknown[] } }).plan;
      expect(plan, abs).toBeDefined();
      const input: ViewInput = {
        kind: 'plan',
        frontmatter: parsed.frontmatter as Record<string, unknown>,
        structured: parsed.structured as Record<string, unknown>,
        groups: [],
        planSegments: [],
        headings: [],
      };
      const result = composePlanNavigator(input);
      if (plan && plan.tasks.length > 0) {
        expect(result, abs).not.toBeNull();
        composed += 1;
      }
    }
    expect(composed).toBeGreaterThan(20);
    expect(skipped).toBeLessThan(files.length);
  });
});
