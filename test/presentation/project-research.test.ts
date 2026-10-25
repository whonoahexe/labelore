// The Research page's view model (quick-261024-k8u): the frame, the findings, the numbers and the
// no-source-links rule. Built from Labelore's current research files, its archived v1.0 research (the
// template shape today's files no longer use) and the synthetic drift fixtures, parsed through the
// real handler.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProjectResearchHandler } from '../../src/planning-repo/handlers/project-research.ts';
import { buildResearchViewModel, formatResearched, splitFinding } from '../../src/presentation/project-research.ts';
import {
  composePitfallTables,
  composeScaling,
  deliverItems,
  deliverTile,
  gateConditions,
  phaseShort,
  placePhases,
  scalingTone,
  splitFix,
  splitParenthetical,
  splitSentence,
} from '../../src/presentation/project-research-panels.ts';
import { liftArchitecture, liftPitfalls } from '../../src/planning-repo/handlers/project-research-lift.ts';
import { RESEARCH_FILES, projectHasResearch } from '../../src/presentation/project-research-files.ts';
import {
  DRIFT_ARCHITECTURE,
  DRIFT_FEATURES,
  DRIFT_PITFALLS,
  DRIFT_SCALING,
  DRIFT_STACK,
  DRIFT_SUMMARY,
} from '../helpers/project-research-fixtures.ts';

type Contents = Partial<Record<'SUMMARY' | 'STACK' | 'FEATURES' | 'ARCHITECTURE' | 'PITFALLS', string>>;

const RESEARCH_DIR = join(import.meta.dirname, '..', '..', '.planning', 'research');
const contentsFrom = (dir: string): Contents =>
  Object.fromEntries(['SUMMARY', 'STACK', 'FEATURES', 'ARCHITECTURE', 'PITFALLS'].map((name) => [name, readFileSync(join(dir, `${name}.md`), 'utf8')]));
const realContents = (): Contents => contentsFrom(RESEARCH_DIR);
// The v1.0 research, archived when v2.1 research began. Shipped, so it no longer changes.
const ARCHIVE_DIR = join(import.meta.dirname, '..', '..', '.planning', 'milestones', 'v1.0-research');
const archivedContents = (): Contents => contentsFrom(ARCHIVE_DIR);
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

describe("buildResearchViewModel on Labelore's archived v1.0 research", () => {
  const model = buildResearchViewModel(presentationOf(archivedContents()));

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
    expect(byKey.pitfalls.finding?.head).toMatch(/^The worst of 10: Building the parser against /);
  });

  it('takes a file confidence from the Summary table first', () => {
    expect(model.files.map((file) => file.confidence)).toEqual(['HIGH', 'HIGH', 'HIGH', 'HIGH', 'HIGH']);
  });
});

