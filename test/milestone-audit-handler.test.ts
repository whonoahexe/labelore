// Phase 9 (09-14): the milestone audit handler. It reads the audit shapes found on real projects - the
// frontmatter-heavy Lendshed audit, this repo's own, the dense fixture's prose-only audits and the old
// heading-and-one-sentence fixture - into `structured.audit`, frontmatter first.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { MilestoneAuditHandler } from '../src/planning-repo/handlers/milestone-audit.ts';
import type { MilestoneAuditBody } from '../src/planning-repo/handlers/milestone-audit.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';

const PATH = '.planning/milestones/v1.0-MILESTONE-AUDIT.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'milestone-audit',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'milestone-root',
    phaseIdentity: null,
    milestoneVersion: 'v1.0',
    quickTaskId: null,
  };
}

function raw(content: string, path: string = PATH): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

function parse(content: string) {
  return MilestoneAuditHandler.parse(raw(content), ref());
}

function auditOf(content: string): MilestoneAuditBody {
  return parse(content).structured?.audit as MilestoneAuditBody;
}

function textOf(url: URL): string {
  return readFileSync(url, 'utf8');
}

const DENSE_V2 = new URL('../fixtures/dense/.planning/milestones/v2.0-MILESTONE-AUDIT.md', import.meta.url);
const OLD_SHAPE = new URL('./fixtures/dashboard/ledger/.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url);
const OWN_AUDIT = new URL('../.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url);

describe('MilestoneAuditHandler', () => {
  it('claims a milestone-audit ref ahead of the generic handler, and nothing else', () => {
    expect(MilestoneAuditHandler.match(ref())).toBe(true);
    expect(MilestoneAuditHandler.match({ ...ref(), kind: 'requirements' })).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(MilestoneAuditHandler);
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('reads the Lendshed audit verdict and date from frontmatter', () => {
    const result = parse(fxRead('milestones/v1.0-MILESTONE-AUDIT.md'));
    expect(result.warning).toBeUndefined();
    const audit = result.structured?.audit as MilestoneAuditBody;
    expect(audit.verdict).toEqual({ status: 'tech_debt', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-03-19');
    expect(audit.milestone).toBe('v1.0');
    expect(audit.milestoneName).toBe('Shed Basics');
    expect(audit.claimed).toEqual(['milestone', 'milestone_name', 'audited', 'status', 'scores', 'gaps', 'tech_debt', 'nyquist']);
  });

  it("reads the dense fixture's prose Status and Audited lines when there is no frontmatter", () => {
    const audit = auditOf(textOf(DENSE_V2));
    expect(audit.verdict).toEqual({ status: 'passed', raw: null, source: 'prose' });
    expect(audit.audited).toBe('2026-03-15');
    expect(audit.milestone).toBeNull();
    expect(audit.claimed).toEqual([]);
  });

  it('states no verdict for the heading-and-sentence fixture', () => {
    const result = parse(textOf(OLD_SHAPE));
    const audit = result.structured?.audit as MilestoneAuditBody;
    expect(audit.verdict).toEqual({ status: null, raw: null, source: null });
    expect(audit.audited).toBeNull();
    expect(result.title).toBe('v1.0 audit');
  });

  it("reads this repo's own v1.0 audit: passed, with an ISO audited date", () => {
    const audit = auditOf(textOf(OWN_AUDIT));
    expect(audit.verdict).toEqual({ status: 'passed', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-09-09');
  });

  it('reads the minimal frontmatter fixture', () => {
    const audit = auditOf(
      textOf(new URL('./fixtures/shapes/.planning/milestones/v1.0-MILESTONE-AUDIT.md', import.meta.url)),
    );
    expect(audit.verdict).toEqual({ status: 'passed', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-04-22');
  });

  it('reads a prose status by its leading words', () => {
    const prose = (status: string) => auditOf(`**Status:** ${status}\n`).verdict;
    expect(prose('Tech debt - three items carried')).toEqual({ status: 'tech_debt', raw: null, source: 'prose' });
    expect(prose('`gaps_found`')).toEqual({ status: 'gaps_found', raw: null, source: 'prose' });
    expect(prose('Passed')).toEqual({ status: 'passed', raw: null, source: 'prose' });
  });

  it('never states a verdict the file does not: an unknown status keeps its own words', () => {
    expect(auditOf('---\nstatus: complete\n---\n\nBody\n').verdict).toEqual({
      status: null,
      raw: 'complete',
      source: 'frontmatter',
    });
    expect(auditOf('**Status:** Passedover\n').verdict).toEqual({ status: null, raw: 'Passedover', source: 'prose' });
    expect(auditOf('---\naudited: 2026-01-01\n---\n\nNo status here.\n').verdict).toEqual({
      status: null,
      raw: null,
      source: null,
    });
  });

  it('lets frontmatter win over a disagreeing Status line, and leaves the body untouched', () => {
    const content = '---\nstatus: gaps_found\naudited: 2026-02-02\n---\n\n# Audit\n\n**Status:** Passed\n**Audited:** 2025-01-01\n';
    const result = parse(content);
    const audit = result.structured?.audit as MilestoneAuditBody;
    expect(audit.verdict).toEqual({ status: 'gaps_found', raw: null, source: 'frontmatter' });
    expect(audit.audited).toBe('2026-02-02');
    expect(result.body).toContain('**Status:** Passed');
    expect(result.body).toContain('**Audited:** 2025-01-01');
  });

  it('keeps the title, body and frontmatter and omits the key when the extractor throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/milestone-audit-body.ts', () => ({
      extractMilestoneAudit: () => {
        throw new Error('boom');
      },
    }));
    const { MilestoneAuditHandler: Guarded } = await import('../src/planning-repo/handlers/milestone-audit.ts');
    const result = Guarded.parse(raw('---\nstatus: passed\n---\n\n# An audit\n\nBody text.\n'), ref());
    expect(result.title).toBe('An audit');
    expect(result.body).toContain('Body text.');
    expect(result.frontmatter.status).toBe('passed');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/milestone-audit-body.ts');
  });
});
