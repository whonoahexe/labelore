// quick-261017-k44 (sketch 022 C): the REVIEW composer and view, pinned against the made-up Lendshed
// reviews (test/fixtures/lendshed), the clean review (test/fixtures/review), labelore's own reviews and
// the junk-input degrade paths. The
// ViewInput literals come from the handlers' real parse of each file (round-tripped through JSON, as
// the server serves them); the reviewContext of a pair is built by hand from the handler's parse of
// its REVIEW-FIX, as the server join would. Pinned values come from grep over the fixture
// files, independent of the composer's output.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ReviewFixHandler, ReviewHandler } from '../../src/planning-repo/handlers/review.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import type { ReviewContext } from '../../src/presentation/review-context.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composeReviewThreads } from '../../src/web/views/review-threads.ts';
import type { ComposedReviewFinding, ComposedReviewThreads } from '../../src/web/views/review-threads.ts';
import { ReviewThreadsView } from '../../src/web/views/review-threads-components.tsx';
import { fxPath } from '../helpers/fixture-project.ts';

const FIXTURES = new URL('../fixtures/review/', import.meta.url).pathname;
// Lendshed review files, by the shape each one carries.
const MEMBERS = 'milestones/v1.0-phases/01-member-data-foundation/01-REVIEW.md'; // frontmatter resolved notes
const ROLES = 'phases/02-roles-and-permissions/02-REVIEW.md'; // fix pair, partial
const ROLES_FIX = 'phases/02-roles-and-permissions/02-REVIEW-FIX.md';
const CATALOGUE = 'milestones/v1.0-phases/03-catalogue-browsing/03-REVIEW.md'; // the large report
const TRANSFERS = 'milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW.md'; // fix pair, all fixed
const TRANSFERS_FIX = 'milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW-FIX.md';
const ADMIN = 'phases/03-account-admin-and-sessions/03-REVIEW.md'; // Warning/Info buckets
const EXPORT = 'phases/04-bulk-loan-export/04-REVIEW.md'; // blockers_resolved
const LB = new URL('../../.planning/milestones/', import.meta.url).pathname;

function refOf(path: string, kind: string): ArtifactRef {
  return { path, kind, location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 };
}

function parse(handler: typeof ReviewHandler, file: string, kind: string) {
  const content = readFileSync(file, 'utf8');
  const raw: RawArtifact = { path: file, content, mtimeMs: 0, size: content.length };
  const result = handler.parse(raw, refOf(file, kind));
  return JSON.parse(JSON.stringify({ frontmatter: result.frontmatter, structured: result.structured })) as {
    frontmatter: Record<string, unknown>;
    structured: Record<string, unknown>;
  };
}

function contextOf(fixFile: string | null, phaseName: string | null = null): ReviewContext | null {
  if (fixFile === null) return phaseName === null ? null : { phaseName, fix: null };
  const fix = parse(ReviewFixHandler, fixFile, 'review-fix');
  const fm = fix.frontmatter;
  return {
    phaseName,
    fix: {
      path: fixFile,
      url: '/artifacts/fix',
      frontmatter: {
        status: fm.status ?? null,
        fixed_at: fm.fixed_at ?? null,
        iteration: fm.iteration ?? null,
        findings_in_scope: fm.findings_in_scope ?? null,
        fixed: fm.fixed ?? null,
        skipped: fm.skipped ?? null,
        fix_scope: fm.fix_scope ?? null,
      },
      report: (fix.structured.reviewFix ?? null) as never,
    },
  };
}

function inputOf(file: string, context: ReviewContext | null, headings: ViewInput['headings'] = []): ViewInput {
  const review = parse(ReviewHandler, file, 'review');
  return { kind: 'review', ...review, groups: [], planSegments: [], headings, reviewContext: context };
}

const F = (name: string): string => `${FIXTURES}${name}`;
const L = (relativeToPlanning: string): string => fxPath(relativeToPlanning);
const HEADINGS = [
  { id: 'summary', text: 'Summary', depth: 2 },
  { id: 'areas-reviewed-clean', text: 'Areas Reviewed Clean', depth: 2 },
];

function compose(file: string, context: ReviewContext | null = null, headings: ViewInput['headings'] = HEADINGS): ComposedReviewThreads {
  const model = composeReviewThreads(inputOf(file, context, headings));
  if (model === null) throw new Error(`no model for ${file}`);
  return model;
}