describe("buildResearchViewModel on Labelore's current research", () => {
  const model = buildResearchViewModel(presentationOf(realContents()));
  const byKey = Object.fromEntries(model.files.map((file) => [file.key, file]));

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
    expect(model.researched).toBe('25 Oct 2026');
    expect(model.confidence.level).toBe('HIGH');
    expect(model.files.map((file) => file.confidence)).toEqual(['HIGH', 'HIGH', 'HIGH', 'HIGH', 'HIGH']);
  });

  it('numbers each file: no phases lifted, 8 stack entries, 23 features, 6 anti-patterns, 33 pitfalls', () => {
    expect(byKey.summary.keyNumber).toEqual({ value: 0, label: 'phases suggested' });
    expect(byKey.summary.nums).toEqual([
      { value: 0, label: 'phases' },
      { value: 9, label: 'gaps' },
    ]);
    expect(byKey.stack.keyNumber).toEqual({ value: 8, label: 'stack entries' });
    expect(byKey.features.keyNumber).toEqual({ value: 23, label: 'features weighed' });
    expect(byKey.architecture.keyNumber).toEqual({ value: 6, label: 'anti-patterns' });
    expect(byKey.pitfalls.keyNumber).toEqual({ value: 33, label: 'critical pitfalls' });
    expect(byKey.pitfalls.nums.map((stat) => stat.label)).toEqual(['critical pitfalls', 'warning signs', 'checks before done']);
    expect(byKey.pitfalls.nums.map((stat) => stat.value)).toEqual([33, 52, 13]);
  });

  it('leads each file with its finding, or with none when the file has no headline', () => {
    expect(byKey.summary.finding?.head).toBe('v2.1 is an integration milestone.');
    expect(byKey.summary.finding?.more).toHaveLength(3);
    expect(byKey.summary.moreLabel).toBe('Read the full summary');
    expect(byKey.stack.finding).toBeNull();
    expect(byKey.stack.moreLabel).toBeNull();
    expect(byKey.features.finding?.head).toBe('**10** things users expect, **6** that set it apart, and **7** worth refusing to build.');
    expect(byKey.features.moreLabel).toBeNull();
    expect(byKey.architecture.finding?.head).toMatch(/^Current pipeline: CLI argument/);
    expect(byKey.pitfalls.finding?.head).toMatch(/^The worst of 33: The URL is also the identity/);
  });

  it('the Summary panel has no phases, no entry gate and nine gaps', () => {
    const summary = model.summary!;
    expect(summary.phases).toEqual([]);
    expect(summary.inspectors).toEqual([]);
    expect(summary.tally).toBe('');
    expect(summary.entryGate).toBeNull();
    expect(summary.whyOrder).toEqual([]);
    expect(summary.gaps).toHaveLength(9);
  });

  it('the Stack panel has no decision, two layers of 6 and 2 and nine alternatives', () => {
    const stack = model.stack!;
    expect(stack.reasons).toEqual([]);
    expect(stack.layers.map((layer) => [layer.title, layer.items.length])).toEqual([
      ['Core Technologies', 6],
      ['Development Tools', 2],
    ]);
    expect(stack.stackTally).toBe('8 entries · 2 layers');
    expect(byKey.stack.keyNumber.value).toBe(stack.layers.reduce((total, layer) => total + layer.items.length, 0));
    expect(stack.alternatives?.label).toBe('Use it instead when');
    expect(stack.alternatives?.tally).toBe('9 weighed');
    expect(stack.alternatives?.rows).toHaveLength(9);
  });

  it('the Features panel reads 10, 6 and 7 with no groups and no competitor table', () => {
    const features = model.features!;
    expect(features.kinds.map((kind) => [kind.label, kind.count])).toEqual([
      ['Expected', 10],
      ['Differentiators', 6],
      ['Not to build', 7],
    ]);
    expect(features.expected.groups).toEqual([]);
    expect(features.differentiators.groups).toEqual([]);
    expect(features.anti.items).toHaveLength(7);
    expect(features.anti.items[0].details.map((detail) => detail.label)).toEqual(['Why it gets asked for', "Why it's a problem"]);
    expect(features.competitors).toBeNull();
  });

  it('the Architecture panel has six anti-patterns and no build order, overview or structure', () => {
    const architecture = model.architecture!;
    expect(architecture.buildOrder).toBeNull();
    expect(architecture.overview).toBeNull();
    expect(architecture.structure).toBeNull();
    expect(architecture.antiPatterns).toHaveLength(6);
    expect(architecture.antiPatterns[0].details.map((detail) => detail.label)).toEqual(["Why it's wrong"]);
    expect(architecture.antiTally).toBe('6 to avoid');
  });

  it('the Scaling section is a matrix of five concerns across three scales with no pinned bottleneck', () => {
    const scaling = model.architecture!.scaling!;
    expect(scaling.single).toBe(false);
    expect(scaling.tally).toBe('3 scales · 5 concerns');
    expect(scaling.tiers[0]).toEqual({ name: '1 project', sub: 'today' });
    expect(scaling.tiers).toHaveLength(3);
    expect(scaling.concerns.map((concern) => concern.name)).toEqual(['Memory', 'Startup', 'Search', 'Folder scan', 'Refresh']);
    expect(scaling.bottlenecks).toEqual([]);
    expect(scaling.notBottlenecks).toEqual([]);
    expect(scaling.concerns.every((concern) => concern.cells.every((cell) => cell.pin === null))).toBe(true);
  });

  it('the Pitfalls panel starts at the URL-as-identity pitfall, with no how-likely meter and four signs', () => {
    const panel = model.pitfalls!;
    const first = panel.pitfalls[0];
    expect(panel.pitfalls).toHaveLength(33);
    expect(first.name).toBe('URL is identity');
    expect(first.title).toMatch(/^The URL is also the identity/);
    expect(first.meter).toBeNull();
    expect(first.firstSign).toMatch(/^A payload contains both/);
    expect(first.signs).toHaveLength(4);
    expect(first.moreSigns).toBe(3);
    expect(first.tabs.map((tab) => tab.key)).toEqual(['signs', 'avoid', 'why', 'verify']);
    expect(first.wrong.head.length).toBeGreaterThan(0);
    expect(panel.tally).toBe('33 · 52 warning signs');
    expect(panel.checks).toHaveLength(13);
    expect(panel.checksTally).toBe('13 checks before calling it done');
  });

  it('the performance, security and UX tables hold 7, 8 and 9 rows', () => {
    const tables = model.pitfalls!.tables!;
    expect(tables.tally).toBe('24 more to avoid');
    expect(tables.kinds.map((kind) => [kind.label, kind.count, kind.itemLabel, kind.fixLabel])).toEqual([
      ['Performance traps', 7, 'Trap', 'Prevention'],
      ['Security mistakes', 8, 'Mistake', 'Prevention'],
      ['UX pitfalls', 9, 'Pitfall', 'Better approach'],
    ]);
    const [performance, security, ux] = tables.kinds;
    expect(performance.items[1]).toEqual({
      bad: 'Loading all projects',
      good: 'Lazy load plus LRU',
      details: [
        { label: 'Symptoms', text: 'Slow start, high memory' },
        { label: 'When it breaks', text: 'A handful of 500-file projects' },
      ],
    });
    expect(security.lead).toBeNull();
    expect(security.items[0].details.map((detail) => detail.label)).toEqual(['Risk']);
    expect(ux.items[0].details.map((detail) => detail.label)).toEqual(['User impact']);
  });
});

