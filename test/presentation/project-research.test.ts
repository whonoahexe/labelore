// The Research page's view model (quick-261024-k8u): the frame, the findings, the numbers and the
// no-source-links rule. Built from Labelore's own research files and the synthetic drift fixtures,
// parsed through the real handler.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProjectResearchHandler } from '../../src/planning-repo/handlers/project-research.ts';
import { buildResearchViewModel, formatResearched, splitFinding } from '../../src/presentation/project-research.ts';
import {
  deliverItems,
  deliverTile,
  gateConditions,
  placePhases,
  splitParenthetical,
} from '../../src/presentation/project-research-panels.ts';
import { RESEARCH_FILES, projectHasResearch } from '../../src/presentation/project-research-files.ts';
import {
  DRIFT_ARCHITECTURE,
  DRIFT_FEATURES,
  DRIFT_PITFALLS,
  DRIFT_STACK,
  DRIFT_SUMMARY,
} from '../helpers/project-research-fixtures.ts';

type Contents = Partial<Record<'SUMMARY' | 'STACK' | 'FEATURES' | 'ARCHITECTURE' | 'PITFALLS', string>>;

const RESEARCH_DIR = join(import.meta.dirname, '..', '..', '.planning', 'research');
const realContents = (): Contents =>
  Object.fromEntries(
    ['SUMMARY', 'STACK', 'FEATURES', 'ARCHITECTURE', 'PITFALLS'].map((name) => [name, readFileSync(join(RESEARCH_DIR, `${name}.md`), 'utf8')]),
  );
const driftContents = (): Contents => ({
  SUMMARY: DRIFT_SUMMARY,
  STACK: DRIFT_STACK,
  FEATURES: DRIFT_FEATURES,
  ARCHITECTURE: DRIFT_ARCHITECTURE,
  PITFALLS: DRIFT_PITFALLS,
});