const verdictText = (m: ComposedReviewThreads): string => m.verdict.parts.map((p) => p.text).join('');
const tallyText = (m: ComposedReviewThreads): string => m.tally.map((c) => `${c.label} ${c.count}`).join(' · ');
const blockIds = (m: ComposedReviewThreads): string[][] => m.threads.files.map((f) => f.findings.map((x) => x.id));
const pathsOf = (m: ComposedReviewThreads): string[] => m.threads.files.map((f) => f.path);
const findingOf = (m: ComposedReviewThreads, id: string): ComposedReviewFinding => {
  for (const file of m.threads.files) {
    const found = file.findings.find((f) => f.id === id);
    if (found) return found;
  }
  throw new Error(`no finding ${id}`);
};
const folded = (m: ComposedReviewThreads): string[] =>
  m.threads.files.flatMap((f) => f.findings.filter((x) => x.defaultFolded).map((x) => x.id));
const textOf = (blocks: { kind: string; text?: string }[]): string => blocks.map((b) => b.text ?? '').join(' ');

const members = compose(L(MEMBERS));
const roles = compose(L(ROLES), contextOf(L(ROLES_FIX)));
const lb01File = `${LB}v1.0-phases/01-read-layer-domain-model/01-REVIEW.md`;
const lb01 = compose(lb01File, contextOf(`${LB}v1.0-phases/01-read-layer-domain-model/01-REVIEW-FIX.md`, 'Read Layer & Domain Model'));
const catalogue = compose(L(CATALOGUE));
const lb05 = compose(`${LB}v1.1-phases/05-per-type-document-views/05-REVIEW.md`);
const clean = compose(F('clean-REVIEW.md'));
const transfers = compose(L(TRANSFERS), contextOf(L(TRANSFERS_FIX)));
const admin = compose(L(ADMIN));
const bulkExport = compose(L(EXPORT));
const lb04 = compose(`${LB}v1.0-phases/04-portability-degradation-hardening/04-REVIEW.md`);

describe('the head', () => {
  it('reads the eyebrow, the title and the Reviewed stamp', () => {
    expect([members.head.eyebrow, lb01.head.eyebrow]).toEqual(Array(2).fill('Code review · Phase 1'));
    expect(catalogue.head.eyebrow).toBe('Code review · Phase 3');
    expect([roles.head.eyebrow, transfers.head.eyebrow]).toEqual(['Code review · Phase 2', 'Code review · Phase 4']);
    expect(lb05.head.eyebrow).toBe('Code review · Phase 5');
    expect(clean.head.eyebrow).toBe('Code review · Phase 7');
    expect(admin.head.eyebrow).toBe('Code review · Phase 3');
    expect(members.head.title).toBe('Member data foundation');
    expect(clean.head.title).toBe('Command palette');
    expect(admin.head.title).toBe('Account Admin & Session Control');
    expect(lb01.head.title).toBe('Read Layer & Domain Model');
    expect(members.head.reviewed).toBe('26 Jan 2026');
    expect(roles.head.reviewed).toBe('31 Mar 2026');
    expect(lb01.head.reviewed).toBe('24 Aug 2026 · 01:10');
    expect(catalogue.head.reviewed).toBe('27 Feb 2026');
    expect(lb05.head.reviewed).toBe('20 Sep 2026 · 20:41');
    expect(clean.head.reviewed).toBe('15 Oct 2026 · 11:20');
    expect(admin.head.reviewed).toBe('8 Apr 2026 · 20:46');
  });

  it('uses a quick id for a quick-task review and falls back to the handler path facts', () => {
    const base = inputOf(F('clean-REVIEW.md'), null);
    const quick = composeReviewThreads({ ...base, frontmatter: { ...base.frontmatter, phase: '261017-k44-build-it' } });
    expect(quick?.head.eyebrow).toBe('Quick code review · 261017-k44');
    const bare = composeReviewThreads({ ...base, frontmatter: { phase: 3 } });
    expect(bare?.head.eyebrow).toBe('Code review · Phase 3');
    const decimal = composeReviewThreads({ ...base, frontmatter: { phase: '02.1-x' } });
    expect(decimal?.head.eyebrow).toBe('Code review · Phase 2.1');
    const fromPath = composeReviewThreads({
      ...base,
      frontmatter: {},
      structured: { review: { ...(base.structured.review as object), pathPhase: { number: '04', slug: 'hardening' }, quickId: null } },
    });
    expect(fromPath?.head.eyebrow).toBe('Code review · Phase 4');
    expect(fromPath?.head.title).toBe('Hardening');
    const none = composeReviewThreads({ ...base, frontmatter: {}, structured: { review: { findings: [] } } });
    expect(none?.head.eyebrow).toBe('Code review');
    expect(none?.head.reviewed).toBeNull();
  });
});

