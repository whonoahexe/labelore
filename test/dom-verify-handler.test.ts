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
