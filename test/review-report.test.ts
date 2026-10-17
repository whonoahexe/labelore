// quick-261017-k44 (sketch 022 C): the REVIEW and REVIEW-FIX body extractors - pinned against the
// nine copied reports (test/fixtures/review/), labelore's own reviews, the tolerant degrade paths
// and the T-k44-02 timing bound. Pinned values come from the sketch's own data.js and grep over the
// source files, independent of the extractor's output.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractReviewFixReport, extractReviewReport } from '../src/planning-repo/handlers/review-report.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';

const FIXTURES = new URL('./fixtures/review/', import.meta.url).pathname;
const LB = new URL('../.planning/milestones/', import.meta.url).pathname;

function bodyOf(path: string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

const review = (key: string) => extractReviewReport(bodyOf(`${FIXTURES}${key}-REVIEW.md`));
const fix = (key: string) => extractReviewFixReport(bodyOf(`${FIXTURES}${key}-REVIEW-FIX.md`));

const sp01 = review('sp01');
const sp03 = review('sp03');
const sb02 = review('sb02');
const dd01 = review('dd01');
const clean = review('clean');
const lb04 = extractReviewReport(bodyOf(`${LB}v1.0-phases/04-portability-degradation-hardening/04-REVIEW.md`));
const textOf = (blocks: { kind: string; text?: string }[]): string => blocks.map((b) => b.text ?? '').join(' ');

describe('the review report', () => {
  it('reads studio-portal phase 1: summary, severities, references and the inline RESOLVED note', () => {
    expect(sp01.h1).toBe('Phase 01: Code Review Report');
    expect(sp01.summary?.blocks).toHaveLength(2);
    expect(sp01.findings.map((f) => f.id)).toEqual([
      'CR-01', 'WR-01', 'WR-02', 'WR-03', 'WR-04', 'WR-05', 'IN-01', 'IN-02', 'IN-03',
    ]);
    const count = (s: string): number => sp01.findings.filter((f) => f.severity === s).length;
    expect([count('critical'), count('warning'), count('info')]).toEqual([1, 5, 3]);
    const cr01 = sp01.findings[0];
    expect(cr01.title).toContain('D-10 dev-bypass hard-gate');
    expect(cr01.refs).toEqual([{ path: 'backend/src/auth/mod.rs', spans: [{ from: 116, to: 134 }] }]);
    expect(cr01.inlineResolved?.commit).toBe('0a20ed2');
    expect(cr01.inlineResolved?.note.startsWith('Fixed as recommended below')).toBe(true);
    // The quote lines are left out of the problem; a code block survives inside it.
    expect(textOf(cr01.issue)).not.toContain('RESOLVED');
    expect(cr01.issue.some((b) => b.kind === 'code')).toBe(true);
    expect(sp01.findings[1].refs).toHaveLength(4);
    expect(sp01.findings[1].inlineResolved?.commit).toBe('3748536');
    expect(sp01.reviewer).toBe('Claude (gsd-code-reviewer)');
    // No footer line leaks into the last finding's suggested change.
    const lastFix = JSON.stringify(sp01.findings[8].fix);
    expect(lastFix).not.toContain('Reviewer');
    expect(lastFix).not.toContain('gsd-code-reviewer');
  });

  it('reads the Warning Findings / Info Findings buckets, an extra labelled block and the unhandled section', () => {
    expect(sp03.h1).toBe('Phase 3 Code Review: Account Administration & Session Control');
    const sev = (s: string): number => sp03.findings.filter((f) => f.severity === s).length;
    expect([sev('warning'), sev('info')]).toEqual([3, 4]);
    const wr03 = sp03.findings.find((f) => f.id === 'WR-03');
    expect(wr03?.refs[0].path).toBe('backend/src/api/admin.rs');
    expect(wr03?.refs[0].spans).toHaveLength(7);
    expect(wr03?.refs[0].spans[0]).toEqual({ from: 297, to: 297 });
    expect(sp03.findings.find((f) => f.id === 'WR-01')?.extra.map((e) => e.label)).toEqual(['Failure scenario']);
    // "Suggested fix" is the suggested change, not an extra block.
    expect(sp03.findings.find((f) => f.id === 'WR-01')?.fix.length).toBeGreaterThan(0);
    expect(sp03.sections.filter((s) => !s.handled && !s.none).map((s) => s.heading)).toEqual(['Areas Reviewed Clean']);
  });

  it('merges a finding\'s same-path references', () => {
    const in02 = sb02.findings.find((f) => f.id === 'IN-02');
    expect(in02?.refs).toEqual([{ path: 'CLAUDE.md', spans: [{ from: 71, to: 71 }] }]);
    expect(sb02.findings.find((f) => f.id === 'CR-01')?.refs[0].path).toBe('lens.sideby.me/Dockerfile');
  });

  it('counts the deid report: 26 findings, 4 critical', () => {
    expect(dd01.findings).toHaveLength(26);
    expect(dd01.findings.filter((f) => f.severity === 'critical')).toHaveLength(4);
    const wr03 = dd01.findings.find((f) => f.id === 'WR-03');
    expect(wr03?.refs[0].spans.map((s) => `${s.from}-${s.to}`)).toEqual(['79-96', '195-202']);
  });

  it('reads the empty narrative container as handled-or-blank and the reviewer', () => {
    expect(lb04.findings.map((f) => f.id)).toEqual(['CR-01', 'CR-02', 'WR-01', 'WR-02', 'WR-03']);
    const narrative = lb04.sections.find((s) => s.heading.startsWith('Narrative Findings'));
    expect(narrative?.none).toBe(true);
    expect(lb04.sections.filter((s) => !s.handled && !s.none)).toEqual([]);
    expect(lb04.reviewer).toBe('the agent (gsd-code-reviewer)');
  });

  it('reads a clean review: no findings, the Summary, the reviewer', () => {
    expect(clean.findings).toEqual([]);
    expect(clean.summary?.blocks.length).toBeGreaterThan(0);
    expect(clean.reviewer).toBe('Claude (gsd-code-reviewer)');
  });

  it('reads severity from the section when the ID prefix says nothing', () => {
    const body = '# R\n\n## Blockers\n\n### XX-01: a\n\n**File:** `src/a.ts:3`\n\n## Warnings\n\n### XX-02: b\n\n## Info\n\n### XX-03: c\n';
    const model = extractReviewReport(body);
    expect(model.findings.map((f) => f.severity)).toEqual(['critical', 'warning', 'info']);
  });

  it('reads references: spans, ranges, en dashes, continuation and the path rules', () => {
    const body =
      '## Warnings\n\n### WR-01: a\n\n**File:** `src/a.ts:3, 9-12`, `src/b.ts:4–6`, `:20`, `https://x.dev/y`, `notes`, `Dockerfile`, `.dockerignore`, `readme.md`\n\n**Issue:** x\n';
    const refs = extractReviewReport(body).findings[0].refs;
    expect(refs.map((r) => r.path)).toEqual(['src/a.ts', 'src/b.ts', 'Dockerfile', '.dockerignore', 'readme.md']);
    expect(refs[0].spans).toEqual([{ from: 3, to: 3 }, { from: 9, to: 12 }]);
    expect(refs[1].spans).toEqual([{ from: 4, to: 6 }, { from: 20, to: 20 }]);
  });

  it('keeps a bold lead without a colon as prose, and reads either label colon placement', () => {
    const body =
      '## Warnings\n\n### WR-01: a\n\n**However** this is prose.\n\n**Issue**: colon outside\n\n**Fix:** do it\n\n**Related:** WR-02\n';
    const finding = extractReviewReport(body).findings[0];
    expect(textOf(finding.issue)).toBe('colon outside');
    expect(textOf(finding.fix)).toBe('do it');
    expect(finding.extra.map((e) => e.label)).toEqual(['Related']);
  });

  it('uses the text before the first label as the problem when there is no Issue field', () => {
    const body = '## Info\n\n### IN-01: a\n\nSome prose about it.\n\n**File:** `src/a.ts`\n';
    expect(textOf(extractReviewReport(body).findings[0].issue)).toBe('Some prose about it.');
  });

  it('does not split on headings or labels inside a fence', () => {
    const body = '## Warnings\n\n### WR-01: a\n\n**Issue:** see\n\n```md\n## Not a section\n### WR-99: not a finding\n**Fix:** not a label\n```\n\n**Fix:** real\n';
    const model = extractReviewReport(body);
    expect(model.findings.map((f) => f.id)).toEqual(['WR-01']);
    expect(textOf(model.findings[0].fix)).toBe('real');
    expect(model.findings[0].issue.some((b) => b.kind === 'code')).toBe(true);
  });
});

describe('the fix report', () => {
  const sb = fix('sb02');
  const dd = fix('dd02');
  const lb = extractReviewFixReport(bodyOf(`${LB}v1.0-phases/01-read-layer-domain-model/01-REVIEW-FIX.md`));

  it('reads sideby phase 2: four fixed entries and three skipped', () => {
    expect(sb.entries.filter((e) => e.outcome === 'fixed').map((e) => `${e.ids[0]} ${e.commit}`)).toEqual([
      'CR-03 d1c6017', 'CR-02 77a459a', 'CR-01 fea7e47', 'WR-01 9896b11',
    ]);
    expect(sb.entries.filter((e) => e.outcome === 'skipped').map((e) => e.ids[0])).toEqual(['WR-02', 'WR-03', 'WR-04']);
    expect(sb.entries[0].files).toEqual(['lens.sideby.me/Dockerfile']);
    expect(textOf(sb.entries[0].note)).toContain('apt-get install -y curl ffmpeg');
    expect(textOf(sb.entries[4].note).startsWith('Intentionally skipped')).toBe(true);
    expect(sb.deferred).toEqual([]);
  });

  it('reads deid phase 2: combined headings, a commit note and the unhandled sections', () => {
    expect(dd.entries).toHaveLength(9);
    expect(dd.entries.every((e) => e.outcome === 'fixed')).toBe(true);
    expect(dd.entries.map((e) => e.ids)).toEqual([
      ['WR-01'], ['WR-02'], ['WR-03'], ['WR-04', 'WR-05'], ['WR-06'], ['WR-07'], ['WR-08', 'WR-09'], ['WR-10'], ['WR-11'],
    ]);
    const wr10 = dd.entries.find((e) => e.ids[0] === 'WR-10');
    expect(wr10?.commit).toBe('ce9ed8f');
    expect(wr10?.commitNote).toBe('(folded into WR-01, as instructed)');
    // The narrative that follows a Commit line is the entry's note, not part of the commit.
    const wr01 = dd.entries[0];
    expect(wr01.commit).toBe('ce9ed8f');
    expect(wr01.commitNote).toBeNull();
    expect(textOf(wr01.note)).toContain('Moved both validations');
    expect(dd.entries.find((e) => e.ids[0] === 'WR-04')?.commit).toBe('d76d768');
    expect(dd.entries.find((e) => e.ids[0] === 'WR-08')?.commit).toBe('69538c9');
    expect(dd.sections.filter((s) => !s.handled).map((s) => s.heading)).toContain('Discoveries recorded rather than fixed');
    expect(dd.sections.filter((s) => !s.handled).map((s) => s.heading)).toContain('Not touched (per the known-and-accepted list)');
    expect(dd.fixScope).toBeNull();
  });

  it('reads labelore phase 1: five fixed, the deferred bullets and the fix scope', () => {
    expect(lb.entries.filter((e) => e.outcome === 'fixed')).toHaveLength(5);
    expect(lb.entries.filter((e) => e.outcome === 'skipped')).toHaveLength(0);
    expect(lb.deferred.map((d) => d.ids[0])).toEqual(['IN-01', 'IN-02']);
    expect(lb.deferred[0].note.startsWith('Duplicated title-derivation logic between `generic.ts` and `title.ts`')).toBe(true);
    expect(lb.fixScope).toBe('critical_warning');
    expect(lb.entries[0].commit).toBe('6efec5a');
  });

  it('reads a combined heading with commas, "and" and "&"', () => {
    const body = '## Fixed Issues\n\n### WR-01, WR-02 and IN-03: x\n\n**Commit:** abc1234\n\n### CR-01 & CR-02: y\n\n**Commit:** `def5678`\n';
    const model = extractReviewFixReport(body);
    expect(model.entries.map((e) => e.ids)).toEqual([['WR-01', 'WR-02', 'IN-03'], ['CR-01', 'CR-02']]);
  });
});

describe('degradation', () => {
  it('returns an empty model for an empty string and a frontmatter-only string', () => {
    for (const body of ['', '---\nphase: x\n---\n']) {
      const r = extractReviewReport(body);
      expect(r.findings).toEqual([]);
      expect(r.summary).toBeNull();
      expect(r.sections).toEqual([]);
      const f = extractReviewFixReport(body);
      expect(f.entries).toEqual([]);
      expect(f.deferred).toEqual([]);
    }
  });

  it('never throws on an unclosed fence, a heading with no ID, a label with no text or a ref with no path', () => {
    const inputs = [
      '## Warnings\n\n### WR-01: a\n\n```ts\nunclosed\n**Fix:** x',
      '## Warnings\n\n### No id here\n\n**Issue:**\n\n**File:** ``, `:`, `:12`, `: `\n',
      '## Warnings\n\n### WR-01:\n\n**Fix:**\n**File:**\n',
      '### WR-1: only a level three\n\n**Fix:** x',
      '## Fixed Issues\n\n### WR-01: x\n\n**Commit:**\n**Files modified:**\n',
      '## Fixed Issues\n\n### : x\n\n### WR-: y\n\n### ABCDEFG-1: z\n',
      '## Deferred\n\n- **IN-01**\n- **IN-02** —\n- **x** — y\n- **IN-03**: z\n',
      '\u0000\ud800 weird',
    ];
    for (const input of inputs) {
      expect(() => extractReviewReport(input)).not.toThrow();
      expect(() => extractReviewFixReport(input)).not.toThrow();
    }
    const model = extractReviewReport(inputs[0]);
    expect(model.findings[0].id).toBe('WR-01');
    expect(extractReviewFixReport(inputs[6]).deferred.map((d) => d.ids[0])).toEqual(['IN-01', 'IN-02', 'IN-03']);
  });

  it('extracts a 1 MB body holding a 200k-character hostile line within 250 ms (each)', () => {
    const hostile = '`*|[**1. **'.repeat(20000);
    const filler = 'x'.repeat(79) + '\n';
    const body =
      `# T\n\n## Summary\n\n${hostile}\n\n## Warnings\n\n### WR-01: ${hostile}\n\n**File:** ${hostile}\n\n**Issue:** ${hostile}\n\n**Fix:** ${hostile}\n\n` +
      `## Fixed Issues\n\n### WR-01: ${hostile}\n\n**Commit:** ${hostile}\n\n**Files modified:** ${hostile}\n\n**Applied fix:** ${hostile}\n\n${filler.repeat(9000)}`;
    expect(body.length).toBeGreaterThan(900_000);
    for (const run of [extractReviewReport, extractReviewFixReport]) {
      const started = performance.now();
      run(body);
      expect(performance.now() - started).toBeLessThan(250);
    }
  });

  it('caps the findings, the references and the spans', () => {
    const findings = Array.from({ length: 700 }, (_, i) => `### WR-${String(i + 1).padStart(4, '0').slice(-4)}: t\n\n**File:** \`a.ts\`\n`).join('\n');
    expect(extractReviewReport(`## Warnings\n\n${findings}`).findings.length).toBeLessThanOrEqual(500);
    const refs = Array.from({ length: 40 }, (_, i) => `\`src/f${i}.ts:${i + 1}\``).join(', ');
    const spans = Array.from({ length: 40 }, (_, i) => String(i + 1)).join(', ');
    const model = extractReviewReport(`## Warnings\n\n### WR-01: a\n\n**File:** ${refs}, \`src/g.ts:${spans}\`\n`);
    expect(model.findings[0].refs).toHaveLength(20);
    const only = extractReviewReport(`## Warnings\n\n### WR-01: a\n\n**File:** \`src/g.ts:${spans}\`\n`);
    expect(only.findings[0].refs[0].spans).toHaveLength(20);
  });
});