describe('the verdict, the facts and the tally', () => {
  it('reads each pinned verdict, its tone and its sub line', () => {
    const pins: [ComposedReviewThreads, string, string, string][] = [
      [members, '2 of 9 fixed. 7 still in the code.', 'in-flight', '7 open. Reviewed 20 files at standard depth.'],
      [roles, '4 of 10 fixed. 6 still in the code.', 'in-flight', '3 skipped on purpose, 3 not attempted. Reviewed 2 files at standard depth.'],
      [lb01, '5 of 7 fixed. 2 still in the code.', 'in-flight', '2 not attempted. Reviewed 45 files at standard depth.'],
      [catalogue, '26 findings, 4 critical. None fixed yet.', 'missing', '15 warnings, 7 info. Reviewed 20 files at standard depth.'],
      [lb05, '3 findings. None fixed yet.', 'in-flight', '1 warning, 2 info. Reviewed 33 files at standard depth.'],
      [clean, 'Clean. Nothing to fix across 4 files.', 'complete', 'Quick review.'],
      [transfers, '11 of 18 fixed. 7 still in the code, 1 critical.', 'missing', '1 open, 6 not attempted. Reviewed 21 files at standard depth.'],
      [admin, '7 findings. None fixed yet.', 'in-flight', '3 warnings, 4 info. Reviewed 38 files at standard depth.'],
      [bulkExport, '2 of 12 fixed. 10 still in the code.', 'in-flight', '10 open. Reviewed 16 files at standard depth.'],
      [lb04, '5 findings, 2 critical. None fixed yet.', 'missing', '3 warnings, 0 info. Reviewed 36 files at standard depth.'],
    ];
    for (const [model, text, tone, sub] of pins) {
      expect(verdictText(model)).toBe(text);
      expect(model.verdict.tone).toBe(tone);
      expect(model.verdict.sub).toBe(sub);
    }
  });

  it('tones the phrase that matters', () => {
    expect(roles.verdict.parts.find((p) => p.text === '6 still in the code')?.tone).toBe('in-flight');
    expect(transfers.verdict.parts.find((p) => p.text === '7 still in the code')?.tone).toBe('missing');
    expect(transfers.verdict.parts.find((p) => p.text === '1 critical')?.tone).toBe('missing');
    expect(catalogue.verdict.parts.find((p) => p.text === '4 critical')?.tone).toBe('missing');
    expect(clean.verdict.parts[0]).toEqual({ text: 'Clean.', tone: 'complete' });
  });

  it('reads the tally', () => {
    expect(tallyText(members)).toBe('Open 7 · Fixed 2 · Skipped 0 · Not attempted 0');
    expect(tallyText(roles)).toBe('Open 0 · Fixed 4 · Skipped 3 · Not attempted 3');
    expect(tallyText(lb01)).toBe('Open 0 · Fixed 5 · Skipped 0 · Not attempted 2');
    expect(tallyText(catalogue)).toBe('Critical 4 · Warning 15 · Info 7 · Total 26');
    expect(tallyText(lb05)).toBe('Critical 0 · Warning 1 · Info 2 · Total 3');
    expect(tallyText(transfers)).toBe('Open 1 · Fixed 11 · Skipped 0 · Not attempted 6');
    expect(tallyText(admin)).toBe('Critical 0 · Warning 3 · Info 4 · Total 7');
    expect(tallyText(bulkExport)).toBe('Open 10 · Fixed 2 · Skipped 0 · Not attempted 0');
    expect(tallyText(lb04)).toBe('Critical 2 · Warning 3 · Info 0 · Total 5');
    expect(clean.tally).toEqual([]);
    // A zero count takes no tone; the Open number is missing only above zero.
    expect(roles.tally[0].tone).toBeNull();
    expect(members.tally[0].tone).toBe('missing');
    expect(members.tally[1].tone).toBe('complete');
    expect(lb05.tally[0].tone).toBeNull();
  });

  it('lists the facts after Files and Depth', () => {
    const facts = (m: ComposedReviewThreads): string => m.facts.map((f) => `${f.label} ${f.value}`).join(' | ');
    expect(facts(members)).toBe('Files 20 | Depth Standard | Resolved noted in the review itself');
    expect(facts(roles)).toBe('Files 2 | Depth Standard | Fix run 1 Apr 2026 · iteration 1');
    expect(facts(lb01)).toBe('Files 45 | Depth Standard | Fix run 23 Aug 2026 · iteration 1');
    expect(facts(transfers)).toBe('Files 21 | Depth Standard | Fix run 17 Mar 2026 · iteration 1');
    expect(facts(bulkExport)).toBe('Files 16 | Depth Standard | Resolved noted in the review itself');
    expect(facts(catalogue)).toBe('Files 20 | Depth Standard');
    expect(facts(lb05)).toBe('Files 33 | Depth Standard');
    expect(facts(clean)).toBe('Files 4 | Depth Quick');
    expect(facts(admin)).toBe('Files 38 | Depth Standard');
  });

  it('says plainly when the frontmatter counts findings none of which could be read', () => {
    const base = inputOf(F('clean-REVIEW.md'), null);
    const flat = composeReviewThreads({ ...base, frontmatter: { critical_count: 1, warning_count: 2, info_count: 0, depth: 'deep' } });
    expect(verdictText(flat!)).toBe('3 findings counted, none readable here.');
    expect(flat?.verdict.tone).toBe('quiet');
    const nested = composeReviewThreads({ ...base, frontmatter: { findings: { total: 1 } } });
    expect(verdictText(nested!)).toBe('1 finding counted, none readable here.');
    const one = composeReviewThreads({
      ...base,
      structured: { review: { findings: [{ id: 'WR-01', title: 'a', severity: 'warning', inlineResolved: { commit: 'abc1234', note: '' } }] } },
    });
    expect(verdictText(one!)).toBe('The one finding is fixed.');
    expect(one?.verdict.tone).toBe('complete');
  });
});