describe('buildResearchViewModel on the drift fixtures', () => {
  const model = buildResearchViewModel(presentationOf(driftContents()));

  it('takes the milestone name from a "Name, milestone vX.Y Milestone" project line', () => {
    expect(model.title).toBe('Vault Ingest');
  });

  it('takes the project name when the line has no milestone, and the presentation name without a Summary', () => {
    const plain = DRIFT_SUMMARY.replace('Lendshed, milestone v2.0 Vault Ingest', 'Lendshed');
    expect(buildResearchViewModel(presentationOf({ SUMMARY: plain })).title).toBe('Lendshed');
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
    // Today's research quotes `/artifacts/` URLs in its prose (it is about replacing them), so for
    // Labelore's files the view model may carry that text only as many times as the files do.
    const occurrences = (text: string, needle: string): number => text.split(needle).length - 1;
    for (const [contents, strict] of [
      [driftContents(), true],
      [realContents(), false],
      [archivedContents(), false],
    ] as const) {
      const json = JSON.stringify(buildResearchViewModel(presentationOf(contents)));
      const prose = Object.values(contents).join('\n');
      expect(json).not.toMatch(/\.planning\/research/);
      expect(occurrences(json, '/artifacts/')).toBeLessThanOrEqual(occurrences(prose, '/artifacts/'));
      expect(json).not.toMatch(/"line(s|Number)?"/);
      if (!strict) continue;
      expect(json).not.toMatch(/\/artifacts\//);
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
    expect(buildResearchViewModel(presentationOf(archivedContents())).summary?.entryGate).toBeNull();
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
    const labelore = buildResearchViewModel(presentationOf(archivedContents())).summary!;
    expect(labelore.inspectors[0].flag?.kind).toBe('standard');
    expect(labelore.tally).toBe('4 phases');
  });

  it('turns Avoids into pitfall chips: named and navigable with PITFALLS, plain without', () => {
    const labelore = buildResearchViewModel(presentationOf(archivedContents())).summary!;
    expect(labelore.inspectors[0].avoids.map((chip) => [chip.label, chip.navigable])).toEqual([
      ['01', true],
      ['03', true],
      ['04', true],
      ['09', true],
    ]);
    expect(labelore.inspectors[0].avoids[0].short).toMatch(/^Overfit to /);
    const { PITFALLS: _dropped, ...rest } = archivedContents();
    void _dropped;
    const without = buildResearchViewModel(presentationOf(rest)).summary!;
    expect(without.inspectors[0].avoids.every((chip) => !chip.navigable && chip.short === null)).toBe(true);
  });

  it('lists the facets that are present, the ordering rationale and the gaps', () => {
    expect(summary.inspectors[2].facets.map((facet) => facet.label)).toEqual(['Uses', 'Implements', 'Addresses', 'Keeps']);
    expect(summary.inspectors[0].facets).toEqual([]);
    expect(summary.whyOrder).toHaveLength(2);
    expect(summary.gaps).toHaveLength(2);
    const labelore = buildResearchViewModel(presentationOf(archivedContents())).summary!;
    expect(labelore.inspectors[0].deliversCount).toBe(6);
    expect(labelore.whyOrder).toHaveLength(4);
    expect(labelore.gaps).toHaveLength(4);
  });
});

describe('the Stack panel', () => {
  it("Labelore's archived decision has three reasons with bold leads, and the layers sum to the key number", () => {
    const model = buildResearchViewModel(presentationOf(archivedContents()));
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
  it("Labelore's archived kinds read 11, 7 and 9 with no groups, and nine swaps", () => {
    const features = buildResearchViewModel(presentationOf(archivedContents())).features!;
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
    expect(features.competitors?.ours).toEqual({ name: 'Lendshed', sub: 'Our approach' });
    expect(features.competitors?.rivals).toEqual([
      { name: 'Lendhub', sub: 'hosted review' },
      { name: 'Syncbox', sub: 'sync' },
      { name: 'Peerlink', sub: 'peer to peer' },
    ]);
    expect(features.competitors?.tally).toBe('2 features · 3 compared');
    expect(features.competitors?.note).toBe('The matrix says the gap is verification, not transfer.');
    expect(splitParenthetical("Labelore's approach")).toEqual({ name: "Labelore's approach", sub: null });
  });
});

// ---------------------------------------------------------------------------------------------
// Task 3: the Architecture and Pitfalls panels

describe('the Architecture panel', () => {
  it("Labelore's archived prose build order gives steps A to D with dependencies and the inverse", () => {
    const architecture = buildResearchViewModel(presentationOf(archivedContents())).architecture!;
    const order = architecture.buildOrder!;
    expect(order.steps.map((step) => step.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(order.steps[1].depends).toEqual(['A']);
    expect(order.steps[2].depends).toEqual(['A', 'B']);
    expect(order.steps[0].unlocks).toEqual(['B', 'C', 'D'].filter((id) => order.steps.find((step) => step.id === id)?.depends.includes('A')));
    expect(order.tally).toMatch(/^4 steps · \d deep$/);
    expect(order.toggleLabel).toBe('Why this order');
    expect(order.toggleText).toMatch(/pure-data foundation/);
    expect(architecture.overview).not.toBeNull();
    expect(architecture.structure).not.toBeNull();
  });

  it('parses anti-patterns into swaps in both spellings, with "What people do" only when present', () => {
    const labelore = buildResearchViewModel(presentationOf(archivedContents())).architecture!;
    expect(labelore.antiPatterns).toHaveLength(3);
    expect(labelore.antiPatterns[0].details.map((detail) => detail.label)).toEqual(['What people do', "Why it's wrong"]);
    expect(labelore.antiTally).toBe('3 to avoid');
    const drift = buildResearchViewModel(presentationOf(driftContents())).architecture!;
    expect(drift.antiPatterns[0].details.map((detail) => detail.label)).toEqual(["Why it's wrong"]);
    expect(drift.antiPatterns[1].details.map((detail) => detail.label)).toEqual(['What people do', "Why it's wrong"]);
    expect(drift.antiPatterns[0].good).toBe('Route every write through the executor');
  });

  it('reads the table shape: short names from the ASCII graph, non-step prerequisites kept as text', () => {
    const order = buildResearchViewModel(presentationOf(driftContents())).architecture!.buildOrder!;
    expect(order.steps.map((step) => step.name)).toEqual(['Schema', 'Executor', 'Review', 'Export']);
    expect(order.steps[3].alsoWaitsFor).toBe('spike X1 (needs an answer)');
    expect(order.steps[2].alsoWaitsFor).toBeNull();
    expect(order.steps[0].unlocks).toEqual(['I1', 'R1']);
    expect(order.steps[1].deliverable).toBe('Single read, tee');
    expect(order.toggleLabel).toBe('Roadmap grouping');
    expect(order.toggleText).toMatch(/^S1 and I1 as one phase/);
  });

  it('expands "Phases A–C" into A, B and C', () => {
    const body = `# Architecture\n\n## Recommended Build Order\n\n### Phase A — One\nFirst thing.\n\n### Phase B — Two\nSecond.\n\n### Phase C — Three\nDepends on Phases A–B.\n\n### Phase D — Four\nNeeds Phase C.\n`;
    const order = buildResearchViewModel(presentationOf({ ARCHITECTURE: body })).architecture!.buildOrder!;
    expect(order.steps[2].depends).toEqual(['A', 'B']);
    expect(order.steps[3].depends).toEqual(['C']);
  });

  it('has no build order or anti-patterns when the file has none', () => {
    const architecture = buildResearchViewModel(presentationOf({ ARCHITECTURE: '# Architecture\n' })).architecture!;
    expect(architecture.buildOrder).toBeNull();
    expect(architecture.antiPatterns).toEqual([]);
    expect(architecture.overview).toBeNull();
  });
});

describe('the Pitfalls panel', () => {
  it("Labelore's archived first pitfall is an overfit one, very high, with a first sign and its other signs counted", () => {
    const panel = buildResearchViewModel(presentationOf(archivedContents())).pitfalls!;
    const first = panel.pitfalls[0];
    expect(panel.pitfalls).toHaveLength(10);
    expect(first.name).toMatch(/^Overfit to /);
    expect(first.title).toMatch(/^Building the parser against /);
    expect(first.meter).toMatchObject({ cells: 4, filled: 4, text: 'Very high' });
    expect(first.firstSign!.length).toBeGreaterThan(0);
    expect(first.moreSigns).toBe(first.signs.length - 1);
    expect(first.tabs.map((tab) => tab.key)).toEqual(['signs', 'avoid', 'why', 'verify']);
    expect(first.wrong.head.length).toBeGreaterThan(0);
    expect(panel.tally).toMatch(/^10 · \d+ warning signs$/);
    expect(panel.checks).toHaveLength(10);
    expect(panel.checksTally).toBe('10 checks before calling it done');
  });

  it('uses the confidence meter when the file does not say how likely, and omits empty tabs in order', () => {
    const panel = buildResearchViewModel(presentationOf(driftContents())).pitfalls!;
    expect(panel.pitfalls[0].meter).toMatchObject({ cells: 3, filled: 2.5, text: 'medium–high confidence' });
    expect(panel.pitfalls[0].tabs.map((tab) => tab.key)).toEqual(['signs', 'avoid', 'why', 'verify']);
    expect(panel.pitfalls[1].tabs.map((tab) => tab.key)).toEqual(['signs', 'avoid', 'verify']);
    expect(panel.pitfalls[2].tabs.map((tab) => tab.key)).toEqual(['why']);
    expect(panel.pitfalls[2].meter).toBeNull();
    expect(panel.pitfalls[0].firstSign).toBe('A tier shows full capacity while its drive is unplugged');
    expect(panel.pitfalls[0].moreSigns).toBe(2);
  });

  it('shortens the phase by dropping parentheticals and asides', () => {
    expect(phaseShort(null, 'Phase 1 (probe design) - before UI work')).toBe('Phase 1 - before UI work');
    expect(phaseShort('Phase 2', 'ignored')).toBe('Phase 2');
    expect(phaseShort('Architectural — the reader layer, before any UI', '')).toBe('Architectural');
    expect(phaseShort(null, '')).toBe('');
  });

  it('turns a check with a trap into "Often X. Verify Y" and its pitfall reference into a named chip', () => {
    const panel = buildResearchViewModel(presentationOf(driftContents())).pitfalls!;
    expect(panel.checks[0].text).toBe('Often only tested plugged in. Verify by unplugging each tier');
    expect(panel.checks[0].chips).toEqual([{ n: 1, label: '01', short: 'Absent mounts', navigable: true }]);
    expect(panel.checks[1].chips.map((chip) => chip.label)).toEqual(['02', '03']);
    expect(panel.checks[1].chips[1].short).toBe('A pitfall with no signs at all');
  });

  it('splits the first sentence of What goes wrong from the rest', () => {
    const panel = buildResearchViewModel(presentationOf(driftContents())).pitfalls!;
    expect(panel.pitfalls[0].wrong.head).toBe("The mount point degrades to an empty directory, so the probe reports the root filesystem's capacity.");
    expect(panel.pitfalls[0].wrong.more.map((block) => block.text)).toEqual(['It looks healthy.']);
    const [first, rest] = splitSentence('A short thing. Another.');
    expect([first, rest]).toEqual(['A short thing. Another.', '']);
  });

  it('cuts a long avoid sentence at its dash and leads a bold avoid with its bold part', () => {
    const labelore = buildResearchViewModel(presentationOf(archivedContents())).pitfalls!;
    expect(labelore.pitfalls.every((pitfall) => pitfall.avoid.every((avoid) => avoid.main.length > 0))).toBe(true);
    const panel = buildResearchViewModel(presentationOf({ PITFALLS: DRIFT_PITFALLS.replace('- Check mountinfo first', '- **Check mountinfo first.** Then trust nothing else') })).pitfalls!;
    expect(panel.pitfalls[0].avoid[0]).toEqual({ main: 'Check mountinfo first', rest: 'Then trust nothing else' });
  });
});

describe('the Scaling section (036 A)', () => {
  it("Labelore's archived research: one bottleneck pinned at the second scale, its fix split off, the note kept aside", () => {
    const scaling = buildResearchViewModel(presentationOf(archivedContents())).architecture!.scaling!;
    expect(scaling.single).toBe(true);
    expect(scaling.tally).toBe('3 scales · 1 bottleneck');
    expect(scaling.tiers[1]).toEqual({ name: 'A much larger single project', sub: 'thousands of files, tens of MB' });
    expect(scaling.bottlenecks).toHaveLength(1);
    expect(scaling.bottlenecks[0].label).toBe('First to break · at A much larger single project');
    expect(scaling.bottlenecks[0].text).toMatch(/^Full snapshot rebuild latency/);
    expect(scaling.bottlenecks[0].fix).toMatch(/^Mitigated by incremental re-parse/);
    expect(scaling.concerns[0].cells.map((cell) => cell.pin)).toEqual([null, 0, null]);
    expect(scaling.concerns[0].cells[0].tone).toBe('holds');
    expect(scaling.notBottlenecks.map((note) => note.label)).toEqual(["Not a bottleneck at this project's actual scale"]);
  });

  it('a matrix: tones, the concern in the label, and an unpinned second bottleneck', () => {
    const scaling = composeScaling(liftArchitecture(DRIFT_SCALING).scaling!);
    expect(scaling.single).toBe(false);
    expect(scaling.tally).toBe('3 scales · 3 concerns · 2 bottlenecks');
    expect(scaling.concerns.map((concern) => concern.cells.map((cell) => cell.tone))).toEqual([
      ['na', 'changes', 'changes'],
      ['holds', 'changes', 'holds'],
      ['holds', 'changes', 'changes'],
    ]);
    expect(scaling.bottlenecks.map((b) => b.label)).toEqual(['First to break · at Per season · Archive disk', 'Second to break']);
    expect(scaling.bottlenecks[0].fix).toBe('Mitigation is policy, not code.');
    expect(scaling.concerns[2].cells[1].pin).toBe(0);
  });

  it('reads tones and fixes conservatively', () => {
    expect(scalingTone('N/A')).toBe('na');
    expect(scalingTone('Same; allow resume from the last chunk')).toBe('changes');
    expect(scalingTone('Eager load as designed; no adjustments needed')).toBe('holds');
    expect(splitFix('slow rebuilds — mitigated by re-parsing changed paths')).toEqual({ text: 'slow rebuilds', fix: 'mitigated by re-parsing changed paths' });
    expect(splitFix('nothing to fix here')).toEqual({ text: 'nothing to fix here', fix: null });
  });

  it('has no Scaling section when the file has none', () => {
    expect(buildResearchViewModel(presentationOf({ ARCHITECTURE: '# Architecture\n' })).architecture!.scaling).toBeNull();
  });
});

describe('the performance, security and UX tables (037 B)', () => {
  it("Labelore's archived research: three kinds as swaps, the fix column as the swap's right side, the rest as details", () => {
    const tables = buildResearchViewModel(presentationOf(archivedContents())).pitfalls!.tables!;
    expect(tables.tally).toBe('11 more to avoid');
    expect(tables.kinds.map((kind) => [kind.label, kind.count, kind.itemLabel, kind.fixLabel])).toEqual([
      ['Performance traps', 3, 'Trap', 'Prevention'],
      ['Security mistakes', 3, 'Mistake', 'Prevention'],
      ['UX pitfalls', 5, 'Pitfall', 'Better approach'],
    ]);
    const [performance, security, ux] = tables.kinds;
    expect(performance.items[1].bad).toBe('Synchronous full-corpus search-index build on startup');
    expect(performance.items[1].good).toMatch(/^Background\/lazy\/incremental index build/);
    expect(performance.items[1].details.map((detail) => detail.label)).toEqual(['Symptoms', 'When it breaks']);
    expect(security.lead).toMatch(/^Even for a single-user/);
    expect(security.items[0].details.map((detail) => detail.label)).toEqual(['Risk']);
    expect(ux.items[0].details.map((detail) => detail.label)).toEqual(['User impact']);
  });

  it('keeps cells as written and leaves out a missing kind', () => {
    const body = '# Pitfalls\n\n## UX Pitfalls\n\n| Pitfall | User Impact | Better Approach |\n|---|---|---|\n| ffmpeg progress hidden | Re-clicks | Show the job tray |\n';
    const tables = composePitfallTables(liftPitfalls(body).tables)!;
    expect(tables.kinds.map((kind) => kind.key)).toEqual(['ux']);
    expect(tables.kinds[0].items[0]).toEqual({ bad: 'ffmpeg progress hidden', good: 'Show the job tray', details: [{ label: 'User impact', text: 'Re-clicks' }] });
    expect(tables.tally).toBe('1 more to avoid');
  });

  it('has no section when the file has none of the three tables', () => {
    expect(buildResearchViewModel(presentationOf({ PITFALLS: '# Pitfalls\n' })).pitfalls?.tables ?? null).toBeNull();
  });
});
