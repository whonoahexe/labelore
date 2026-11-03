// quick-261017-k44 (sketch 022 C): the REVIEW and REVIEW-FIX body extractors - pinned against the
// made-up Lendshed reviews (test/fixtures/lendshed), the clean review (test/fixtures/review), labelore's
// own reviews, the tolerant degrade paths and the T-k44-02 growth bound. Pinned values come from grep
// over the fixture files, independent of the extractor's output.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  extractReviewFixReport,
  extractReviewReport,
  leadingFindingId,
  severityOfId,
} from '../src/planning-repo/handlers/review-report.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { fxPath } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const FIXTURES = new URL('./fixtures/review/', import.meta.url).pathname;
// Lendshed review files, by the shape each one carries.
const MEMBERS_V1 = 'milestones/v1.0-phases/01-member-data-foundation/01-REVIEW.md'; // inline RESOLVED notes
const ADMIN_P3 = 'phases/03-account-admin-and-sessions/03-REVIEW.md'; // Warning/Info buckets, extra block
const ROLES_P2 = 'phases/02-roles-and-permissions/02-REVIEW.md'; // same-path references, fix pair
const CATALOGUE_V3 = 'milestones/v1.0-phases/03-catalogue-browsing/03-REVIEW.md'; // the large report
const ROLES_P2_FIX = 'phases/02-roles-and-permissions/02-REVIEW-FIX.md';
const TRANSFERS_V4_FIX = 'milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW-FIX.md';
const LB = new URL('../.planning/milestones/', import.meta.url).pathname;

