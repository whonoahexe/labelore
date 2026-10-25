// quick-261017-18a (sketch 021 E): the VERIFICATION composer and its view, pinned against the synthetic
// template report, three made-up Lendshed reports (D-01, D-06) and the dense fixture. ViewInput literals are
// built from the handler's real parse of each file; every Lendshed pin was recounted by grep and awk in the
// made-up file itself (R5), never copied from the composer's output.
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
import { fxPath } from '../helpers/fixture-project.ts';

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
const FX04 = 'phases/04-bulk-loan-export/04-VERIFICATION.md';
const FX03 = 'phases/03-account-admin-and-sessions/03-VERIFICATION.md';
const FX01 = 'milestones/v1.0-phases/01-member-data-foundation/01-VERIFICATION.md';
const lx04 = board(fxPath(FX04));
const lx03 = board(fxPath(FX03));
const lx01 = board(fxPath(FX01));
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
    expect(lx04.rail.eyebrow).toBe('Verification · Phase 4');
    expect(lx04.rail.title).toBe('Bulk Loan Export');
    expect(lx04.rail.status).toEqual({ label: 'Gaps found', tone: 'missing' });
    expect(lx04.rail.verified).toBe('12 Apr 2026 · 14:05');
    expect(lx03.rail.title).toBe('Account Admin & Sessions');
    expect(lx03.rail.status).toEqual({ label: 'Human needed', tone: 'in-flight' });
    expect(lx03.rail.verified).toBe('9 Apr 2026 · 21:10');
    expect(lx01.rail.eyebrow).toBe('Verification · Phase 1');
    expect(lx01.rail.title).toBe('Member Data Foundation');
    expect(lx01.rail.verified).toBe('20 Feb 2026 · 11:30');
    expect(lb05.rail.eyebrow).toBe('Verification · Phase 5');
    expect(lb05.rail.title).toBe('Per-Type Document Views');
    expect(lb05.rail.status).toEqual({ label: 'Passed', tone: 'complete' });
    expect(lb05.rail.verified).toBe('20 Sep 2026 · 20:46');
  });

  it('names a quick task and falls back to the slug title', () => {
    const quick = board(
      `${LB}milestones/v2.0-quick/260923-lju-context-page-per-sketch-006-d1/260923-lju-VERIFICATION.md`,
      { location: 'quick', quickTaskId: '260923-lju' },
    );
    expect(quick.rail.eyebrow).toBe('Quick verification · 260923-lju');
    expect(quick.rail.title).toBe('CONTEXT page per sketch 006 D1');
    expect(dense.rail.eyebrow).toBe('Verification · Phase 1');
    expect(dense.rail.title).toBe('Identity slice');
    const mp6 = board(
      `${LB}milestones/v2.0-quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/260930-mp6-VERIFICATION.md`,
      { location: 'quick', quickTaskId: '260930-mp6' },
    );
    expect(mp6.rail.eyebrow).toBe('Quick verification · 260930-mp6');
  });

  it('pins the big-number frame', () => {
    expect(syn.rail.big).toEqual({ value: '2', label: 'gaps block the goal', sub: '2 more can wait · 6 of 10 truths hold', tone: 'missing' });
    expect(lx04.rail.big).toEqual({ value: '7', label: 'gaps block the goal', sub: '8 of 21 truths hold', tone: 'missing' });
    expect(lx03.rail.big).toEqual({ value: '4', label: 'checks left for a person', sub: 'machine checks done · 4 of 6', tone: 'in-flight' });
    expect(lx01.rail.big).toEqual({ value: '2', label: 'checks left for a person', sub: 'machine checks done · 8 of 8', tone: 'in-flight' });
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
    expect(lx04.rail.stats.map((s) => [s.label, s.value])).toEqual([
      ['Truths', '8/21'], ['Requirements', '3/6'], ['Anti-patterns', '4 blocking · 7'],
      ['Spot-checks', '7 ✓ · 0 ✗ · 1 skip'], ['Approach', 'Initial verification'],
    ]);
    expect(stat(lx04, 'spot-checks')?.target).toBe('spot-checks');
    expect(lx03.rail.stats.map((s) => [s.label, s.value])).toEqual([
      ['Truths', '2/5'], ['Requirements', '4/6'], ['Anti-patterns', '0'],
      ['Spot-checks', '5 ✓ · 0 ✗ · 1 skip'], ['Approach', 'Initial verification'],
    ]);
    expect(lx01.rail.stats.map((s) => [s.label, s.value])).toEqual([
      ['Truths', '8/8'], ['Requirements', '5/5'], ['Anti-patterns', '0 blocking · 5'],
      ['Spot-checks', '6 ✓ · 0 ✗ · 1 skip'], ['Approach', 'Re-verification'],
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
    expect(lx03.rail.slipsLabel).toBe('For a person');
    expect(lx03.rail.slips.map((s) => s.title)[0]).toBe("ADMN-03 disabled member's open page stops at once");
    expect(lx03.rail.slips).toHaveLength(4);
    expect(lx04.rail.slipsLabel).toBe('For a person · after the gaps');
    expect(lx04.rail.slips).toHaveLength(3);
    expect(lx01.rail.slips).toHaveLength(2);
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

  it('reads Lendshed phase 4 gaps from the frontmatter with the prose closure shape', () => {
    const { ledger } = lx04;
    expect(ledger.aside).toBe('7 critical · 0 can wait');
    expect(ledger.fixShape).toBe('prose');
    expect(ledger.rows).toHaveLength(7);
    const chip = (i: number): string[] => ledger.rows[i].chips.map((c) => `${c.prefix}: ${c.text}`);
    expect(chip(0)).toEqual(['Server: Wire HTTP cancellation']);
    expect(chip(1)).toEqual(['Capability-honesty: Read counter-fed loans or refuse before any job row']);
    expect(chip(2)).toEqual(['Server: Fix whole-file removal']);
    expect(chip(3)).toEqual(['Server: Enforce row counts when rewriting']);
    expect(chip(4)).toEqual(['Web: Complete four desktop archive results']);
    expect(chip(5)).toEqual(['Web: Run the built-export journey over the member route']);
    expect(chip(6)).toEqual(['Web: Keep finished live jobs']);
    expect(ledger.unmapped.map((u) => u.text)).toEqual([
      'Make sweep and skipped-loan write failures explicit',
      'With an end-to-end Depot test',
      'Gate explicit fetches atomically',
      'Run the browser check',
    ]);
    for (const row of ledger.rows) expect(row.scope).toEqual({ label: 'Scope not stated', filled: 0 });
    const c1 = ledger.rows[0].columns;
    expect(c1.why).toMatchObject({ kind: 'truth' });
    expect(c1.fix).toMatchObject({ kind: 'list' });
    expect(ledger.rows[0].columns.why).toMatchObject({ where: [{ file: 'jobs.ts' }] });
    const truthOf = (i: number): string | null => {
      const index = ledger.rows[i].truthIndex;
      return index === null ? null : `${lx04.truths?.details[index].group} #${lx04.truths?.details[index].n}`;
    };
    expect(truthOf(4)).toBe('Roadmap success criteria #R4');
    expect(truthOf(0)).toBeNull();
  });

  it('shows the calm empty state for a report with no gaps', () => {
    expect(lb05.ledger.rows).toEqual([]);
    expect(lb05.ledger.empty).toBe('No blocking gaps.');
    expect(lb05.ledger.aside).toBe('none');
    expect(dense.ledger.empty).toBe('No gaps found.');
    expect(lx03.ledger.empty).toBe('**No blocking gaps.**');
    expect(lx01.ledger.empty).toBe('**No gaps.**');
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

const render = (model: ComposedVerificationBoard, extra: Record<string, unknown> = {}): string =>
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

describe('the Truth board', () => {
  it('lays the synthetic truths out in one column', () => {
    const truths = syn.truths;
    expect(truths?.groups).toEqual([{ name: 'Observable truths', label: 'Truths' }]);
    expect(truths?.aside).toBe('10 truths · by outcome');
    expect(truths?.rows.map((r) => [r.label, r.count, r.cells[0].map((c) => c.n)])).toEqual([
      ['Failed', 2, ['4', '5']],
      ['Not proven', 2, ['7', '8']],
      ['Holds', 6, ['1', '2', '3', '6', '9', '10']],
    ]);
    expect(truths?.rows[1].cells[0].map((c) => c.state)).toEqual(['unverified', 'uncertain']);
    expect(truths?.rows[2].cells[0][2].state).toBe('coincidental');
    expect(truths?.rows.map((r) => r.filled)).toEqual([1, 1, 3]);
  });

  it('lays Lendshed phase 4 out across five columns', () => {
    const truths = lx04.truths;
    expect(truths?.groups.map((g) => g.label)).toEqual(['Roadmap', 'Plan 04-01', 'Plan 04-02', 'Plan 04-03', 'Plan 04-04']);
    expect(truths?.rows.map((r) => r.count)).toEqual([6, 7, 8]);
    const html = render(lx04);
    expect(html.match(/data-empty="true"/g)?.length).toBeGreaterThan(0);
  });

  it('shows an inspector for the coincidental, behaviour-unverified and failed truths', () => {
    const coincidental = render(syn, { initialTruth: 2 });
    expect(coincidental).toContain('Holds incidentally');
    expect(coincidental).toContain('Incidental ordering');
    expect(coincidental).toContain('Declare that unlink is processed before add');
    const unverified = render(syn, { initialTruth: 6 });
    expect(unverified).toContain('To check it');
    expect(unverified).toContain('Open the dashboard, then close the tab');
    expect(unverified).toContain('→ In the human checks');
    const failed = render(syn, { initialTruth: 3 });
    expect(failed).toContain('Critical gap: Deleted files stay searchable');
    expect(failed).toContain('Failed');
  });

  it('matches a frontmatter behaviour item that restates a truth with different punctuation', () => {
    const unchecked = lb05.truths?.details.filter((d) => d.state === 'unverified') ?? [];
    expect(unchecked.map((d) => d.n)).toEqual(['4b', '5b']);
    expect(unchecked.every((d) => d.behavior !== null)).toBe(true);
    expect(unchecked[0].behavior?.test).toContain('Open the dashboard, roadmap');
  });

  it('shows the status cell as written when it is not a standard form', () => {
    const insufficient = lx04.truths?.details.find((d) => d.raw !== null);
    expect(insufficient?.raw).toContain('insufficient_spec');
    expect(syn.truths?.details[3].raw).toBeNull();
    expect(render(lx04, { initialTruth: lx04.truths?.details.indexOf(insufficient as never) })).toContain('As written');
  });

  it('omits the board when no truth was parsed', () => {
    expect(dense.truths).toBeNull();
    expect(render(dense)).not.toContain('Truth board');
  });
});

describe('the Requirement board', () => {
  it('groups the synthetic requirements by state', () => {
    const rows = syn.requirements?.rows;
    expect(rows?.map((r) => [r.label, r.count, r.squares.map((s) => s.id)])).toEqual([
      ['Blocked', 2, ['PLAT-01', 'FIND-07']],
      ['Needs a person', 1, ['PLAT-03']],
      ['Satisfied', 2, ['PLAT-02', 'DASH-06']],
    ]);
    const html = render(syn, { initialRequirement: 'FIND-07' });
    expect(html).toContain('Search stays current while the dashboard is open');
    expect(html).toContain('Blocking');
    expect(html).toContain('SearchIndex.update');
  });

  it('lists the Lendshed 03 requirements and the caveat state', () => {
    const squares = lx03.requirements?.rows.flatMap((r) => r.squares) ?? [];
    expect(squares).toHaveLength(6);
    expect(lx03.requirements?.rows.map((r) => [r.label, r.count])).toEqual([
      ['Needs a person', 2], ['With a caveat', 1], ['Satisfied', 3],
    ]);
    const partial = lx03.requirements?.rows.find((r) => r.state === 'partial')?.squares[0].id as string;
    expect(partial).toBe('ADMN-04');
    expect(render(lx03, { initialRequirement: partial })).toContain('With a caveat');
  });

  it('has no board without a Requirements Coverage table', () => {
    const none = board(
      `${LB}milestones/v2.0-quick/261003-527-build-sketch-017-d-as-the-security-page-view-use-gsd-browser/261003-527-VERIFICATION.md`,
      { location: 'quick', quickTaskId: '261003-527' },
    );
    expect(none.requirements).toBeNull();
  });
});

describe('human steps', () => {
  it('numbers the synthetic steps after the gaps', () => {
    expect(syn.human?.heading).toBe('Needs a person, after the gaps');
    expect(syn.human?.steps).toHaveLength(2);
    const html = render(syn);
    expect(html).toContain('Do this');
    expect(html).toContain('You should see');
    expect(html).toContain('Why a person');
    expect(html).toContain('id="verification-check-2"');
  });

  it('reads Needs a person first for a passed report with recorded checks', () => {
    expect(lb05.human?.heading).toBe('Needs a person first');
    expect(lb05.human?.steps).toHaveLength(4);
    expect(lb05.human?.steps[0].title.length).toBeGreaterThan(3);
  });

  it('reads Checked by a person for a resolved report', () => {
    const lb01 = board(`${LB}milestones/v1.0-phases/01-read-layer-domain-model/01-VERIFICATION.md`, { location: 'archived-phase' });
    expect(lb01.human?.heading).toBe('Checked by a person');
    expect(lb01.human?.steps).toHaveLength(1);
    expect(render(lb01)).toContain('data-resolved="true"');
  });
});

describe('anti-patterns', () => {
  it('shows blockers as cards and the rest as rows', () => {
    expect(syn.anti?.summary).toBe('2 blockers · 1 warning · 1 info');
    expect(syn.anti?.blockers).toHaveLength(2);
    expect(syn.anti?.blockers[0].where).toBe('src/search/index.ts:88');
    expect(syn.anti?.rows.map((r) => r.severity)).toEqual(['warning', 'info']);
    const html = render(syn);
    expect(html.match(/class="view-verification-blocker"/g)).toHaveLength(2);
    expect(html.match(/class="view-verification-anti-row"/g)).toHaveLength(2);
  });

  it('shows rows only for Lendshed v1.0/01, with the clear row quiet', () => {
    expect(lx01.anti?.blockers).toEqual([]);
    expect(lx01.anti?.rows.map((r) => r.severity)).toEqual(['clear', 'warning', 'warning', 'info', 'info']);
    expect(render(lx01)).toContain('data-severity="clear"');
  });

  it('shows the section prose when there are no rows, and nothing without a section', () => {
    expect(lx03.anti?.empty).toContain('None.');
    expect(lx03.anti?.empty?.length).toBeLessThanOrEqual(261);
    expect(dense.anti).toBeNull();
  });
});

describe('Also in this report, the footer and the spot-check modal', () => {
  const labels = (m: ComposedVerificationBoard): string[] => m.also.map((a) => a.label);

  it('lists exactly the unhandled sections in order', () => {
    expect(labels(syn)).toEqual(['Required Artifacts', 'Key Link Verification']);
    expect(labels(lx04)).toEqual([
      'Verifier’s gap summary', 'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace', 'Behavioral Spot-Checks',
      'Probe Execution', 'Prohibitions', 'Test Quality Audit', 'Decision Coverage', 'Next Action',
    ]);
    expect(labels(lx03)).toEqual([
      'Session-count note (ADMN-05 / SC4) — steward-approved reinterpretation, not a gap',
      'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace', 'Behavioral Spot-Checks',
    ]);
    expect(labels(lx01)).toEqual([
      'Closed since last verification · 4', 'Re-verification note', 'Data-Blocked Items', 'Required Artifacts',
      'Key Link Verification', 'Data-Flow Trace', 'Behavioral Spot-Checks', 'Probe Execution',
    ]);
    expect(labels(lb05)).toEqual(['Required Artifacts', 'Key Link Verification', 'Behavioral Spot-Checks']);
    expect(dense.also).toEqual([]);
  });

  it('points a section chip at its heading id and a frontmatter chip at the top', () => {
    const headings = [
      { id: 'required-artifacts', text: 'Required Artifacts', depth: 2 },
      { id: 'data-flow-trace-level-4', text: 'Data-Flow Trace (Level 4)', depth: 2 },
    ];
    const model = board(fxPath(FX01), {}, headings);
    expect(model.also[0].targetId).toBeNull();
    expect(model.also.find((a) => a.label === 'Required Artifacts')?.targetId).toBe('required-artifacts');
    expect(model.also.find((a) => a.label === 'Data-Flow Trace')?.targetId).toBe('data-flow-trace-level-4');
    expect(model.also.find((a) => a.label === 'Probe Execution')?.targetId).toBeNull();
    expect(render(model)).toContain('aria-label="Also in this report"');
  });

  it('shows the verifier footer', () => {
    expect(syn.footer).toEqual({
      verifier: 'Claude (subagent)',
      source: '06-01-PLAN.md, 06-02-PLAN.md, 06-03-PLAN.md frontmatter',
    });
    const html = render(syn);
    expect(html).toContain('Verifier · Claude (subagent)');
    expect(html).toContain('Must-haves from · 06-01-PLAN.md');
    expect(dense.footer).toBeNull();
  });

  it('opens the spot-check list only where there are rows', () => {
    expect(lx04.spotChecks?.rows).toHaveLength(8);
    expect(lb05.spotChecks?.rows).toHaveLength(12);
    expect(syn.spotChecks).toBeNull();
    expect(stat(syn, 'automated')?.target).toBeNull();
    const headings = [{ id: 'behavioral-spot-checks', text: 'Behavioral Spot-Checks', depth: 2 }];
    expect(board(fxPath(FX04), {}, headings).spotChecks?.sourceId).toBe('behavioral-spot-checks');
  });
});