describe('the quote', () => {
  it('opens on the first Summary paragraph with a by-line and a Full summary link target', () => {
    expect(members.quote?.text.length).toBeGreaterThan(40);
    expect(members.quote?.by).toBe('The reviewer · standard · 20 files');
    expect(members.quote?.more).toBe(true);
    expect(members.quote?.summaryId).toBe('summary');
    expect(clean.quote?.text.startsWith('Reviewed the Cmd-K palette')).toBe(true);
    expect(roles.quote?.more).toBe(false);
    expect(compose(L(ROLES), null, []).quote?.summaryId).toBeNull();
  });
});

describe('the threads', () => {
  it('counts the files and the comments', () => {
    expect(members.threads.aside).toBe('8 files · 9 comments');
    expect(roles.threads.aside).toBe('3 files · 10 comments');
    expect(lb01.threads.aside).toBe('6 files · 7 comments');
    expect(catalogue.threads.aside).toBe('12 files · 26 comments');
    expect(lb05.threads.aside).toBe('3 files · 3 comments');
    expect(clean.threads.aside).toBe('none');
    expect(admin.threads.aside).toBe('6 files · 7 comments');
    expect(lb04.threads.aside).toBe('3 files · 5 comments');
    expect(members.threads.fixedCount).toBe(2);
    expect(roles.threads.fixedCount).toBe(4);
    expect(lb01.threads.fixedCount).toBe(5);
    expect(catalogue.threads.fixedCount).toBe(0);
  });

  it('orders the file blocks worst first and groups findings by their first file', () => {
    const tails = (m: ComposedReviewThreads): string[] => pathsOf(m).map((p) => p.split('/').slice(-2).join('/'));
    expect(tails(members)).toEqual([
      'members/validate.ts', 'members/import.ts', 'test/roster-import.test.ts', 'pages/roster.tsx', 'members/store.ts', 'members/cache.ts', 'api/roster.ts', 'db/open.ts',
    ]);
    expect(blockIds(members)).toEqual([['CR-01'], ['WR-02', 'WR-05'], ['WR-03'], ['WR-04'], ['WR-01'], ['IN-01'], ['IN-02'], ['IN-03']]);
    expect(folded(members)).toEqual(['CR-01', 'WR-01']);
    expect(pathsOf(roles)).toEqual(['server/migrations/0004_roles_and_grants.sql', 'server/src/grants/check.ts', 'docs/roles.md']);
    expect(blockIds(roles)).toEqual([
      ['CR-01', 'CR-02', 'CR-03', 'WR-02', 'WR-03', 'WR-04', 'IN-03'],
      ['WR-01', 'IN-01'],
      ['IN-02'],
    ]);
    expect(folded(roles)).toEqual(['CR-01', 'CR-02', 'CR-03', 'WR-01']);
    expect(pathsOf(lb01).map((p) => p.split('/').pop())).toEqual([
      'crossref.ts', 'roadmap.ts', 'windows.ts', 'serialize.ts', 'package.json', 'generic.ts',
    ]);
    expect(blockIds(lb01)[4]).toEqual(['WR-04', 'IN-02']);
    expect(folded(lb01)).toHaveLength(5);
    expect(blockIds(catalogue).slice(0, 4)).toEqual([
      ['CR-01'],
      ['CR-02', 'WR-04', 'WR-05', 'WR-06', 'WR-09', 'IN-04'],
      ['CR-03', 'WR-02', 'WR-07', 'WR-08', 'WR-11', 'WR-12'],
      ['CR-04', 'IN-01', 'IN-02'],
    ]);
    expect(pathsOf(catalogue).slice(0, 4).map((p) => p.split('/').pop())).toEqual([
      'boundary.ts', 'use-catalogue.ts', 'use-shed-filter.ts', 'page-cursor.ts',
    ]);
    expect(blockIds(lb05)).toEqual([['WR-01'], ['IN-01'], ['IN-02']]);
    expect(pathsOf(lb05).map((p) => p.split('/').pop())).toEqual(['fallback.ts', 'context.ts', 'artifact-page.tsx']);
    expect(blockIds(lb04)).toEqual([['CR-01', 'WR-03'], ['CR-02'], ['WR-01', 'WR-02']]);
    expect(pathsOf(lb04)).toEqual(['src/server/index.ts', 'src/web/styles/globals.css', 'src/presentation/search.ts']);
    expect(blockIds(admin)).toHaveLength(6);
  });

  it('reads the gutter lines', () => {
    expect(findingOf(members, 'WR-01').gutter).toEqual(['L39–89']);
    expect(findingOf(members, 'WR-01').moreFiles).toBe(3);
    expect(findingOf(members, 'CR-01').gutter).toEqual(['L74–92']);
    expect(findingOf(members, 'CR-01').firstLine).toBe('L74');
    expect(findingOf(catalogue, 'WR-03').gutter).toEqual(['L62–81', 'L140–147']);
    expect(findingOf(lb05, 'WR-01').gutter).toEqual(['L56']);
    expect(findingOf(admin, 'WR-03').gutter).toHaveLength(7);
    expect(findingOf(admin, 'WR-03').gutter[0]).toBe('L212');
    expect(findingOf(roles, 'IN-02').moreFiles).toBe(0);
  });

  it('gives the clean review its empty state', () => {
    expect(clean.threads.files).toEqual([]);
    expect(clean.threads.empty).toBe('All reviewed files meet quality standards. No issues found.');
    expect(members.threads.empty).toBeNull();
  });
});