function presentationOf(contents: Contents, projectName: string | null = 'Fallback Name') {
  const artifacts = Object.entries(contents).map(([name, content]) => {
    const path = `.planning/research/${name}.md`;
    const ref = { path, kind: 'unknown', location: 'research' as const, phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
    const parsed = ProjectResearchHandler.parse({ path, content: content ?? '', mtimeMs: 0, size: (content ?? '').length }, ref);
    return { path, location: 'research' as const, structured: parsed.structured };
  });
  return { readAt: '2026-10-24T00:00:00.000Z', projectName, artifacts } as unknown as Parameters<typeof buildResearchViewModel>[0];
}

describe('formatResearched', () => {
  it('formats an ISO date and passes anything else through', () => {
    expect(formatResearched('2026-08-21')).toBe('21 Aug 2026');
    expect(formatResearched('last spring')).toBe('last spring');
    expect(formatResearched(null)).toBeNull();
  });
});

describe('splitFinding', () => {
  it('keeps a short first sentence whole and moves the rest to rest', () => {
    expect(splitFinding('Short one. Then another sentence here.')).toEqual({
      head: 'Short one.',
      tail: '',
      rest: 'Then another sentence here.',
    });
  });

  it('cuts a long first sentence at its colon', () => {
    const long = `The shortlist is settled: ${'one, two, three and four of the named things '.repeat(4)}end.`;
    const split = splitFinding(long);
    expect(split.head).toBe('The shortlist is settled');
    expect(split.tail.startsWith('one, two')).toBe(true);
    expect(split.rest).toBe('');
  });

  it('does not cut a long sentence whose colon comes too early, or a short one', () => {
    expect(splitFinding(`A: ${'word '.repeat(40)}end.`).tail).toBe('');
    expect(splitFinding('A short thing: with a list.').tail).toBe('');
  });

  it('tolerates empty input', () => {
    expect(splitFinding('')).toEqual({ head: '', tail: '', rest: '' });
  });
});

describe('buildResearchViewModel on Labelore', () => {
  const model = buildResearchViewModel(presentationOf(realContents()));

  it('lays out five spines numbered 00 to 04 under the project name', () => {
    expect(model.available).toBe(true);
    expect(model.title).toBe('Labelore');
    expect(model.fileCount).toBe(5);
    expect(model.files.map((file) => [file.number, file.key])).toEqual([
      ['00', 'summary'],
      ['01', 'stack'],
      ['02', 'features'],
      ['03', 'architecture'],
      ['04', 'pitfalls'],
    ]);
    expect(model.researched).toBe('21 Aug 2026');
    expect(model.confidence.level).toBe('HIGH');
  });

  it('numbers each file: phases, stack entries as the sum of the layers, features, components, pitfalls', () => {
    const byKey = Object.fromEntries(model.files.map((file) => [file.key, file]));
    expect(byKey.summary.keyNumber).toEqual({ value: 4, label: 'phases suggested' });
    expect(byKey.summary.nums).toEqual([
      { value: 4, label: 'phases' },
      { value: 4, label: 'gaps' },
    ]);
    expect(byKey.stack.keyNumber).toEqual({ value: 25, label: 'stack entries' });
    expect(byKey.features.keyNumber).toEqual({ value: 27, label: 'features weighed' });
    expect(byKey.architecture.keyNumber).toEqual({ value: 7, label: 'components' });
    expect(byKey.pitfalls.keyNumber).toEqual({ value: 10, label: 'critical pitfalls' });
    expect(byKey.pitfalls.nums.map((stat) => stat.label)).toEqual(['critical pitfalls', 'warning signs', 'checks before done']);
    expect(byKey.pitfalls.nums[2].value).toBe(10);
  });

  it('leads each file with its finding', () => {
    const byKey = Object.fromEntries(model.files.map((file) => [file.key, file]));
    expect(byKey.summary.finding?.head).toMatch(/^Labelore is a read-only web viewer/);
    expect(byKey.summary.finding?.more.length).toBeGreaterThan(2);
    expect(byKey.summary.moreLabel).toBe('Read the full summary');
    expect(byKey.stack.finding?.head).toBe('Vite 8 + React 19 SPA, served by a thin Hono/Node API server, over Next.js 16.');
    expect(byKey.stack.finding?.tail).toBe('');
    expect(byKey.stack.moreLabel).toBe('Read more');
    expect(byKey.features.finding?.head).toBe('**11** things users expect, **7** that set it apart, and **9** worth refusing to build.');
    expect(byKey.features.moreLabel).toBeNull();
    expect(byKey.architecture.finding?.head).toMatch(/^System built as two clean layers/);
    expect(byKey.pitfalls.finding?.head).toBe("The worst of 10: Building the parser against studio-portal's shape, not GSD's contract.");
  });

  it('takes a file confidence from the Summary table first', () => {
    expect(model.files.map((file) => file.confidence)).toEqual(['HIGH', 'HIGH', 'HIGH', 'HIGH', 'HIGH']);
  });
});

describe('buildResearchViewModel on the drift fixtures', () => {
  const model = buildResearchViewModel(presentationOf(driftContents()));

  it('takes the milestone name from a "Name, milestone vX.Y Milestone" project line', () => {
    expect(model.title).toBe('Vault Ingest');
  });

  it('takes the project name when the line has no milestone, and the presentation name without a Summary', () => {
    const plain = DRIFT_SUMMARY.replace('Cinedise Portal, milestone v2.0 Vault Ingest', 'Cinedise Portal');
    expect(buildResearchViewModel(presentationOf({ SUMMARY: plain })).title).toBe('Cinedise Portal');
    expect(buildResearchViewModel(presentationOf({ STACK: DRIFT_STACK }, 'Named By Folder')).title).toBe('Named By Folder');
  });

  it('prefers the Summary confidence row, then the file own confidence', () => {
    const byKey = Object.fromEntries(model.files.map((file) => [file.key, file.confidence]));
    expect(byKey).toEqual({
      summary: 'MEDIUM-HIGH',
      stack: 'HIGH',
      features: 'MEDIUM',
      architecture: 'MEDIUM-HIGH',
      pitfalls: 'LOW-MEDIUM',
    });
    const withoutAreas = DRIFT_SUMMARY.replace(/\| Stack \|[^\n]*\n/, '').replace(/\| Pitfalls \|[^\n]*\n/, '');
    const fallback = buildResearchViewModel(presentationOf({ ...driftContents(), SUMMARY: withoutAreas }));
    const levels = Object.fromEntries(fallback.files.map((file) => [file.key, file.confidence]));
    expect(levels.stack).toBe('HIGH');
    expect(levels.pitfalls).toBe('MEDIUM-HIGH');
  });

  it('sums the stack layers for the key number', () => {
    const stack = model.files.find((file) => file.key === 'stack');
    expect(stack?.keyNumber).toEqual({ value: 6, label: 'stack entries' });
  });

  it('cuts a stack verdict that runs long at its colon and keeps the rest behind the toggle', () => {
    const stack = model.files.find((file) => file.key === 'stack');
    expect(stack?.finding?.head).toBe('Rust and axum, kept as they are, over a rewrite in Go.');
    expect(stack?.finding?.more).toEqual(['The portal already runs there and the ingest path wants no garbage collector:']);
  });

  it('falls back to the build steps and then the anti-patterns for the architecture number', () => {
    const noComponents = DRIFT_ARCHITECTURE.replace(/## Component Responsibilities[\s\S]*?## Recommended Project Structure/, '## Recommended Project Structure');
    const steps = buildResearchViewModel(presentationOf({ ARCHITECTURE: noComponents })).files[0];
    expect(steps.keyNumber).toEqual({ value: 4, label: 'build steps' });
    const noOrder = noComponents.replace(/## Suggested Build Order[\s\S]*?## Anti-Patterns/, '## Anti-Patterns');
    expect(buildResearchViewModel(presentationOf({ ARCHITECTURE: noOrder })).files[0].keyNumber).toEqual({ value: 2, label: 'anti-patterns' });
  });
});

describe('buildResearchViewModel with files missing', () => {
  it('shows four spines 00 to 03 without PITFALLS', () => {
    const { PITFALLS: _dropped, ...rest } = realContents();
    void _dropped;
    const model = buildResearchViewModel(presentationOf(rest));
    expect(model.files.map((file) => file.number)).toEqual(['00', '01', '02', '03']);
    expect(model.fileCount).toBe(4);
    // The Summary still names pitfalls; with no file the finding is simply absent.
    expect(model.files.find((file) => file.key === 'pitfalls')).toBeUndefined();
  });

  it('shows one spine for SUMMARY only', () => {
    const model = buildResearchViewModel(presentationOf({ SUMMARY: realContents().SUMMARY }));
    expect(model.files.map((file) => file.key)).toEqual(['summary']);
    expect(model.available).toBe(true);
  });

  it('is unavailable with no research files', () => {
    const model = buildResearchViewModel(presentationOf({}));
    expect(model.available).toBe(false);
    expect(model.files).toEqual([]);
    expect(model.fileCount).toBe(0);
  });

  it('ignores a file whose lift is missing', () => {
    const presentation = presentationOf(realContents());
    for (const artifact of presentation.artifacts) delete (artifact.structured as Record<string, unknown>).projectResearch;
    expect(buildResearchViewModel(presentation).available).toBe(false);
  });
});

describe('the no-source-links rule', () => {
  it('carries no file name, .planning path, line number or artifact URL in the serialised view model', () => {
    // The drift fixtures never mention a research file by name, so any file name here would be the
    // view model's own. Labelore's files discuss other planning files in prose, which is content.
    for (const [contents, strict] of [
      [driftContents(), true],
      [realContents(), false],
    ] as const) {
      const json = JSON.stringify(buildResearchViewModel(presentationOf(contents)));
      expect(json).not.toMatch(/\.planning\/research/);
      expect(json).not.toMatch(/\/artifacts\//);
      expect(json).not.toMatch(/"line(s|Number)?"/);
      if (!strict) continue;
      expect(json).not.toMatch(/\.planning/);
      for (const name of ['SUMMARY.md', 'STACK.md', 'FEATURES.md', 'ARCHITECTURE.md', 'PITFALLS.md']) {
        expect(json).not.toContain(name);
      }
    }
  });
});

describe('projectHasResearch', () => {
  it('is true when any of the five files is present and false otherwise', () => {
    expect(projectHasResearch([{ path: '.planning/research/STACK.md' }])).toBe(true);
    expect(projectHasResearch(RESEARCH_FILES.map((file) => ({ path: file.path })))).toBe(true);
    expect(projectHasResearch([{ path: '.planning/research/questions.md' }, { path: '.planning/STATE.md' }])).toBe(false);
    expect(projectHasResearch([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Task 2: the Summary, Stack and Features panels

describe('placePhases', () => {
  const phase = (n: number, parallelWith: number | null = null) => ({ n: String(n), parallelWith });

  it('hangs a parallel phase under its partner on lane two and gives every other phase the next column', () => {
    const phases = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => phase(n, n === 2 ? 1 : n === 4 ? 3 : n === 6 ? 5 : null));
    const placed = placePhases(phases);
    expect(placed.cols).toBe(6);
    expect(placed.lanes).toBe(2);
    expect(placed.at.map((entry, index) => [index + 1, entry.col, entry.lane])).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [3, 2, 1],
      [4, 2, 2],
      [5, 3, 1],
      [6, 3, 2],
      [7, 4, 1],
      [8, 5, 1],
      [9, 6, 1],
    ]);
  });

  it('keeps one lane when nothing runs alongside, and treats a missing or later partner as a new column', () => {
    expect(placePhases([phase(1), phase(2), phase(3)]).lanes).toBe(1);
    expect(placePhases([phase(1, 9), phase(2, 3), phase(3)]).cols).toBe(3);
  });
});

describe('gates, tiles and the Summary panel', () => {
  const drift = buildResearchViewModel(presentationOf(driftContents()));
  const summary = drift.summary!;

  it('splits gate conditions at top-level semicolons and "plus" only', () => {
    expect(gateConditions('a; b, plus c (not; this).')).toEqual(['A', 'B', 'C (not; this)']);
    expect(summary.inspectors[1].gate).toEqual({
      title: 'Gate',
      sub: 'Must pass before this phase can finish',
      conditions: ['A', 'B', 'C (not; this)'],
    });
    expect(summary.inspectors[0].gate).toBeNull();
  });

  it('shows the entry gate with its lead as the title and the parenthetical as the sub', () => {
    expect(summary.entryGate).toEqual({
      title: 'Entry gate',
      sub: 'Before any phase writes to the vault',
      conditions: ['The vault is mounted read-write', 'A backup exists'],
    });
    expect(buildResearchViewModel(presentationOf(realContents())).summary?.entryGate).toBeNull();
  });

  it('keeps the first plain preamble paragraph as the note', () => {
    expect(summary.note).toBe('A plain paragraph that explains the suggested order in one go.');
  });

  it('splits a one-paragraph Delivers at top-level semicolons and drops a closing parenthetical to a sub line', () => {
    expect(deliverItems(['a; b; c (d)'])).toEqual(['A', 'B', 'C (d)']);
    expect(deliverTile('IngestExecutor (single read, tee, hash)')).toEqual({ main: 'IngestExecutor', sub: 'Single read, tee, hash' });
    expect(deliverTile('Plain item.')).toEqual({ main: 'Plain item', sub: null });
    expect(deliverTile('a (b)')).toEqual({ main: 'a (b)', sub: null });
    const first = summary.inspectors[0];
    expect(first.deliversCount).toBe(3);
    expect(first.delivers.map((tile) => tile.main)).toEqual(['`IngestExecutor`', 'Manifest schema', 'The `fsync` barrier']);
    expect(first.delivers[2].sub).toBe('Data and directory');
    expect(first.oneColumn).toBe(false);
    expect(summary.inspectors[2].oneColumn).toBe(true);
  });

  it('places the phases, marks them and tallies the track', () => {
    expect(summary.phases.map((card) => [card.label, card.col, card.lane, card.alongside])).toEqual([
      ['01', 1, 1, null],
      ['02', 1, 2, '01'],
      ['03', 2, 1, null],
    ]);
    expect(summary.phases[1].marks).toEqual({ gate: true, research: true, pitfalls: 3 });
    expect(summary.phases[0].marks).toEqual({ gate: false, research: false, pitfalls: 1 });
    expect(summary.tally).toBe('3 phases · 1 gated · 2 alongside · 1 need research');
    expect(summary.inspectors[1].kicker).toBe('Phase 02 of 3 · alongside phase 01');
    expect(summary.inspectors[0].kicker).toBe('Phase 01 of 3');
  });

  it('classifies the research flag', () => {
    expect(summary.inspectors[1].flag).toMatchObject({ kind: 'needs', label: 'Needs deeper research' });
    expect(summary.inspectors[0].flag).toMatchObject({ kind: 'standard', label: 'Standard patterns' });
    const labelore = buildResearchViewModel(presentationOf(realContents())).summary!;
    expect(labelore.inspectors[0].flag?.kind).toBe('standard');
    expect(labelore.tally).toBe('4 phases');
  });

  it('turns Avoids into pitfall chips: named and navigable with PITFALLS, plain without', () => {
    const labelore = buildResearchViewModel(presentationOf(realContents())).summary!;
    expect(labelore.inspectors[0].avoids.map((chip) => [chip.label, chip.navigable])).toEqual([
      ['01', true],
      ['03', true],
      ['04', true],
      ['09', true],
    ]);
    expect(labelore.inspectors[0].avoids[0].short).toBe('Overfit to studio-portal');
    const { PITFALLS: _dropped, ...rest } = realContents();
    void _dropped;
    const without = buildResearchViewModel(presentationOf(rest)).summary!;
    expect(without.inspectors[0].avoids.every((chip) => !chip.navigable && chip.short === null)).toBe(true);
  });

  it('lists the facets that are present, the ordering rationale and the gaps', () => {
    expect(summary.inspectors[2].facets.map((facet) => facet.label)).toEqual(['Uses', 'Implements', 'Addresses', 'Keeps']);
    expect(summary.inspectors[0].facets).toEqual([]);
    expect(summary.whyOrder).toHaveLength(2);
    expect(summary.gaps).toHaveLength(2);
    const labelore = buildResearchViewModel(presentationOf(realContents())).summary!;
    expect(labelore.inspectors[0].deliversCount).toBe(6);
    expect(labelore.whyOrder).toHaveLength(4);
    expect(labelore.gaps).toHaveLength(4);
  });
});

describe('the Stack panel', () => {
  it("Labelore's decision has three reasons with bold leads, and the layers sum to the key number", () => {
    const model = buildResearchViewModel(presentationOf(realContents()));
    const stack = model.stack!;
    expect(stack.reasons).toHaveLength(3);
    expect(stack.reasons[0].lead).toBe('A CLI-launched path argument is the primary entry point, every single time it runs');
    expect(stack.reasonsTally).toBe('3 reasons');
    expect(stack.layers.map((layer) => [layer.title, layer.items.length])).toEqual([
      ['Core Technologies', 6],
      ['Supporting Libraries', 13],
      ['Development Tools', 6],
    ]);
    expect(stack.stackTally).toBe('25 entries · 3 layers');
    const spine = model.files.find((file) => file.key === 'stack')!;
    expect(spine.keyNumber.value).toBe(stack.layers.reduce((total, layer) => total + layer.items.length, 0));
    expect(stack.alternatives?.label).toBe('Use it instead when');
    expect(stack.alternatives?.tally).toBe('10 weighed');
    expect(stack.alternatives?.rows).toHaveLength(10);
  });

  it('labels the why column by its header and flags a repeated choice and category headers on the drift shape', () => {
    const stack = buildResearchViewModel(presentationOf(driftContents())).stack!;
    expect(stack.layers.map((layer) => layer.whyLabel)).toEqual(['Why', 'Notes', 'When to use', 'Why', 'Why']);
    expect(stack.alternatives?.label).toBe('Why not');
    expect(stack.alternatives?.rows.map((row) => [row.header, row.chosen, row.repeat])).toEqual([
      ['Runtime', 'Rust', false],
      [null, 'Rust', true],
      ['HTTP', 'axum', false],
    ]);
    expect(stack.reasons.map((reason) => reason.lead)).toEqual(['Streaming without copies', 'One toolchain']);
  });

  it('uses a reason body first sentence when it has no bold lead', () => {
    const plainReasons = DRIFT_STACK.replace('1. **Streaming without copies.** Rust', '1. Rust').replace('2. **One toolchain.** The', '2. The');
    const stack = buildResearchViewModel(presentationOf({ STACK: plainReasons })).stack!;
    expect(stack.reasons[0].lead).toBe('Rust lets the tee stay zero-copy.');
  });
});

describe('the Features panel', () => {
  it("Labelore's kinds read 11, 7 and 9 with no groups, and nine swaps", () => {
    const features = buildResearchViewModel(presentationOf(realContents())).features!;
    expect(features.kinds.map((kind) => [kind.label, kind.count])).toEqual([
      ['Expected', 11],
      ['Differentiators', 7],
      ['Not to build', 9],
    ]);
    expect(features.expected.groups).toEqual([]);
    expect(features.differentiators.groups).toEqual([]);
    expect(features.anti.items).toHaveLength(9);
    expect(features.anti.items[0].details.map((detail) => detail.label)).toEqual(['Why it gets asked for', "Why it's a problem"]);
    expect(features.competitors?.rivals).toHaveLength(2);
    expect(features.competitors?.ours.name).toBe('Labelore');
  });

  it('groups only a list with two or more distinct groups, and reads complexity into cells', () => {
    const features = buildResearchViewModel(presentationOf(driftContents())).features!;
    expect(features.expected.groups).toEqual([
      { name: 'Projects', count: 2 },
      { name: 'Ingest', count: 1 },
    ]);
    expect(features.differentiators.groups).toEqual([]);
    expect(features.expected.items.map((row) => row.cells)).toEqual([1, 2.5, 3]);
    expect(features.expected.items[1].complexity).toBe('medium-high');
  });

  it('names our column after the project and splits each rival into a name over its parenthetical', () => {
    const features = buildResearchViewModel(presentationOf(driftContents())).features!;
    expect(features.competitors?.ours).toEqual({ name: 'Cinedise Portal', sub: 'Our approach' });
    expect(features.competitors?.rivals).toEqual([
      { name: 'Frame.io', sub: 'hosted review' },
      { name: 'Dropbox', sub: 'sync' },
      { name: 'Resilio', sub: 'peer to peer' },
    ]);
    expect(features.competitors?.tally).toBe('2 features · 3 compared');
    expect(features.competitors?.note).toBe('The matrix says the gap is verification, not transfer.');
    expect(splitParenthetical("Labelore's approach")).toEqual({ name: "Labelore's approach", sub: null });
  });
});
