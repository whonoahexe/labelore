import { describe, it, expect } from 'vitest';
import { scanMentions, stripCodeForScanning, ID_PATTERNS } from '../src/planning-repo/mentions.ts';
import type { ParsedArtifact } from '../src/planning-repo/types.ts';

function artifact(path: string, kind: string, body: string): ParsedArtifact {
  return {
    ref: { path, kind, location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null },
    title: '',
    frontmatter: {},
    body,
    bodyLength: body.length,
    bodyHash: '',
    mtimeMs: 0,
    warnings: [],
    structured: {},
  };
}

describe('ID_PATTERNS', () => {
  it('has exactly four keys — the schemes NAV-02/03/07 consume', () => {
    expect(Object.keys(ID_PATTERNS).sort()).toEqual(['decision', 'phase', 'plan', 'requirement']);
  });
});

describe('stripCodeForScanning', () => {
  it('returns a string of identical length to its input', () => {
    const md = 'Mentions AUTH-01 then a ```\nfenced block\nwith AUTH-02\n``` and a `AUTH-03` span.';
    const stripped = stripCodeForScanning(md);
    expect(stripped.length).toBe(md.length);
  });

  it('blanks a fenced code block and an inline span while leaving surrounding prose intact', () => {
    const md = 'before ```\nAUTH-02 inside fence\n``` middle `AUTH-03` after AUTH-01';
    const stripped = stripCodeForScanning(md);
    expect(stripped).not.toContain('AUTH-02');
    expect(stripped).not.toContain('AUTH-03');
    expect(stripped).toContain('AUTH-01');
    expect(stripped).toContain('before');
    expect(stripped).toContain('after');
  });
});

describe('scanMentions — requirement scheme', () => {
  it('captures a requirement id with scheme, id, artifact path/kind, line, offset, and excerpt', () => {
    const body = 'line one\nSee AUTH-01 for details.\n';
    const index = scanMentions([artifact('.planning/phases/01-x/01-CONTEXT.md', 'context', body)]);
    expect(index.all).toHaveLength(1);
    const m = index.all[0];
    expect(m.scheme).toBe('requirement');
    expect(m.id).toBe('AUTH-01');
    expect(m.artifactPath).toBe('.planning/phases/01-x/01-CONTEXT.md');
    expect(m.artifactKind).toBe('context');
    expect(m.position.line).toBe(2);
    expect(body.slice(m.position.offset, m.position.offset + m.id.length)).toBe('AUTH-01');
    expect(m.excerpt).toContain('AUTH-01');
  });

  it('captures a two-or-more-character uppercase prefix followed by a hyphen and two-or-more digits as requirement', () => {
    const body = 'DATA-04 and AB-12 are both requirement-shaped.';
    const index = scanMentions([artifact('a.md', 'generic', body)]);
    const schemes = index.all.map((m) => m.scheme);
    expect(schemes).toEqual(['requirement', 'requirement']);
    expect(index.all.map((m) => m.id)).toEqual(['DATA-04', 'AB-12']);
  });
});

describe('scanMentions — decision scheme and the D-05-vs-D1 collision', () => {
  it('captures a hyphenated single-letter D token as decision, not requirement, from the same document as a multi-letter requirement id', () => {
    const body = 'Per D-05 and AUTH-01, this works.';
    const index = scanMentions([artifact('a.md', 'context', body)]);
    const decision = index.all.find((m) => m.id === 'D-05');
    const requirement = index.all.find((m) => m.id === 'AUTH-01');
    expect(decision?.scheme).toBe('decision');
    expect(requirement?.scheme).toBe('requirement');
  });

  it('does not capture a summary coverage deliverable id written without a hyphen as a decision', () => {
    const body = 'coverage:\n  - id: D1\n  - id: D2\n';
    const index = scanMentions([artifact('SUMMARY.md', 'summary', body)]);
    expect(index.all.filter((m) => m.scheme === 'decision')).toHaveLength(0);
  });
});