describe('the outcomes', () => {
  it('reads the frontmatter resolved notes with their commits and the open replies', () => {
    expect(findingOf(members, 'CR-01').stamp).toMatchObject({ label: 'Fixed', outcome: 'fixed', commit: '7e3b0d4', tone: 'complete' });
    expect(findingOf(members, 'WR-01').stamp.commit).toBe('c92a5e1');
    expect(findingOf(members, 'WR-02').stamp).toMatchObject({ label: 'Open', outcome: 'open', tone: 'in-flight' });
    expect(findingOf(members, 'WR-02').reply).toMatchObject({ kicker: 'No reply yet', quiet: 'Nothing records a fix for this finding.', mark: '…' });
    expect(findingOf(members, 'IN-01').stamp.tone).toBe('quiet');
  });

  it('reads the fix report: fixed with the applied fix, skipped with the reason, the rest not attempted', () => {
    for (const [id, commit] of [['CR-01', 'e57f1b9'], ['CR-02', '3c9a7d0'], ['CR-03', 'b81e4c2'], ['WR-01', '24d6f08']]) {
      const f = findingOf(roles, id);
      expect(f.stamp).toMatchObject({ outcome: 'fixed', commit });
      expect(f.reply).toMatchObject({ kicker: `Fixed in ${commit}`, mark: '✓' });
      expect(f.reply.note.length).toBeGreaterThan(0);
      expect(f.reply.files.length).toBeGreaterThan(0);
    }
    for (const id of ['WR-02', 'WR-03', 'WR-04']) {
      expect(findingOf(roles, id).stamp).toMatchObject({ label: 'Skipped', outcome: 'skipped', tone: 'quiet', commit: null });
      expect(findingOf(roles, id).reply.kicker).toBe('Skipped on purpose');
    }
    expect(textOf(findingOf(roles, 'WR-02').reply.note).startsWith('Intentionally skipped — accepted project risk.')).toBe(true);
    for (const id of ['IN-01', 'IN-02', 'IN-03']) {
      expect(findingOf(roles, id).stamp).toMatchObject({ label: 'Not attempted', outcome: 'deferred' });
      expect(findingOf(roles, id).reply.quiet).toBeNull();
      expect(textOf(findingOf(roles, id).reply.note)).toBe("Not in the fix run's scope");
    }
  });

  it('says a deferred bullet with no text was outside the fix run', () => {
    const base = inputOf(F('clean-REVIEW.md'), null);
    const model = composeReviewThreads({
      ...base,
      structured: { review: { findings: [{ id: 'IN-01', title: 't', severity: 'info', refs: [{ path: 'a.ts', spans: [] }] }] } },
      reviewContext: { phaseName: null, fix: { path: 'p', url: null, frontmatter: {}, report: { entries: [], deferred: [{ ids: ['IN-01'], note: '' }] } } } as never,
    });
    expect(model?.threads.files[0].findings[0].reply).toMatchObject({ kicker: 'Not attempted', quiet: "Outside the fix run's scope" });
  });

  it('reads labelore phase 1: five fixed, the info notes from the deferred bullets', () => {
    for (const [id, commit] of [['CR-01', '6efec5a'], ['WR-01', 'e3073cb'], ['WR-02', '2c5edfd'], ['WR-03', '803542b'], ['WR-04', '784abef']]) {
      expect(findingOf(lb01, id).stamp).toMatchObject({ outcome: 'fixed', commit });
    }
    expect(findingOf(lb01, 'IN-01').stamp.outcome).toBe('deferred');
    expect(textOf(findingOf(lb01, 'IN-01').reply.note).startsWith('Duplicated title-derivation logic between `generic.ts` and `title.ts`')).toBe(true);
    expect(findingOf(lb01, 'IN-02').reply.kicker).toBe('Not attempted');
  });

  it('reads transfers v1.0 phase 4: combined headings, a commit note and an unaddressed critical', () => {
    for (const [id, commit] of [['WR-04', '9d2c7e6'], ['WR-05', '9d2c7e6'], ['WR-08', 'c7f26a8'], ['WR-09', 'c7f26a8'], ['WR-10', '4be07a2']]) {
      expect(findingOf(transfers, id).stamp).toMatchObject({ outcome: 'fixed', commit });
    }
    expect(textOf(findingOf(transfers, 'WR-10').reply.note).startsWith('(folded into WR-01, as planned)')).toBe(true);
    for (let i = 1; i <= 11; i++) expect(findingOf(transfers, `WR-${String(i).padStart(2, '0')}`).stamp.outcome).toBe('fixed');
    expect(findingOf(transfers, 'CR-01').stamp).toMatchObject({ label: 'Open', outcome: 'open', tone: 'missing' });
    expect(findingOf(transfers, 'CR-01').reply.quiet).toBe('The fix run did not address this.');
    for (let i = 1; i <= 6; i++) expect(findingOf(transfers, `IN-0${i}`).stamp.outcome).toBe('deferred');
  });

  it('reads blockers_resolved', () => {
    expect(findingOf(bulkExport, 'CR-01').stamp).toMatchObject({ outcome: 'fixed', commit: 'a3d90e5' });
    expect(findingOf(bulkExport, 'CR-02').stamp).toMatchObject({ outcome: 'fixed', commit: '5f21c7b' });
    expect(textOf(findingOf(bulkExport, 'CR-01').reply.note)).toBe('fixed 2026-04-15');
    expect(findingOf(bulkExport, 'WR-01').stamp.outcome).toBe('open');
  });

  it('ranks a fixed critical below an open warning and an open critical first', () => {
    const order = (m: ComposedReviewThreads): string[] => m.threads.files.flatMap((f) => f.findings.map((x) => x.id));
    expect(order(bulkExport).slice(0, 3)).toEqual(['CR-01', 'WR-01', 'WR-02']);
    expect(catalogue.threads.files[0].findings[0].id).toBe('CR-01');
  });
});