function bodyOf(path: string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

const lendshed = (rel: string) => extractReviewReport(bodyOf(fxPath(rel)));
const lendshedFix = (rel: string) => extractReviewFixReport(bodyOf(fxPath(rel)));

const members = lendshed(MEMBERS_V1);
const admin = lendshed(ADMIN_P3);
const roles = lendshed(ROLES_P2);
const catalogue = lendshed(CATALOGUE_V3);
const clean = extractReviewReport(bodyOf(`${FIXTURES}clean-REVIEW.md`));
const lb04 = extractReviewReport(bodyOf(`${LB}v1.0-phases/04-portability-degradation-hardening/04-REVIEW.md`));
const textOf = (blocks: { kind: string; text?: string }[]): string => blocks.map((b) => b.text ?? '').join(' ');

describe('the review report', () => {
  it('reads the member-data phase: summary, severities, references and the inline RESOLVED note', () => {
    expect(members.h1).toBe('Phase 01: Code Review Report');
    expect(members.summary?.blocks).toHaveLength(2);
    expect(members.findings.map((f) => f.id)).toEqual([
      'CR-01', 'WR-01', 'WR-02', 'WR-03', 'WR-04', 'WR-05', 'IN-01', 'IN-02', 'IN-03',
    ]);
    const count = (s: string): number => members.findings.filter((f) => f.severity === s).length;
    expect([count('critical'), count('warning'), count('info')]).toEqual([1, 5, 3]);
    const cr01 = members.findings[0];
    expect(cr01.title).toContain('Handle uniqueness is checked case-sensitively');
    expect(cr01.refs).toEqual([{ path: 'server/src/members/validate.ts', spans: [{ from: 74, to: 92 }] }]);
    expect(cr01.inlineResolved?.commit).toBe('7e3b0d4');
    expect(cr01.inlineResolved?.note.startsWith('Fixed as suggested below')).toBe(true);
    // The quote lines are left out of the problem; a code block survives inside it.
    expect(textOf(cr01.issue)).not.toContain('RESOLVED');
    expect(cr01.issue.some((b) => b.kind === 'code')).toBe(true);
    expect(members.findings[1].refs).toHaveLength(4);
    expect(members.findings[1].inlineResolved?.commit).toBe('c92a5e1');
    expect(members.reviewer).toBe('Claude (gsd-code-reviewer)');
    // No footer line leaks into the last finding's suggested change.
    const lastFix = JSON.stringify(members.findings[8].fix);
    expect(lastFix).not.toContain('Reviewer');
    expect(lastFix).not.toContain('gsd-code-reviewer');
  });

  it('reads the Warning Findings / Info Findings buckets, an extra labelled block and the unhandled section', () => {
    expect(admin.h1).toBe('Phase 3 Code Review: Account Admin & Session Control');
    const sev = (s: string): number => admin.findings.filter((f) => f.severity === s).length;
    expect([sev('warning'), sev('info')]).toEqual([3, 4]);
    const wr03 = admin.findings.find((f) => f.id === 'WR-03');
    expect(wr03?.refs[0].path).toBe('server/src/api/desk.ts');
    expect(wr03?.refs[0].spans).toHaveLength(7);
    expect(wr03?.refs[0].spans[0]).toEqual({ from: 212, to: 212 });
    expect(admin.findings.find((f) => f.id === 'WR-01')?.extra.map((e) => e.label)).toEqual(['Failure scenario']);
    // "Suggested fix" is the suggested change, not an extra block.
    expect(admin.findings.find((f) => f.id === 'WR-01')?.fix.length).toBeGreaterThan(0);
    expect(admin.sections.filter((s) => !s.handled && !s.none).map((s) => s.heading)).toEqual(['Areas Reviewed Clean']);
  });

  it('merges a finding\'s same-path references', () => {
    const in02 = roles.findings.find((f) => f.id === 'IN-02');
    expect(in02?.refs).toEqual([{ path: 'docs/roles.md', spans: [{ from: 71, to: 71 }] }]);
    expect(roles.findings.find((f) => f.id === 'CR-01')?.refs[0].path).toBe('server/migrations/0004_roles_and_grants.sql');
  });

  it('counts the catalogue report: 26 findings, 4 critical', () => {
    expect(catalogue.findings).toHaveLength(26);
    expect(catalogue.findings.filter((f) => f.severity === 'critical')).toHaveLength(4);
    const wr03 = catalogue.findings.find((f) => f.id === 'WR-03');
    expect(wr03?.refs[0].spans.map((s) => `${s.from}-${s.to}`)).toEqual(['62-81', '140-147']);
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
  const sb = lendshedFix(ROLES_P2_FIX);
  const dd = lendshedFix(TRANSFERS_V4_FIX);
  const lb = extractReviewFixReport(bodyOf(`${LB}v1.0-phases/01-read-layer-domain-model/01-REVIEW-FIX.md`));

  it('reads roles phase 2: four fixed entries and three skipped', () => {
    expect(sb.entries.filter((e) => e.outcome === 'fixed').map((e) => `${e.ids[0]} ${e.commit}`)).toEqual([
      'CR-03 b81e4c2', 'CR-02 3c9a7d0', 'CR-01 e57f1b9', 'WR-01 24d6f08',
    ]);
    expect(sb.entries.filter((e) => e.outcome === 'skipped').map((e) => e.ids[0])).toEqual(['WR-02', 'WR-03', 'WR-04']);
    expect(sb.entries[0].files).toEqual(['server/migrations/0004_roles_and_grants.sql']);
    expect(textOf(sb.entries[0].note)).toContain('CHECK (allowed IN (0, 1))');
    expect(textOf(sb.entries[4].note).startsWith('Intentionally skipped')).toBe(true);
    expect(sb.deferred).toEqual([]);
  });

  it('reads transfers v1.0 phase 4: combined headings, a commit note and the unhandled sections', () => {
    expect(dd.entries).toHaveLength(9);
    expect(dd.entries.every((e) => e.outcome === 'fixed')).toBe(true);
    expect(dd.entries.map((e) => e.ids)).toEqual([
      ['WR-01'], ['WR-02'], ['WR-03'], ['WR-04', 'WR-05'], ['WR-06'], ['WR-07'], ['WR-08', 'WR-09'], ['WR-10'], ['WR-11'],
    ]);
    const wr10 = dd.entries.find((e) => e.ids[0] === 'WR-10');
    expect(wr10?.commit).toBe('4be07a2');
    expect(wr10?.commitNote).toBe('(folded into WR-01, as planned)');
    // The narrative that follows a Commit line is the entry's note, not part of the commit.
    const wr01 = dd.entries[0];
    expect(wr01.commit).toBe('4be07a2');
    expect(wr01.commitNote).toBeNull();
    expect(textOf(wr01.note)).toContain('Moved both validations');
    expect(dd.entries.find((e) => e.ids[0] === 'WR-04')?.commit).toBe('9d2c7e6');
    expect(dd.entries.find((e) => e.ids[0] === 'WR-08')?.commit).toBe('c7f26a8');
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

  it('extracts a hostile body with 200k-character lines in time that grows linearly with its size', () => {
    const growth = measureGrowth({
      make: (n) => {
        const hostile = '`*|[**1. **'.repeat(Math.max(1, Math.floor(n / 11)));
        const filler = 'x'.repeat(79) + '\n';
        return (
          `# T\n\n## Summary\n\n${hostile}\n\n## Warnings\n\n### WR-01: ${hostile}\n\n**File:** ${hostile}\n\n**Issue:** ${hostile}\n\n**Fix:** ${hostile}\n\n` +
          `## Fixed Issues\n\n### WR-01: ${hostile}\n\n**Commit:** ${hostile}\n\n**Files modified:** ${hostile}\n\n**Applied fix:** ${hostile}\n\n${filler.repeat(Math.floor(n / 22))}`
        );
      },
      run: (body) => {
        // Both extractors read the same body; a sound pass keeps a finding and the fix entry.
        if (extractReviewReport(body).findings.length < 1) throw new Error('the review extraction lost its finding');
        if (extractReviewFixReport(body).entries.length !== 1) throw new Error('the fix extraction lost its entry');
      },
      maxSize: 1 << 17,
    });
    expect(growth.ratio, `review extractors: ${growth.t1.toFixed(2)}ms at ${growth.n}, ${growth.t2.toFixed(2)}ms at 8x`).toBeLessThan(GROWTH_LIMIT);
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

describe('finding IDs with shard tags and phase segments', () => {
  const review = (...headings: string[]) =>
    extractReviewReport(`# R\n\n## Findings\n\n${headings.map((h) => `### ${h}: x\n\n**File:** \`a.ts:1\`\n`).join('\n')}`);

  it('reads tagged and phase-segment IDs in review headings, with severity from the token', () => {
    const model = review('A-WR-01', 'C-CR-02', 'FL-CR-01', 'D-IN-03', 'WR-P1-01');
    expect(model.findings.map((f) => [f.id, f.severity])).toEqual([
      ['A-WR-01', 'warning'],
      ['C-CR-02', 'critical'],
      ['FL-CR-01', 'critical'],
      ['D-IN-03', 'info'],
      ['WR-P1-01', 'warning'],
    ]);
    expect(model.findings.every((f) => f.title === 'x')).toBe(true);
  });

  it('keeps the plain IDs and their severities as before', () => {
    const model = review('CR-01', 'BL-02', 'WR-03', 'IN-04');
    expect(model.findings.map((f) => [f.id, f.severity])).toEqual([
      ['CR-01', 'critical'],
      ['BL-02', 'critical'],
      ['WR-03', 'warning'],
      ['IN-04', 'info'],
    ]);
  });

  it('reads every ID of a combined fix heading', () => {
    const fix = extractReviewFixReport(
      '## Fixed Issues\n\n### C-WR-08 / D-WR-01: both\n\n**Commit:** `abc1234`\n\n### WR-04 / WR-05: pair\n\n**Commit:** `def5678`\n',
    );
    expect(fix.entries.map((e) => e.ids)).toEqual([['C-WR-08', 'D-WR-01'], ['WR-04', 'WR-05']]);
  });

  it('does not read W-01, ABCDE-01, WR-01a, A-B-01 or WR-P-01 as IDs', () => {
    for (const bad of ['W-01', 'ABCDE-01', 'WR-01a', 'A-B-01', 'WR-P-01', 'WR-P1234-01', 'WR-12345']) {
      expect(leadingFindingId(`${bad}: x`), bad).toBeNull();
      expect(review(bad).findings, bad).toEqual([]);
    }
  });

  it('gives severityOfId the token severity or null', () => {
    expect(severityOfId('CR-01')).toBe('critical');
    expect(severityOfId('BL-01')).toBe('critical');
    expect(severityOfId('WR-01')).toBe('warning');
    expect(severityOfId('IN-01')).toBe('info');
    expect(severityOfId('FL-CR-01')).toBe('critical');
    expect(severityOfId('A-WR-01')).toBe('warning');
    expect(severityOfId('WR-P1-01')).toBe('warning');
    expect(severityOfId('SEC-01')).toBeNull();
    expect(severityOfId('AB-CD-01')).toBeNull();
  });

  it('exports leadingFindingId with the title after the ID', () => {
    expect(leadingFindingId('A-WR-01: Title here')).toEqual({ id: 'A-WR-01', title: 'Title here' });
    expect(leadingFindingId('WR-02 — dash title')).toEqual({ id: 'WR-02', title: 'dash title' });
    expect(leadingFindingId('IN-03')).toEqual({ id: 'IN-03', title: null });
    expect(leadingFindingId('no id')).toBeNull();
  });

  it('falls back to the section for an ID whose token names no severity', () => {
    const model = extractReviewReport('## Warnings\n\n### AB-CD-01: x\n\n**File:** `a.ts:1`\n');
    expect(model.findings[0].severity).toBe('warning');
  });
});

describe('fix entry commits', () => {
  const entryOf = (field: string) =>
    extractReviewFixReport(`## Fixed Issues\n\n### WR-01: x\n\n${field}\n\n**Applied fix:** done\n`).entries[0];

  it('records every hash of a plural Commits field in order, commit first', () => {
    const entry = entryOf('**Commits:** 9790a0b, eeb3f45');
    expect(entry.commit).toBe('9790a0b');
    expect(entry.commits).toEqual(['9790a0b', 'eeb3f45']);
    expect(entry.commitNote).toBeNull();
  });

  it('keeps the singular field behaviour and adds the later hash', () => {
    const entry = entryOf('**Commit:** abc1234 (lint cleanup in def5678)');
    expect(entry.commit).toBe('abc1234');
    expect(entry.commits).toEqual(['abc1234', 'def5678']);
    expect(entry.commitNote).toBe('(lint cleanup in def5678)');
    const plain = entryOf('**Commit:** `c41e9d7`');
    expect(plain.commits).toEqual(['c41e9d7']);
    expect(plain.commitNote).toBeNull();
  });

  it('gives an empty list and the note when the field holds no hash', () => {
    const entry = entryOf('**Commit:** none yet');
    expect(entry.commit).toBeNull();
    expect(entry.commits).toEqual([]);
    expect(entry.commitNote).toBe('none yet');
    expect(extractReviewFixReport('## Fixed Issues\n\n### WR-01: x\n\n**Applied fix:** done\n').entries[0].commits).toEqual([]);
  });

  it('keeps at most 8 hashes', () => {
    const hashes = Array.from({ length: 30 }, (_, i) => `a1b2c3${i}`).join(', ');
    const entry = entryOf(`**Commits:** ${hashes}`);
    expect(entry.commits).toHaveLength(8);
    expect(entry.commit).toBe('a1b2c30');
  });
});

describe('finding id scan growth', () => {
  // Caps are not growth (test/helpers/growth.ts): no line may reach the line cap of 8000.
  const underLineCap = (text: string, name: string) => {
    for (const line of text.split('\n')) expect(line.length, `${name}: a line reached the cap`).toBeLessThan(7000);
  };

  it('reads long runs of capitals and hyphens as heading lines in time that grows linearly', () => {
    const growth = measureGrowth({
      make: (n) => {
        const lines = Math.max(1, Math.floor(n / 100));
        const body = Array.from({ length: lines }, () => `### ${'AB-'.repeat(32)}\n\n- **${'A-'.repeat(48)}** x\n`).join('\n');
        const text = `## Warnings\n\n${body}\n## Fixed Issues\n\n${body}`;
        underLineCap(text, 'AB runs');
        return text;
      },
      run: (text) => {
        extractReviewReport(text);
        extractReviewFixReport(text);
      },
      maxSize: 1 << 17,
    });
    expect(growth.ratio, `id scan: ${growth.t1.toFixed(2)}ms at ${growth.n}, ${growth.t2.toFixed(2)}ms at 8x`).toBeLessThan(GROWTH_LIMIT);
  });

  it('reads one 200k-character heading line in the time of a line cut at the cap', () => {
    const line = (n: number) => `### ${'AB-'.repeat(Math.floor(n / 3))}\n`;
    const started = performance.now();
    extractReviewReport(`## Warnings\n\n${line(8000)}`);
    const capMs = performance.now() - started;
    const big = performance.now();
    const model = extractReviewReport(`## Warnings\n\n${line(200_000)}`);
    const bigMs = performance.now() - big;
    expect(model.findings).toEqual([]);
    // The 25x longer line is cut to the same cap first, so the cost stays flat rather than growing 25x.
    expect(bigMs).toBeLessThan(Math.max(capMs * 24, 50));
  });

  it('reads fix entries with long comma-separated hash lists in time that grows linearly', () => {
    const growth = measureGrowth({
      make: (n) => {
        const entries = Math.max(1, Math.floor(n / 2000));
        const hashes = Array.from({ length: 200 }, (_, i) => `a1b2c3${i}`).join(', ');
        const text = `## Fixed Issues\n\n${Array.from(
          { length: entries },
          (_, i) => `### WR-${String(i + 1).padStart(2, '0')}: x\n\n**Commits:** ${hashes}\n\n**Applied fix:** done\n`,
        ).join('\n')}`;
        underLineCap(text, 'hash lists');
        return text;
      },
      run: (text) => {
        const model = extractReviewFixReport(text);
        if (model.entries.length < 1 || model.entries[0].commits.length !== 8) throw new Error('the commit list was lost');
      },
      maxSize: 1 << 17,
    });
    expect(growth.ratio, `commits: ${growth.t1.toFixed(2)}ms at ${growth.n}, ${growth.t2.toFixed(2)}ms at 8x`).toBeLessThan(GROWTH_LIMIT);
  });
});