describe('scanMentions — scoped by artifact kind', () => {
  it('yields two mentions with differing artifact kinds when the same token appears in a context artifact and a summary artifact', () => {
    const index = scanMentions([
      artifact('.planning/phases/01-x/01-CONTEXT.md', 'context', 'Decision D-09 recorded here.'),
      artifact('.planning/phases/01-x/01-01-SUMMARY.md', 'summary', 'Implements D-09 as planned.'),
    ]);
    const mentions = index.byId['decision:D-09'];
    expect(mentions).toHaveLength(2);
    expect(new Set(mentions.map((m) => m.artifactKind))).toEqual(new Set(['context', 'summary']));
  });
});

describe('scanMentions — phase scheme', () => {
  it('captures a Phase reference, including dotted and letter-suffixed numbers', () => {
    const body = 'See Phase 1, Phase 12A, and Phase 2.1 for context.';
    const index = scanMentions([artifact('a.md', 'generic', body)]);
    const phaseMentions = index.all.filter((m) => m.scheme === 'phase');
    expect(phaseMentions.map((m) => m.id)).toEqual(['1', '12A', '2.1']);
  });

  it('reports an offset that slices the number token itself out of the original content, not the word "Phase"', () => {
    const body = 'Refer to Phase 12A here.';
    const index = scanMentions([artifact('a.md', 'generic', body)]);
    const m = index.all.find((x) => x.scheme === 'phase')!;
    expect(body.slice(m.position.offset, m.position.offset + m.id.length)).toBe('12A');
  });
});

describe('scanMentions — plan scheme and the ISO-date exclusion', () => {
  it('captures a plan-shaped token with scheme plan', () => {
    const body = 'Depends on 01-02 for setup.';
    const index = scanMentions([artifact('a.md', 'generic', body)]);
    const planMention = index.all.find((m) => m.scheme === 'plan');
    expect(planMention?.id).toBe('01-02');
  });

  it('does not capture an ISO-formatted date as a plan mention', () => {
    const body = 'Completed on 2026-08-23 per the log.';
    const index = scanMentions([artifact('a.md', 'generic', body)]);
    expect(index.all.filter((m) => m.scheme === 'plan')).toHaveLength(0);
  });
});

describe('scanMentions — code stripping preserves offsets', () => {
  it('scans nothing from inside a fenced code block or an inline code span, and every reported offset still slices the expected token out of the original unmodified content', () => {
    const body = 'Prose mentions AUTH-01.\n\n```\nAUTH-02 is inside a fence.\n```\n\nAnd `AUTH-03` is a span.\n';
    const index = scanMentions([artifact('a.md', 'generic', body)]);
    expect(index.all.map((m) => m.id)).toEqual(['AUTH-01']);
    const m = index.all[0];
    expect(body.slice(m.position.offset, m.position.offset + m.id.length)).toBe('AUTH-01');
  });
});

describe('scanMentions — empty and degenerate input', () => {
  it('yields an empty mention list for a document with no identifiers', () => {
    const index = scanMentions([artifact('a.md', 'generic', 'Nothing to see here, just prose.')]);
    expect(index.all).toEqual([]);
    expect(index.byId).toEqual({});
  });

  it('yields an empty mention list for an artifact with empty body content', () => {
    const index = scanMentions([artifact('a.md', 'generic', '')]);
    expect(index.all).toEqual([]);
  });
});

describe('scanMentions — index grouping by scheme and id', () => {
  it('keys the index on scheme plus id together, so a phase number and a plan id sharing digit text never merge', () => {
    const index = scanMentions([artifact('a.md', 'generic', 'Phase 12 relates to plan 12-13.')]);
    expect(Object.keys(index.byId).sort()).toEqual(['phase:12', 'plan:12-13']);
    expect(index.byId['phase:12']).toHaveLength(1);
    expect(index.byId['plan:12-13']).toHaveLength(1);
  });
});

describe('scanMentions — rebuild semantics', () => {
  it('yields identical mention lists across two consecutive scans of unchanged content', () => {
    const artifacts = [artifact('a.md', 'context', 'D-01 mentioned twice: D-01 and D-02.')];
    const first = scanMentions(artifacts);
    const second = scanMentions(artifacts);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