describe('degradation', () => {
  it('returns null without structured.review', () => {
    const base = inputOf(F('clean-REVIEW.md'), null);
    expect(composeReviewThreads({ ...base, structured: {} })).toBeNull();
    expect(composeReviewThreads({ ...base, structured: { review: 'x' as never } })).toBeNull();
    expect(composeReviewThreads({ ...base, structured: { review: [] as never } })).toBeNull();
  });

  it('never throws when frontmatter, structured or reviewContext hold junk', () => {
    const base = inputOf(L(ROLES), null);
    const review = base.structured.review as Record<string, unknown>;
    const junk: unknown[] = [null, 5, 'x', [], {}, [null], { id: 5 }, true];
    for (const value of junk) {
      expect(() =>
        composeReviewThreads({
          ...base,
          frontmatter: value as never,
          structured: { review: { ...review, findings: value, summary: value, h1: value, pathPhase: value, quickId: value } },
          reviewContext: value as never,
        }),
      ).not.toThrow();
      expect(() =>
        composeReviewThreads({
          ...base,
          frontmatter: { reviewed: value, depth: value, files_reviewed: value, files_reviewed_list: value, resolved: value, blockers_resolved: value, findings: value, phase: value },
          reviewContext: { phaseName: value, fix: { path: value, url: value, frontmatter: value, report: value } } as never,
        }),
      ).not.toThrow();
    }
    const odd = composeReviewThreads({
      ...base,
      reviewContext: { phaseName: 7, fix: { report: { entries: [null, { ids: 'x', outcome: 'fixed' }, { ids: ['CR-01'], outcome: 'weird' }], deferred: [5] } } } as never,
    });
    expect(odd).not.toBeNull();
  });
});

