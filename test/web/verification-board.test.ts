// quick-261017-18a (sketch 021 E): the VERIFICATION composer and its view, pinned against the five
// sketch reports and the dense fixture. ViewInput literals are built from the handler's real parse of
// each file; pinned values come from the sketch's own data.js and the source files, never from the
// composer's output.
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { VerificationHandler } from '../../src/planning-repo/handlers/verification.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
import { composeVerificationBoard } from '../../src/web/views/verification-board.ts';
import type { ComposedVerificationBoard } from '../../src/web/views/verification-board.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { VerificationBoardView } from '../../src/web/views/verification-board-components.tsx';

const FIXTURES = new URL('../fixtures/verification/', import.meta.url).pathname;
const LB = new URL('../../.planning/', import.meta.url).pathname;
const DENSE = new URL('../../fixtures/dense/.planning/phases/01-identity-slice/01-VERIFICATION.md', import.meta.url).pathname;

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'verification', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, ...extra };
}

export function inputOf(file: string, ref: Partial<ArtifactRef> = {}, headings: ViewInput['headings'] = []): ViewInput {
  const content = readFileSync(file, 'utf8');
  const parsed = VerificationHandler.parse({ path: file, content, mtimeMs: 0, size: content.length }, refOf(file, ref));
  return {
    kind: 'verification',
    frontmatter: JSON.parse(JSON.stringify(parsed.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
  };
}

const phase = (number: string, slug: string): Partial<ArtifactRef> => ({
  phaseIdentity: { milestoneVersion: null, number, projectCode: null, slug },
});

function board(file: string, ref: Partial<ArtifactRef> = {}, headings: ViewInput['headings'] = []): ComposedVerificationBoard {
  const model = composeVerificationBoard(inputOf(file, ref, headings));
  if (model === null) throw new Error(`composed null: ${file}`);
  return model;
}

const syn = board(`${FIXTURES}synthetic-VERIFICATION.md`);
const sp04 = board(`${FIXTURES}sp04-VERIFICATION.md`);
const sb04 = board(`${FIXTURES}sb04-VERIFICATION.md`);
const dd01 = board(`${FIXTURES}dd01-VERIFICATION.md`);
const lb05 = board(`${LB}milestones/v1.1-phases/05-per-type-document-views/05-VERIFICATION.md`);
const dense = board(DENSE, phase('01', 'identity-slice'));

const stat = (m: ComposedVerificationBoard, key: string): { value: string; tone: string | null; target: string | null } | undefined =>
  m.rail.stats.find((s) => s.key === key);

describe('composeVerificationBoard - the rail', () => {
  it('returns null without a projection and never throws on junk', () => {
    expect(composeVerificationBoard({ kind: 'verification', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
    const junk = [null, 1, 'x', [], { a: 1 }, true];
    for (const value of junk) {
      for (const key of ['truths', 'requirements', 'antiPatterns', 'humanChecks', 'gaps', 'fixPlans', 'spotChecks', 'sections', 'metadata', 'anchors']) {
        const input = {
          kind: 'verification',
          frontmatter: { gaps: value, score: value, status: value, human_verification: value, behavior_unverified_items: value, previous_verification: value },
          structured: { verification: { [key]: value, h1: value, goal: value } },
          groups: [],
          planSegments: [],
        } as unknown as ViewInput;
        expect(() => composeVerificationBoard(input)).not.toThrow();
      }
    }
  });

  it('pins the eyebrow, title, status and stamp', () => {
    expect(syn.rail.eyebrow).toBe('Verification · Phase 6');
    expect(syn.rail.title).toBe('Live File Watching');
    expect(syn.rail.status).toEqual({ label: 'Gaps found', tone: 'missing' });
    expect(syn.rail.verified).toBe('14 Oct 2026 · 15:42');
    expect(sp04.rail.eyebrow).toBe('Verification · Phase 4');
    expect(sp04.rail.title).toBe('Bulk Archive Downloads');
    expect(sp04.rail.verified).toBe('29 Aug 2026 · 16:20');
    expect(sb04.rail.title).toBe('Camera Strip UI, Controls & Netflix Coexistence');
    expect(sb04.rail.status).toEqual({ label: 'Human needed', tone: 'in-flight' });
    expect(sb04.rail.verified).toBe('5 Jul 2026 · 23:30');
    expect(dd01.rail.eyebrow).toBe('Verification · Phase 1');
    expect(dd01.rail.title).toBe('Volume Acquisition + Fast Volume-Render');
    expect(dd01.rail.verified).toBe('6 Aug 2026 · 17:05');
    expect(lb05.rail.eyebrow).toBe('Verification · Phase 5');
    expect(lb05.rail.title).toBe('Per-Type Document Views');
    expect(lb05.rail.status).toEqual({ label: 'Passed', tone: 'complete' });
    expect(lb05.rail.verified).toBe('20 Sep 2026 · 20:46');
  });

  it('names a quick task and falls back to the slug title', () => {
    const quick = board(
      `${LB}quick/260923-lju-context-page-per-sketch-006-d1/260923-lju-VERIFICATION.md`,
      { location: 'quick', quickTaskId: '260923-lju' },
    );
    expect(quick.rail.eyebrow).toBe('Quick verification · 260923-lju');
    expect(quick.rail.title).toBe('CONTEXT page per sketch 006 D1');
    expect(dense.rail.eyebrow).toBe('Verification · Phase 1');
    expect(dense.rail.title).toBe('Identity slice');
    const mp6 = board(
      `${LB}quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/260930-mp6-VERIFICATION.md`,
      { location: 'quick', quickTaskId: '260930-mp6' },
    );
    expect(mp6.rail.eyebrow).toBe('Quick verification · 260930-mp6');
  });

  it('pins the big-number frame', () => {
    expect(syn.rail.big).toEqual({ value: '2', label: 'gaps block the goal', sub: '2 more can wait · 6 of 10 truths hold', tone: 'missing' });
    expect(sp04.rail.big).toEqual({ value: '7', label: 'gaps block the goal', sub: '19 of 39 truths hold', tone: 'missing' });
    expect(sb04.rail.big).toEqual({ value: '5', label: 'checks left for a person', sub: 'machine checks done · 11 of 15', tone: 'in-flight' });
    expect(dd01.rail.big).toEqual({ value: '2', label: 'checks left for a person', sub: 'machine checks done · 14 of 14', tone: 'in-flight' });
    expect(lb05.rail.big).toEqual({ value: '5/7', label: 'truths hold · goal achieved', sub: '4 human checks recorded', tone: 'complete' });
    expect(dense.rail.big).toEqual({ value: '2/2', label: 'truths hold · goal achieved', sub: 'nothing left for a person', tone: 'complete' });
  });

  it('pins the stat rows and tones', () => {
    expect(syn.rail.stats.map((s) => [s.label, s.value, s.tone])).toEqual([
      ['Truths', '6/10', 'missing'],
      ['Requirements', '2/5', 'in-flight'],
      ['Anti-patterns', '2 blocking · 4', 'missing'],
      ['Automated', '14 ✓ · 2 ✗', 'missing'],
      ['Approach', 'Goal-backward', null],
      ['Took', '6 min', null],
    ]);
    expect(stat(syn, 'automated')?.target).toBeNull();
    expect(sp04.rail.stats.map((s) => [s.label, s.value])).toEqual([
      ['Truths', '19/39'], ['Requirements', '4/10'], ['Anti-patterns', '4 blocking · 7'],
      ['Spot-checks', '8 ✓ · 0 ✗ · 1 skip'], ['Approach', 'Initial verification'],
    ]);
    expect(stat(sp04, 'spot-checks')?.target).toBe('spot-checks');
    expect(sb04.rail.stats.map((s) => [s.label, s.value])).toEqual([
      ['Truths', '2/5'], ['Requirements', '11/15'], ['Anti-patterns', '0'],
      ['Spot-checks', '5 ✓ · 0 ✗ · 1 skip'], ['Approach', 'Initial verification'],
    ]);
    expect(dd01.rail.stats.map((s) => [s.label, s.value])).toEqual([
      ['Truths', '14/14'], ['Requirements', '9/9'], ['Anti-patterns', '0 blocking · 5'],
      ['Spot-checks', '8 ✓ · 0 ✗ · 1 skip'], ['Approach', 'Re-verification'],
    ]);
    expect(lb05.rail.stats.map((s) => [s.label, s.value])).toEqual([
      ['Truths', '5/7'], ['Requirements', '10/11'], ['Anti-patterns', '0 blocking · 3'],
      ['Spot-checks', '10 ✓ · 0 ✗ · 2 skip'], ['Approach', 'Initial verification'],
    ]);
    expect(dense.rail.stats.map((s) => [s.label, s.value, s.target])).toEqual([['Truths', '2/2', null]]);
  });

  it('pins the slips and their label', () => {
    expect(syn.rail.slipsLabel).toBe('For a person · after the gaps');
    expect(syn.rail.slips).toHaveLength(2);
    expect(syn.rail.slips[0].title).toBe('Burst saves across two windows');
    expect(syn.rail.slips[0].anchorId).toBe('verification-check-1');
    expect(syn.rail.slips[0].preview.length).toBeLessThanOrEqual(91);
    expect(sb04.rail.slipsLabel).toBe('For a person');
    expect(sb04.rail.slips.map((s) => s.title)[0]).toBe('CALL-04 local speaking ring lights own avatar');
    expect(sb04.rail.slips).toHaveLength(5);
    expect(dd01.rail.slips).toHaveLength(2);
    expect(lb05.rail.slips).toHaveLength(4);
    expect(dense.rail.slips).toEqual([]);
  });

  it('carries no slips and no count for a resolved report', () => {
    const lb01 = board(
      `${LB}milestones/v1.0-phases/01-read-layer-domain-model/01-VERIFICATION.md`,
      { location: 'archived-phase' },
    );
    expect(lb01.rail.slips).toEqual([]);
    expect(lb01.human?.heading).toBe('Checked by a person');
    expect(lb01.human?.resolved).toContain('Resolved · 01-UAT.md (23/23 pass, 0 issues)');
    expect(lb01.rail.big?.sub).toBe('nothing left for a person');
  });
});

describe('composeVerificationBoard - the ledger', () => {
  it('maps the synthetic gaps to their plan tasks', () => {
    const { ledger } = syn;
    expect(ledger.aside).toBe('2 critical · 2 can wait');
    expect(ledger.rows.map((r) => [r.number, r.name])).toEqual([
      ['C1', 'Search index is a startup snapshot'],
      ['C2', 'Deleted files stay searchable'],
      ['N1', 'Rename depends on event order'],
      ['N2', 'Debug logging left in the client'],
    ]);
    expect(ledger.rows.map((r) => r.chips.map((c) => c.prefix))).toEqual([['06-04'], ['06-04'], ['06-05'], ['06-05']]);
    expect(ledger.rows[0].chips[0].text).toContain('Implement `SearchIndex.update()`');
    expect(ledger.rows[1].chips[0].text).toContain('Implement `SearchIndex.remove()`');
    expect(ledger.rows[2].chips[0].text).toContain('Key the index update on inode');
    expect(ledger.rows[3].chips[0].text).toContain("Remove the `console.log('sse open')`");
    const hits = ledger.rows.map((r) => r.tickets.map((t) => t.tasks.filter((x) => x.hit).map((x) => x.n)));
    expect(hits).toEqual([[[1]], [[2, 3]], [[1, 3]], [[2]]]);
    for (const row of ledger.rows) {
      for (const ticket of row.tickets) {
        expect(ticket.tasks).toHaveLength(3);
        expect(ticket.scope).toEqual({ label: 'Small', filled: 1 });
      }
      expect(row.scope).toEqual({ label: 'Small', filled: 1 });
    }
    expect(ledger.unmapped).toEqual([]);
    expect(ledger.rows[0].truthIndex).toBe(4);
    expect(ledger.rows[1].truthIndex).toBe(3);
  });

  it('builds the three columns from the template block', () => {
    const c1 = syn.ledger.rows[0].columns;
    expect(c1.missingLabel).toBe('What’s missing');
    expect(c1.whyLabel).toBe('Why it blocks');
    expect(c1.fixLabel).toBe('Fix');
    expect(c1.why).toMatchObject({ kind: 'text' });
    const n1 = syn.ledger.rows[2].columns;
    expect(n1.missingLabel).toBe('What’s wrong');
    expect(n1.whyLabel).toBe('Why it can wait');
    expect(n1.fixLabel).toBe('Recommendation');
  });

  it('reads studio-portal 04 gaps from the frontmatter with the prose closure shape', () => {
    const { ledger } = sp04;
    expect(ledger.aside).toBe('7 critical · 0 can wait');
    expect(ledger.fixShape).toBe('prose');
    expect(ledger.rows).toHaveLength(7);
    const chip = (i: number): string[] => ledger.rows[i].chips.map((c) => `${c.prefix}: ${c.text}`);
    expect(chip(0)).toEqual(['Backend: Wire HTTP cancellation']);
    expect(chip(1)).toEqual(['Capability-honesty: Implement cloud archive reads or fail closed before insertion']);
    expect(chip(2)).toEqual(['Backend: Fix full-coverage deletion']);
    expect(chip(3)).toEqual(['Backend: Enforce reopen/cumulative sizes']);
    expect(chip(4)).toEqual(['Frontend: Complete four native interop results']);
    expect(chip(5)).toEqual(['Frontend: Execute the exact production archive journey']);
    expect(chip(6)).toEqual(['Frontend: Retain/refresh live terminal jobs']);
    expect(ledger.unmapped.map((u) => u.text)).toEqual([
      'Make sweep/omission persistence failures explicit',
      'With an end-to-end cloud test',
      'Add atomic explicit-collection gating',
      'Run the browser checkpoint',
    ]);
    for (const row of ledger.rows) expect(row.scope).toEqual({ label: 'Scope not stated', filled: 0 });
    const c1 = ledger.rows[0].columns;
    expect(c1.why).toMatchObject({ kind: 'truth' });
    expect(c1.fix).toMatchObject({ kind: 'list' });
    expect(ledger.rows[0].columns.why).toMatchObject({ where: [{ file: 'jobs.rs' }] });
    const truthOf = (i: number): string | null => {
      const index = ledger.rows[i].truthIndex;
      return index === null ? null : `${sp04.truths?.details[index].group} #${sp04.truths?.details[index].n}`;
    };
    expect(truthOf(4)).toBe('Plan 04-07 #2');
    expect(truthOf(5)).toBe('Roadmap success criteria #R5');
  });

  it('shows the calm empty state for a report with no gaps', () => {
    expect(lb05.ledger.rows).toEqual([]);
    expect(lb05.ledger.empty).toBe('No blocking gaps.');
    expect(lb05.ledger.aside).toBe('none');
    expect(dense.ledger.empty).toBe('No gaps found.');
    expect(sb04.ledger.empty).toBe('**No blocking gaps.**');
  });

  it('keeps the ledger sourceId from the heading list', () => {
    const headings = [{ id: 'gaps-summary', text: 'Gaps Summary', depth: 2 }];
    const withHeading = board(`${FIXTURES}synthetic-VERIFICATION.md`, {}, headings);
    expect(withHeading.ledger.sourceId).toBe('gaps-summary');
    expect(syn.ledger.sourceId).toBeNull();
  });
});

describe('end to end from a report on disk', () => {
  let root: string | null = null;
  afterEach(async () => {
    if (root !== null) await rm(root, { recursive: true, force: true });
    root = null;
  });

  async function composeFromDisk(): Promise<ComposedVerificationBoard> {
    root = await mkdtemp(join(tmpdir(), 'verification-board-'));
    const dir = join(root, '.planning', 'phases', '06-live-file-watching');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, '06-VERIFICATION.md'), readFileSync(`${FIXTURES}synthetic-VERIFICATION.md`, 'utf8'));
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const presentation = toProjectPresentation(await repository.load());
    const artifact = presentation.artifacts.find((a) => a.path.endsWith('06-VERIFICATION.md'));
    if (!artifact) throw new Error('artifact not loaded');
    const model = composeVerificationBoard({
      kind: artifact.kind,
      frontmatter: artifact.frontmatter,
      structured: artifact.structured,
      groups: [],
      planSegments: [],
    });
    if (model === null) throw new Error('composed null');
    return model;
  }

  it('renders the rail h1 and a C1 row, and the three columns plus ticket for C2', async () => {
    const model = await composeFromDisk();
    const render = (extra: { initialGap?: string } = {}): string =>
      renderToStaticMarkup(
        createElement(
          MemoryRouter,
          null,
          createElement(VerificationBoardView, {
            model,
            fallbackTitle: 'x',
            path: 'p',
            mode: 'view',
            onModeChange: () => undefined,
            onShowSource: () => undefined,
            ...extra,
          }),
        ),
      );
    const closed = render();
    expect(closed).toContain('<h1>Live File Watching</h1>');
    expect(closed).toMatch(/id="verification-gap-c1"/);
    expect(closed).toContain('06-04');
    expect(closed).toContain('Implement ');
    expect(closed).not.toContain('Fixed by');
    const opened = render({ initialGap: 'c2' });
    expect(opened).toContain('Why it blocks');
    expect(opened).toContain('Fixed by');
    expect(opened).toContain('Whole plan · 3 tasks');
    expect(opened.match(/view-verification-task"/g)).toHaveLength(2);
  });
});
