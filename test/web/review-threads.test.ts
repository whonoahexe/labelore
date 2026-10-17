// quick-261017-k44 (sketch 022 C): the REVIEW composer and view, pinned against the nine copied
// reports (test/fixtures/review/), labelore's own reviews and the junk-input degrade paths. The
// ViewInput literals come from the handlers' real parse of each file (round-tripped through JSON, as
// the server serves them); the reviewContext of a pair is built by hand from the handler's parse of
// its REVIEW-FIX, as the server join would. Pinned values come from the sketch's own data.js and grep
// over the source files, independent of the composer's output.
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

const FIXTURES = new URL('../fixtures/review/', import.meta.url).pathname;
const LB = new URL('../../.planning/milestones/', import.meta.url).pathname;

function refOf(path: string, kind: string): ArtifactRef {
  return { path, kind, location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
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

const sp01 = compose(F('sp01-REVIEW.md'));
const sb02 = compose(F('sb02-REVIEW.md'), contextOf(F('sb02-REVIEW-FIX.md')));
const lb01File = `${LB}v1.0-phases/01-read-layer-domain-model/01-REVIEW.md`;
const lb01 = compose(lb01File, contextOf(`${LB}v1.0-phases/01-read-layer-domain-model/01-REVIEW-FIX.md`, 'Read Layer & Domain Model'));
const dd01 = compose(F('dd01-REVIEW.md'));
const lb05 = compose(`${LB}v1.1-phases/05-per-type-document-views/05-REVIEW.md`);
const clean = compose(F('clean-REVIEW.md'));
const dd02 = compose(F('dd02-REVIEW.md'), contextOf(F('dd02-REVIEW-FIX.md')));
const sp03 = compose(F('sp03-REVIEW.md'));
const sb14 = compose(F('sb14-REVIEW.md'));
const lb04 = compose(`${LB}v1.0-phases/04-portability-degradation-hardening/04-REVIEW.md`);

describe('the head', () => {
  it('reads the eyebrow, the title and the Reviewed stamp', () => {
    expect([sp01.head.eyebrow, lb01.head.eyebrow, dd01.head.eyebrow]).toEqual(Array(3).fill('Code review · Phase 1'));
    expect([sb02.head.eyebrow, dd02.head.eyebrow]).toEqual(['Code review · Phase 2', 'Code review · Phase 2']);
    expect(lb05.head.eyebrow).toBe('Code review · Phase 5');
    expect(clean.head.eyebrow).toBe('Code review · Phase 7');
    expect(sp03.head.eyebrow).toBe('Code review · Phase 3');
    expect(sp01.head.title).toBe('Identity persistence foundation');
    expect(clean.head.title).toBe('Command palette');
    expect(sp03.head.title).toBe('Account Administration & Session Control');
    expect(lb01.head.title).toBe('Read Layer & Domain Model');
    expect(sp01.head.reviewed).toBe('17 Jul 2026');
    expect(sb02.head.reviewed).toBe('13 May 2026');
    expect(lb01.head.reviewed).toBe('24 Aug 2026 · 01:10');
    expect(dd01.head.reviewed).toBe('24 Jul 2026');
    expect(lb05.head.reviewed).toBe('20 Sep 2026 · 20:41');
    expect(clean.head.reviewed).toBe('15 Oct 2026 · 11:20');
    expect(sp03.head.reviewed).toBe('18 Aug 2026 · 20:46');
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
      [sp01, '2 of 9 fixed. 7 still in the code.', 'in-flight', '7 open. Reviewed 20 files at standard depth.'],
      [sb02, '4 of 10 fixed. 6 still in the code.', 'in-flight', '3 skipped on purpose, 3 not attempted. Reviewed 2 files at standard depth.'],
      [lb01, '5 of 7 fixed. 2 still in the code.', 'in-flight', '2 not attempted. Reviewed 45 files at standard depth.'],
      [dd01, '26 findings, 4 critical. None fixed yet.', 'missing', '15 warnings, 7 info. Reviewed 20 files at standard depth.'],
      [lb05, '3 findings. None fixed yet.', 'in-flight', '1 warning, 2 info. Reviewed 33 files at standard depth.'],
      [clean, 'Clean. Nothing to fix across 4 files.', 'complete', 'Quick review.'],
      [dd02, '11 of 18 fixed. 7 still in the code, 1 critical.', 'missing', '1 open, 6 not attempted. Reviewed 21 files at standard depth.'],
      [sp03, '7 findings. None fixed yet.', 'in-flight', '3 warnings, 4 info. Reviewed 38 files at standard depth.'],
      [sb14, '2 of 12 fixed. 10 still in the code.', 'in-flight', '10 open. Reviewed 16 files at standard depth.'],
      [lb04, '5 findings, 2 critical. None fixed yet.', 'missing', '3 warnings, 0 info. Reviewed 36 files at standard depth.'],
    ];
    for (const [model, text, tone, sub] of pins) {
      expect(verdictText(model)).toBe(text);
      expect(model.verdict.tone).toBe(tone);
      expect(model.verdict.sub).toBe(sub);
    }
  });

  it('tones the phrase that matters', () => {
    expect(sb02.verdict.parts.find((p) => p.text === '6 still in the code')?.tone).toBe('in-flight');
    expect(dd02.verdict.parts.find((p) => p.text === '7 still in the code')?.tone).toBe('missing');
    expect(dd02.verdict.parts.find((p) => p.text === '1 critical')?.tone).toBe('missing');
    expect(dd01.verdict.parts.find((p) => p.text === '4 critical')?.tone).toBe('missing');
    expect(clean.verdict.parts[0]).toEqual({ text: 'Clean.', tone: 'complete' });
  });

  it('reads the tally', () => {
    expect(tallyText(sp01)).toBe('Open 7 · Fixed 2 · Skipped 0 · Not attempted 0');
    expect(tallyText(sb02)).toBe('Open 0 · Fixed 4 · Skipped 3 · Not attempted 3');
    expect(tallyText(lb01)).toBe('Open 0 · Fixed 5 · Skipped 0 · Not attempted 2');
    expect(tallyText(dd01)).toBe('Critical 4 · Warning 15 · Info 7 · Total 26');
    expect(tallyText(lb05)).toBe('Critical 0 · Warning 1 · Info 2 · Total 3');
    expect(tallyText(dd02)).toBe('Open 1 · Fixed 11 · Skipped 0 · Not attempted 6');
    expect(tallyText(sp03)).toBe('Critical 0 · Warning 3 · Info 4 · Total 7');
    expect(tallyText(sb14)).toBe('Open 10 · Fixed 2 · Skipped 0 · Not attempted 0');
    expect(tallyText(lb04)).toBe('Critical 2 · Warning 3 · Info 0 · Total 5');
    expect(clean.tally).toEqual([]);
    // A zero count takes no tone; the Open number is missing only above zero.
    expect(sb02.tally[0].tone).toBeNull();
    expect(sp01.tally[0].tone).toBe('missing');
    expect(sp01.tally[1].tone).toBe('complete');
    expect(lb05.tally[0].tone).toBeNull();
  });

  it('lists the facts after Files and Depth', () => {
    const facts = (m: ComposedReviewThreads): string => m.facts.map((f) => `${f.label} ${f.value}`).join(' | ');
    expect(facts(sp01)).toBe('Files 20 | Depth Standard | Resolved noted in the review itself');
    expect(facts(sb02)).toBe('Files 2 | Depth Standard | Fix run 13 May 2026 · iteration 1');
    expect(facts(lb01)).toBe('Files 45 | Depth Standard | Fix run 23 Aug 2026 · iteration 1');
    expect(facts(dd02)).toBe('Files 21 | Depth Standard | Fix run 29 Jul 2026 · iteration 1');
    expect(facts(sb14)).toBe('Files 16 | Depth Standard | Resolved noted in the review itself');
    expect(facts(dd01)).toBe('Files 20 | Depth Standard');
    expect(facts(lb05)).toBe('Files 33 | Depth Standard');
    expect(facts(clean)).toBe('Files 4 | Depth Quick');
    expect(facts(sp03)).toBe('Files 38 | Depth Standard');
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
    expect(sp01.quote?.text.length).toBeGreaterThan(40);
    expect(sp01.quote?.by).toBe('The reviewer · standard · 20 files');
    expect(sp01.quote?.more).toBe(true);
    expect(sp01.quote?.summaryId).toBe('summary');
    expect(clean.quote?.text.startsWith('Reviewed the Cmd-K palette')).toBe(true);
    expect(sb02.quote?.more).toBe(false);
    expect(compose(F('sb02-REVIEW.md'), null, []).quote?.summaryId).toBeNull();
  });
});

describe('the threads', () => {
  it('counts the files and the comments', () => {
    expect(sp01.threads.aside).toBe('8 files · 9 comments');
    expect(sb02.threads.aside).toBe('3 files · 10 comments');
    expect(lb01.threads.aside).toBe('6 files · 7 comments');
    expect(dd01.threads.aside).toBe('12 files · 26 comments');
    expect(lb05.threads.aside).toBe('3 files · 3 comments');
    expect(clean.threads.aside).toBe('none');
    expect(sp03.threads.aside).toBe('6 files · 7 comments');
    expect(lb04.threads.aside).toBe('3 files · 5 comments');
    expect(sp01.threads.fixedCount).toBe(2);
    expect(sb02.threads.fixedCount).toBe(4);
    expect(lb01.threads.fixedCount).toBe(5);
    expect(dd01.threads.fixedCount).toBe(0);
  });

  it('orders the file blocks worst first and groups findings by their first file', () => {
    const tails = (m: ComposedReviewThreads): string[] => pathsOf(m).map((p) => p.split('/').slice(-2).join('/'));
    expect(tails(sp01)).toEqual([
      'auth/mod.rs', 'tickets/mint.rs', 'tests/jwt_verification.rs', 'app/page.tsx', 'tickets/store.rs', 'auth/jwt.rs', 'ws/mod.rs', 'db/mod.rs',
    ]);
    expect(blockIds(sp01)).toEqual([['CR-01'], ['WR-02', 'WR-05'], ['WR-03'], ['WR-04'], ['WR-01'], ['IN-01'], ['IN-02'], ['IN-03']]);
    expect(folded(sp01)).toEqual(['CR-01', 'WR-01']);
    expect(pathsOf(sb02)).toEqual(['lens.sideby.me/Dockerfile', 'lens.sideby.me/src/extraction/ytdlp.ts', 'CLAUDE.md']);
    expect(blockIds(sb02)).toEqual([
      ['CR-01', 'CR-02', 'CR-03', 'WR-02', 'WR-03', 'WR-04', 'IN-03'],
      ['WR-01', 'IN-01'],
      ['IN-02'],
    ]);
    expect(folded(sb02)).toEqual(['CR-01', 'CR-02', 'CR-03', 'WR-01']);
    expect(pathsOf(lb01).map((p) => p.split('/').pop())).toEqual([
      'crossref.ts', 'roadmap.ts', 'windows.ts', 'serialize.ts', 'package.json', 'generic.ts',
    ]);
    expect(blockIds(lb01)[4]).toEqual(['WR-04', 'IN-02']);
    expect(folded(lb01)).toHaveLength(5);
    expect(blockIds(dd01).slice(0, 4)).toEqual([
      ['CR-01'],
      ['CR-02', 'WR-05', 'WR-06', 'WR-07', 'WR-10', 'IN-05'],
      ['CR-03', 'WR-02', 'WR-08', 'WR-09', 'WR-12', 'WR-13'],
      ['CR-04', 'IN-01', 'IN-02'],
    ]);
    expect(pathsOf(dd01).slice(0, 4).map((p) => p.split('/').pop())).toEqual([
      'FaceReconWorkspacePage.tsx', 'useFaceVolume.ts', 'useFaceEligibility.ts', 'faceReconBridgeStore.ts',
    ]);
    expect(blockIds(lb05)).toEqual([['WR-01'], ['IN-01'], ['IN-02']]);
    expect(pathsOf(lb05).map((p) => p.split('/').pop())).toEqual(['fallback.ts', 'context.ts', 'artifact-page.tsx']);
    expect(blockIds(lb04)).toEqual([['CR-01', 'WR-03'], ['CR-02'], ['WR-01', 'WR-02']]);
    expect(pathsOf(lb04)).toEqual(['src/server/index.ts', 'src/web/styles/globals.css', 'src/presentation/search.ts']);
    expect(blockIds(sp03)).toHaveLength(6);
  });

  it('reads the gutter lines', () => {
    expect(findingOf(sp01, 'WR-01').gutter).toEqual(['L39–89']);
    expect(findingOf(sp01, 'WR-01').moreFiles).toBe(3);
    expect(findingOf(sp01, 'CR-01').gutter).toEqual(['L116–134']);
    expect(findingOf(sp01, 'CR-01').firstLine).toBe('L116');
    expect(findingOf(dd01, 'WR-03').gutter).toEqual(['L79–96', 'L195–202']);
    expect(findingOf(lb05, 'WR-01').gutter).toEqual(['L56']);
    expect(findingOf(sp03, 'WR-03').gutter).toHaveLength(7);
    expect(findingOf(sp03, 'WR-03').gutter[0]).toBe('L297');
    expect(findingOf(sb02, 'IN-02').moreFiles).toBe(0);
  });

  it('gives the clean review its empty state', () => {
    expect(clean.threads.files).toEqual([]);
    expect(clean.threads.empty).toBe('All reviewed files meet quality standards. No issues found.');
    expect(sp01.threads.empty).toBeNull();
  });
});

describe('the outcomes', () => {
  it('reads the frontmatter resolved notes with their commits and the open replies', () => {
    expect(findingOf(sp01, 'CR-01').stamp).toMatchObject({ label: 'Fixed', outcome: 'fixed', commit: '0a20ed2', tone: 'complete' });
    expect(findingOf(sp01, 'WR-01').stamp.commit).toBe('3748536');
    expect(findingOf(sp01, 'WR-02').stamp).toMatchObject({ label: 'Open', outcome: 'open', tone: 'in-flight' });
    expect(findingOf(sp01, 'WR-02').reply).toMatchObject({ kicker: 'No reply yet', quiet: 'Nothing records a fix for this finding.', mark: '…' });
    expect(findingOf(sp01, 'IN-01').stamp.tone).toBe('quiet');
  });

  it('reads the fix report: fixed with the applied fix, skipped with the reason, the rest not attempted', () => {
    for (const [id, commit] of [['CR-01', 'fea7e47'], ['CR-02', '77a459a'], ['CR-03', 'd1c6017'], ['WR-01', '9896b11']]) {
      const f = findingOf(sb02, id);
      expect(f.stamp).toMatchObject({ outcome: 'fixed', commit });
      expect(f.reply).toMatchObject({ kicker: `Fixed in ${commit}`, mark: '✓' });
      expect(f.reply.note.length).toBeGreaterThan(0);
      expect(f.reply.files.length).toBeGreaterThan(0);
    }
    for (const id of ['WR-02', 'WR-03', 'WR-04']) {
      expect(findingOf(sb02, id).stamp).toMatchObject({ label: 'Skipped', outcome: 'skipped', tone: 'quiet', commit: null });
      expect(findingOf(sb02, id).reply.kicker).toBe('Skipped on purpose');
    }
    expect(textOf(findingOf(sb02, 'WR-02').reply.note).startsWith('Intentionally skipped — accepted project risk.')).toBe(true);
    for (const id of ['IN-01', 'IN-02', 'IN-03']) {
      expect(findingOf(sb02, id).stamp).toMatchObject({ label: 'Not attempted', outcome: 'deferred' });
      expect(findingOf(sb02, id).reply.quiet).toBeNull();
      expect(textOf(findingOf(sb02, id).reply.note)).toBe("Not in the fix run's scope");
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

  it('reads deid phase 2: combined headings, a commit note and an unaddressed critical', () => {
    for (const [id, commit] of [['WR-04', 'd76d768'], ['WR-05', 'd76d768'], ['WR-08', '69538c9'], ['WR-09', '69538c9'], ['WR-10', 'ce9ed8f']]) {
      expect(findingOf(dd02, id).stamp).toMatchObject({ outcome: 'fixed', commit });
    }
    expect(textOf(findingOf(dd02, 'WR-10').reply.note).startsWith('(folded into WR-01, as instructed)')).toBe(true);
    for (let i = 1; i <= 11; i++) expect(findingOf(dd02, `WR-${String(i).padStart(2, '0')}`).stamp.outcome).toBe('fixed');
    expect(findingOf(dd02, 'CR-01').stamp).toMatchObject({ label: 'Open', outcome: 'open', tone: 'missing' });
    expect(findingOf(dd02, 'CR-01').reply.quiet).toBe('The fix run did not address this.');
    for (let i = 1; i <= 6; i++) expect(findingOf(dd02, `IN-0${i}`).stamp.outcome).toBe('deferred');
  });

  it('reads blockers_resolved', () => {
    expect(findingOf(sb14, 'CR-01').stamp).toMatchObject({ outcome: 'fixed', commit: 'f6ad4d8' });
    expect(findingOf(sb14, 'CR-02').stamp).toMatchObject({ outcome: 'fixed', commit: '812d8ba' });
    expect(textOf(findingOf(sb14, 'CR-01').reply.note)).toBe('fixed 2026-06-11');
    expect(findingOf(sb14, 'WR-01').stamp.outcome).toBe('open');
  });

  it('ranks a fixed critical below an open warning and an open critical first', () => {
    const order = (m: ComposedReviewThreads): string[] => m.threads.files.flatMap((f) => f.findings.map((x) => x.id));
    expect(order(sb14).slice(0, 3)).toEqual(['CR-01', 'WR-01', 'WR-02']);
    expect(dd01.threads.files[0].findings[0].id).toBe('CR-01');
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
    const base = inputOf(F('sb02-REVIEW.md'), null);
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
  it('renders the head, the hero and the threads for sideby phase 2', () => {
    const markup = markupOf(sb02);
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain('Code review · Phase 2');
    expect(markup).toContain('Reviewed <b>13 May 2026</b>');
    expect(markup).toContain('4 of 10 fixed. ');
    expect(markup).toContain('6 still in the code');
    expect(markup.match(/view-review-resolved"/g)).toHaveLength(4);
    expect(markup.match(/<article/g)).toHaveLength(6);
    expect(markup).toContain('Skipped on purpose');
    expect(markup).toContain('Intentionally skipped');
    expect(markup.includes('Full summary')).toBe(sb02.quote?.more ?? false);
  });

  it('unfolds a fixed thread with its commit, its suggested change and Fold −', () => {
    const markup = markupOf(sb02, ['CR-01']);
    expect(markup).toContain('Fixed in fea7e47');
    expect(markup).toContain('Suggested change');
    expect(markup).toContain('Fold −');
    expect(markup.match(/view-review-resolved"/g)).toHaveLength(3);
    expect(markupOf(sb02)).not.toContain('Fold −');
  });

  it('renders the clean review with its empty state and no tally', () => {
    const markup = markupOf(clean);
    expect(markup).toContain('Clean.');
    expect(markup).toContain('All reviewed files meet quality standards. No issues found.');
    expect(markup).not.toContain('view-review-tally');
  });

  it('writes no raw html and no document-derived link', () => {
    const markup = markupOf(dd01);
    expect(markup).not.toContain('dangerouslySetInnerHTML');
    expect(markup).not.toContain('<a ');
    expect(markup).not.toContain('href=');
  });
});
