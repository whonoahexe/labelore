// Phase 10 (10-21, VIEW-12): the DOM-VERIFY.md handler and extractor. It reads the outcome, the reason, the four counts
// (frontmatter numbers only) and one criterion per verdict line into `structured.domVerify`, on the made-up Lendshed
// browser checks (03 verified with failures, 01 could not look, 02 nothing to report) (VIEW-21). Nothing is recomputed,
// and a target or a time is read only from a line the body states (RESEARCH C5).
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { DomVerifyHandler, extractDomVerify } from '../src/planning-repo/handlers/dom-verify.ts';
import type { DomVerifyBody } from '../src/planning-repo/handlers/dom-verify.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { fxRead } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const PATH = '.planning/phases/03-account-admin-and-sessions/03-DOM-VERIFY.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'dom-verify',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function raw(content: string, path: string = PATH): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

const VERIFIED = fxRead('phases/03-account-admin-and-sessions/03-DOM-VERIFY.md');

/** The extractor's reading of a whole file, frontmatter included. */
function read(content: string): DomVerifyBody {
  const fm = tryParseFrontmatter(content);
  return extractDomVerify(fm.data, fm.body);
}

describe('DomVerifyHandler', () => {
  it('claims a DOM-VERIFY ref ahead of the generic handler, and no other check file', () => {
    expect(DomVerifyHandler.match(ref())).toBe(true);
    expect(DomVerifyHandler.match(ref('.planning/phases/03-account-admin-and-sessions/03-EVAL-REVIEW.md'))).toBe(false);
    expect(DomVerifyHandler.match(ref('.planning/phases/03-account-admin-and-sessions/03-VERIFICATION.md'))).toBe(false);
    expect(DomVerifyHandler.match(ref('.planning/phases/03-account-admin-and-sessions/03-CONTEXT.md'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(DomVerifyHandler);
    expect(HANDLERS.indexOf(DomVerifyHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('carries the title, the body and the reading in structured.domVerify', () => {
    const result = DomVerifyHandler.parse(raw(VERIFIED), ref());
    expect(result.title).toBe('DOM verification: Phase 3, wave 2');
    expect(result.body).toContain('Seven criteria');
    expect((result.structured?.domVerify as DomVerifyBody).outcome).toBe('verified');
  });

  it('keeps the title, body and frontmatter when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/fenced-sections.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/fenced-sections.ts')>()),
      eachLineOutsideFences: () => {
        throw new Error('boom');
      },
    }));
    const { DomVerifyHandler: Guarded } = await import('../src/planning-repo/handlers/dom-verify.ts');
    const result = Guarded.parse(raw('---\nstatus: kept\n---\n\n# A browser check\n\nBody text.\n'), ref());
    expect(result.title).toBe('A browser check');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('kept');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/fenced-sections.ts');
  });
});

describe('extractDomVerify - 03-DOM-VERIFY (verified, with failures)', () => {
  const check = read(VERIFIED);

  it('reads the outcome, the reason and the wave as the frontmatter states them', () => {
    expect(check.outcome).toBe('verified');
    expect(check.reason).toBe('ok');
    expect(check.wave).toBe(2);
    expect(check.phase).toBe('Phase 3');
  });

  it('reads the counts from the frontmatter: 7 checked, 4 passed, 2 failed, 1 needs review', () => {
    expect(check.counts).toEqual({ checked: 7, passed: 4, failed: 2, needsReview: 1 });
  });

  it('reads seven criteria in file order, the verdict word read through bold and backticks', () => {
    expect(check.criteria.map((c) => c.verdict)).toEqual([
      'passed',
      'passed',
      'passed',
      'failed',
      'passed',
      'failed',
      'needs_review',
    ]);
    expect(check.criteria[3].text).toBe(
      'the danger block\'s button reads `Remove member`; the contract asks for "Delete member".',
    );
    expect(check.criteria[0].text.startsWith('the create-member dialog opens')).toBe(true);
  });

  it('keeps the intro line as a paragraph and reads the targets the body names in backticks', () => {
    expect(check.paragraphs).toHaveLength(1);
    expect(check.paragraphs[0]).toContain('Seven criteria from the Copywriting Contract');
    expect(check.targets).toEqual(['/desk', '/stewards/{id}']);
    expect(check.target).toBe('/desk');
    expect(check.checkedAt).toBeNull();
  });
});

const COULD_NOT_LOOK = fxRead('phases/01-member-sign-in-sessions/01-DOM-VERIFY.md');
const NOTHING_TO_REPORT = fxRead('phases/02-roles-and-permissions/02-DOM-VERIFY.md');

describe('extractDomVerify - 01-DOM-VERIFY (could not look) and 02-DOM-VERIFY (nothing to report)', () => {
  it('reads 01 as could_not_look with target_unreachable, zero counts, no criterion and the address the body names', () => {
    const check = read(COULD_NOT_LOOK);
    expect(check.outcome).toBe('could_not_look');
    expect(check.reason).toBe('target_unreachable');
    expect(check.wave).toBe(2);
    expect(check.counts).toEqual({ checked: 0, passed: 0, failed: 0, needsReview: 0 });
    expect(check.criteria).toEqual([]);
    expect(check.targets).toEqual(['http://localhost:4871/sign-in']);
    expect(check.paragraphs).toHaveLength(2);
  });

  it('reads 02 as nothing_to_report with no_criteria, no criterion and no target', () => {
    const check = read(NOTHING_TO_REPORT);
    expect(check.outcome).toBe('nothing_to_report');
    expect(check.reason).toBe('no_criteria');
    expect(check.wave).toBe(1);
    expect(check.criteria).toEqual([]);
    expect(check.target).toBeNull();
    expect(check.targets).toEqual([]);
    expect(check.paragraphs).toHaveLength(1);
  });

  it('ignores every other frontmatter key, the made-up marker keys included', () => {
    const check = read(COULD_NOT_LOOK);
    expect(Object.keys(check).sort()).toEqual(
      ['checkedAt', 'counts', 'criteria', 'outcome', 'paragraphs', 'phase', 'reason', 'target', 'targets', 'wave'].sort(),
    );
  });
});

describe('extractDomVerify - the verdict word, read tolerantly', () => {
  const body = (lines: string[]): DomVerifyBody => extractDomVerify({}, `\n# DOM verification: Phase 4, wave 1\n\n${lines.join('\n')}\n`);

  it('reads plain, bold, backticked, bracketed and upper-case verdict words, with the colon inside or outside', () => {
    const check = body([
      '- passed: plain',
      '- **failed**: bold outside',
      '- **needs_review:** bold inside',
      '- `needs_review`: backticks',
      '- [passed] brackets',
      '- FAILED: upper case',
      '- **needs review** - with a space and a dash',
    ]);
    expect(check.criteria.map((c) => [c.verdict, c.text])).toEqual([
      ['passed', 'plain'],
      ['failed', 'bold outside'],
      ['needs_review', 'bold inside'],
      ['needs_review', 'backticks'],
      ['passed', 'brackets'],
      ['failed', 'upper case'],
      ['needs_review', 'with a space and a dash'],
    ]);
  });

  it('lists a list item whose verdict cannot be read as plain text, and reads no verdict from ordinary prose', () => {
    const check = body(['- Failed login shows a banner', '- passed the dialog test', '- the page loaded']);
    expect(check.criteria.map((c) => c.verdict)).toEqual([null, null, null]);
    expect(check.criteria[0].text).toBe('Failed login shows a banner');
    expect(check.paragraphs).toEqual([]);
  });

  it('reads a verdict line that is not a list item, and folds an indented continuation into the line above', () => {
    const check = body(['failed: no bullet here', '  and it goes on', '', 'Plain prose stays a paragraph.']);
    expect(check.criteria).toEqual([{ verdict: 'failed', text: 'no bullet here and it goes on' }]);
    expect(check.paragraphs).toEqual(['Plain prose stays a paragraph.']);
  });

  it('reads nothing inside a code fence', () => {
    const check = body(['```', '- failed: in a fence', '```', '- passed: outside']);
    expect(check.criteria.map((c) => c.verdict)).toEqual(['passed']);
  });
});

describe('extractDomVerify - the counts, the target and the time are read only as stated', () => {
  it('reads counts as numbers only: a text, a negative or a decimal is null, and a missing key is null', () => {
    const fm = { passed: 'many', failed: -1, needs_review: 1.5, checked: '12' };
    expect(extractDomVerify(fm, '').counts).toEqual({ checked: 12, passed: null, failed: null, needsReview: null });
    expect(extractDomVerify({}, '').counts).toEqual({ checked: null, passed: null, failed: null, needsReview: null });
  });

  it('reads a body line labelled Target, then backticked paths and URLs, and no target when the body names none', () => {
    const labelled = extractDomVerify({}, 'Target: http://127.0.0.1:4310/loans\n\nAlso saw `/desk` and `not a path`.\n');
    expect(labelled.targets).toEqual(['http://127.0.0.1:4310/loans', '/desk']);
    expect(labelled.target).toBe('http://127.0.0.1:4310/loans');
    const none = extractDomVerify({}, 'The browser looked at the loans page in plain words.\n');
    expect(none.target).toBeNull();
    expect(none.targets).toEqual([]);
  });

  it('reads a time only from a line labelled Checked or the like, never a file date and never a bare count', () => {
    expect(extractDomVerify({}, '**Checked:** 2026-11-05 14:02\n').checkedAt).toBe('2026-11-05 14:02');
    expect(extractDomVerify({}, 'Checked: 7\n').checkedAt).toBeNull();
    expect(extractDomVerify({}, 'Nothing is said about when.\n').checkedAt).toBeNull();
  });

  it('reads the wave from the title when the frontmatter has none', () => {
    expect(extractDomVerify({}, '# DOM verification: Phase 2.1, wave 3\n').wave).toBe(3);
    expect(extractDomVerify({}, '# DOM verification: Phase 2.1, wave 3\n').phase).toBe('Phase 2.1');
  });
});

describe('extractDomVerify - caps and growth (T-10-41)', () => {
  it('keeps at most 500 criteria and cuts a line at 2,000 characters', () => {
    const many = Array.from({ length: 800 }, (_, i) => `- passed: line ${i}`).join('\n');
    expect(extractDomVerify({}, many).criteria).toHaveLength(500);
    const long = extractDomVerify({}, `- failed: ${'x'.repeat(5000)}\n`);
    expect(long.criteria[0].text).toHaveLength(2000);
  });

  it('stays linear in the number of lines and in the length of one line', () => {
    const lines = measureGrowth<string>({
      make: (n) => `${Array.from({ length: Math.min(n, 400) }, (_, i) => `- passed: ${i}`).join('\n')}\n${'filler line\n'.repeat(n)}`,
      run: (body) => extractDomVerify({}, body),
    });
    expect(lines.ratio).toBeLessThan(GROWTH_LIMIT);
    const line = measureGrowth<string>({
      make: (n) => `- failed: ${'`a` '.repeat(n)}\n\n${'`/p` '.repeat(n)}`,
      run: (body) => extractDomVerify({}, body),
    });
    expect(line.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