function markupOf(model: ComposedReviewThreads, initialUnfolded: string[] = []): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ReviewThreadsView, {
        model,
        fallbackTitle: 'Review',
        path: '.planning/phases/02-container-docs/02-REVIEW.md',
        mode: 'view',
        onModeChange: () => undefined,
        onShowSource: () => undefined,
        chip: null,
        initialUnfolded,
      }),
    ),
  );
}

describe('the view', () => {
  it('renders the head, the hero and the threads for roles phase 2', () => {
    const markup = markupOf(roles);
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain('Code review · Phase 2');
    expect(markup).toContain('Reviewed <b>31 Mar 2026</b>');
    expect(markup).toContain('4 of 10 fixed. ');
    expect(markup).toContain('6 still in the code');
    expect(markup.match(/view-review-resolved"/g)).toHaveLength(4);
    expect(markup.match(/<article/g)).toHaveLength(6);
    expect(markup).toContain('Skipped on purpose');
    expect(markup).toContain('Intentionally skipped');
    expect(markup.includes('Full summary')).toBe(roles.quote?.more ?? false);
  });

  it('unfolds a fixed thread with its commit, its suggested change and Fold −', () => {
    const markup = markupOf(roles, ['CR-01']);
    expect(markup).toContain('Fixed in e57f1b9');
    expect(markup).toContain('Suggested change');
    expect(markup).toContain('Fold −');
    expect(markup.match(/view-review-resolved"/g)).toHaveLength(3);
    expect(markupOf(roles)).not.toContain('Fold −');
  });

  it('renders the clean review with its empty state and no tally', () => {
    const markup = markupOf(clean);
    expect(markup).toContain('Clean.');
    expect(markup).toContain('All reviewed files meet quality standards. No issues found.');
    expect(markup).not.toContain('view-review-tally');
  });

  it('writes no raw html and no document-derived link', () => {
    const markup = markupOf(catalogue);
    expect(markup).not.toContain('dangerouslySetInnerHTML');
    expect(markup).not.toContain('<a ');
    expect(markup).not.toContain('href=');
  });
});

describe('the line ruler, locations and extra fields', () => {
  it('positions one mark per span in the file header', () => {
    const dockerfile = roles.threads.files[0];
    expect(dockerfile.ruler).toHaveLength(7);
    const cr01 = dockerfile.ruler.find((mark) => mark.label === 'CR-01 · L1');
    expect(cr01).toMatchObject({ severity: 'critical', outcome: 'fixed' });
    // from / (max to x 1.08): the largest span ends at line 20, so line 1 sits at 1 / 21.6 = 4.6%.
    expect(cr01?.left).toBe(4.6);
    expect(cr01?.width).toBe(0.8);
    expect(dockerfile.ruler.find((mark) => mark.label.startsWith('IN-03'))?.label).toBe('IN-03 · L17–18');
    expect(roles.threads.files[2].ruler).toHaveLength(1);
    const noLines = composeReviewThreads({
      ...inputOf(F('clean-REVIEW.md'), null),
      structured: { review: { findings: [{ id: 'IN-01', title: 't', severity: 'info', refs: [{ path: 'a.ts', spans: [] }] }] } },
    });
    expect(noLines?.threads.files[0].ruler).toEqual([]);
  });

  it('lists the other files a finding names, and shows its extra labelled blocks', () => {
    expect(findingOf(members, 'WR-01').locations.map((l) => `${l.name}:${l.spans} ${l.dir}`)).toEqual([
      'import.ts:18–32 server/src/members',
      'roster.ts:41–47 server/src/api',
      'card.ts:44–46 server/src/api',
    ]);
    expect(findingOf(members, 'CR-01').locations).toEqual([]);
    expect(findingOf(admin, 'WR-01').extra.map((e) => e.label)).toEqual(['Failure scenario']);
    const markup = markupOf(admin);
    expect(markup).toContain('Failure scenario');
  });
});

describe('quiet files, the files dialog, the Also row and the footer', () => {
  it('lists the reviewed files no finding names', () => {
    expect(lb05.quiet?.label).toBe('Reviewed with nothing to say · 39');
    expect(lb05.quiet?.files).toHaveLength(39);
    expect(members.quiet?.files).toHaveLength(11);
    expect(lb01.quiet?.files).toHaveLength(40);
    expect(catalogue.quiet?.files).toHaveLength(6);
    expect(clean.quiet?.files).toHaveLength(4);
    expect(roles.quiet).toBeNull();
    expect(admin.quiet).toBeNull();
    const markup = markupOf(lb05);
    expect(markup).toContain('+25 more');
    expect(markup.match(/<code title=/g)).toHaveLength(14);
  });

  it('builds the files dialog and the Outside scope marks', () => {
    expect(lb01.filesDialog?.title).toBe('Files reviewed · 46');
    expect(lb01.filesDialog?.note).toBe('The frontmatter counts 45.');
    expect(roles.filesDialog?.title).toBe('Files reviewed · 2');
    expect(roles.filesDialog?.rows).toHaveLength(3);
    expect(roles.filesDialog?.rows[2]).toEqual({ path: 'server/src/grants/check.ts', outsideScope: true, ids: ['WR-01', 'IN-01'] });
    expect(roles.filesDialog?.note).toBeNull();
    expect(roles.threads.files.map((f) => f.outsideScope)).toEqual([false, true, false]);
    expect(roles.facts[0].opensFiles).toBe(true);
    expect(admin.filesDialog).toBeNull();
    expect(admin.facts[0].opensFiles).toBe(false);
    expect(admin.threads.files.some((f) => f.outsideScope)).toBe(false);
    expect(markupOf(roles)).toContain('Outside scope');
  });

  it('lists the Also chips in order', () => {
    const chips = (m: ComposedReviewThreads): string[] => m.also.map((a) => a.label);
    expect(chips(members)).toEqual(['Files reviewed · 20', 'Frontmatter']);
    expect(chips(roles)).toEqual(['Fix report · Partial', 'Files reviewed · 2', 'Frontmatter']);
    expect(chips(lb01)).toEqual(['Fix report · All fixed', 'Files reviewed · 45', 'Frontmatter']);
    expect(chips(catalogue)).toEqual(['Files reviewed · 20', 'Frontmatter']);
    expect(chips(lb05)).toEqual(['Files reviewed · 33', 'Frontmatter']);
    expect(chips(clean)).toEqual(['Files reviewed · 4', 'Frontmatter']);
    expect(chips(admin)).toEqual(['Areas Reviewed Clean', 'Frontmatter']);
    expect(chips(transfers)).toEqual(['Fix report · All fixed', 'Files reviewed · 21', 'Frontmatter']);
    expect(chips(lb04)).toEqual(['Files reviewed · 36', 'Frontmatter']);
    expect(roles.also[0]).toMatchObject({ kind: 'fix', url: '/artifacts/fix' });
    expect(admin.also[0]).toMatchObject({ kind: 'section', targetId: 'areas-reviewed-clean' });
    expect(admin.also[1]).toMatchObject({ kind: 'frontmatter', targetId: null });
  });

  it('renders the Also row with the fix report as a link and the footer', () => {
    const markup = markupOf(roles);
    expect(markup).toContain('aria-label="Also in this report"');
    expect(markup).toContain('href="/artifacts/fix"');
    expect(markup).toContain('Fix report · Partial');
    expect(markup).toContain('Show fixed threads (4)');
    expect(markup).toContain('Reviewer · Claude (gsd-code-reviewer)');
    expect(markup).toContain('Depth · standard');
    expect(markupOf(lb04)).toContain('Reviewer · the agent (gsd-code-reviewer)');
    expect(markupOf(clean)).toContain('Depth · quick');
    expect(markupOf(catalogue)).not.toContain('Show fixed threads');
    expect(markupOf(lb05)).not.toContain('Show fixed threads');
    expect(markupOf(roles).match(/href=/g)).toHaveLength(1);
  });
});
