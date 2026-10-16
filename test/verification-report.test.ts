// quick-261017-18a (sketch 021 E): the VERIFICATION body extractor - pinned against the four copied
// reports (test/fixtures/verification/), labelore's own phase 1 and phase 5 reports, the tolerant
// degrade paths and the T-18a-02 timing bound. Pinned values come from the sketch's own data.js and
// grep over the source files, independent of the extractor's output.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  extractVerificationReport,
  requirementStatusOf,
  severityOf,
  truthStatusOf,
} from '../src/planning-repo/handlers/verification-report.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';

const FIXTURES = new URL('./fixtures/verification/', import.meta.url).pathname;
const LB = new URL('../.planning/', import.meta.url).pathname;

function bodyOf(path: string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

const syn = extractVerificationReport(bodyOf(`${FIXTURES}synthetic-VERIFICATION.md`));
const sp04 = extractVerificationReport(bodyOf(`${FIXTURES}sp04-VERIFICATION.md`));
const sb04 = extractVerificationReport(bodyOf(`${FIXTURES}sb04-VERIFICATION.md`));
const dd01 = extractVerificationReport(bodyOf(`${FIXTURES}dd01-VERIFICATION.md`));
const lb01 = extractVerificationReport(bodyOf(`${LB}milestones/v1.0-phases/01-read-layer-domain-model/01-VERIFICATION.md`));
const lb05 = extractVerificationReport(bodyOf(`${LB}milestones/v1.1-phases/05-per-type-document-views/05-VERIFICATION.md`));

const alsoOf = (r: ReturnType<typeof extractVerificationReport>): string[] =>
  r.sections.filter((s) => !s.handled && !s.blank).map((s) => s.heading.replace(/\s*\(.*?\)\s*$/, ''));

describe('status classifiers', () => {
  it('reads each truth state', () => {
    expect(truthStatusOf('✓ VERIFIED')).toBe('verified');
    expect(truthStatusOf('✓ VERIFIED (coincidental-reliance)')).toBe('coincidental');
    expect(truthStatusOf('✗ FAILED')).toBe('failed');
    expect(truthStatusOf('⚠️ PRESENT_BEHAVIOR_UNVERIFIED')).toBe('unverified');
    expect(truthStatusOf('? UNCERTAIN (`insufficient_spec`)')).toBe('uncertain');
    expect(truthStatusOf('PASSED via OVERRIDE')).toBe('override');
    expect(truthStatusOf('✓ VERIFIED / ⚠ partly')).toBe('mixed');
    expect(truthStatusOf('whatever')).toBe('uncertain');
  });

  it('reads each requirement state and severity', () => {
    expect(requirementStatusOf('✓ SATISFIED')).toBe('satisfied');
    expect(requirementStatusOf('✓ SATISFIED WITH WARNING')).toBe('partial');
    expect(requirementStatusOf('✗ BLOCKED')).toBe('blocked');
    expect(requirementStatusOf('? NEEDS HUMAN')).toBe('human');
    expect(requirementStatusOf('')).toBe('human');
    expect(severityOf('🛑 Blocker')).toBe('blocker');
    expect(severityOf('⚠️ Warning (from x)')).toBe('warning');
    expect(severityOf('ℹ️ Info')).toBe('info');
    expect(severityOf('✓ none')).toBe('clear');
  });
});

describe('the template report', () => {
  it('reads the preamble and the truths', () => {
    expect(syn.h1).toBe('Phase 6: Live File Watching Verification Report');
    expect(syn.goal).toContain('appear in the open dashboard within a second');
    expect(syn.verifier).toBe('Claude (subagent)');
    expect(syn.truths.map((t) => t.status)).toEqual([
      'verified', 'verified', 'coincidental', 'failed', 'failed', 'verified', 'unverified', 'uncertain', 'verified', 'verified',
    ]);
    expect(new Set(syn.truths.map((t) => t.group))).toEqual(new Set(['Observable truths']));
  });

  it('reads requirements, anti-patterns and human checks', () => {
    expect(syn.requirements.map((r) => [r.id, r.status])).toEqual([
      ['PLAT-01', 'blocked'], ['PLAT-02', 'satisfied'], ['PLAT-03', 'human'], ['DASH-06', 'satisfied'], ['FIND-07', 'blocked'],
    ]);
    expect(syn.requirements[0].description).toBe('Live file-watching with push updates');
    expect(syn.requirements[1].note).toBe('');
    expect(syn.antiPatterns.map((a) => a.severity)).toEqual(['blocker', 'blocker', 'warning', 'info']);
    expect(syn.antiPatterns[0].file).toBe('src/search/index.ts');
    expect(syn.humanChecks).toHaveLength(2);
    expect(syn.humanChecks[0].title).toBe('Burst saves across two windows');
    expect(syn.humanChecks[0].test).toContain('save it three times quickly');
    expect(syn.humanChecks[0].expected).toContain('one update rather than three');
    expect(syn.humanChecks[0].why).toContain('Debounce timing');
  });

  it('reads the gaps, the fix plans and the metadata', () => {
    expect(syn.gaps.critical.map((g) => g.name)).toEqual([
      'Search index is a startup snapshot',
      'Deleted files stay searchable',
    ]);
    expect(syn.gaps.nonCritical.map((g) => g.name)).toEqual([
      'Rename depends on event order',
      'Debug logging left in the client',
    ]);
    expect(syn.gaps.critical[0].missing).toContain("watcher's `change` handler");
    expect(syn.gaps.critical[0].impact).toContain('stale text');
    expect(syn.gaps.critical[0].fix).toContain('MiniSearch `discard` + `add`');
    expect(syn.gaps.nonCritical[0].fixLabel).toBe('Recommendation');
    expect(syn.gaps.nonCritical[0].missing).toContain('only works because chokidar');
    expect(syn.fixShape).toBe('plans');
    expect(syn.fixPlans.map((p) => [p.file, p.name, p.scope, p.tasks.length])).toEqual([
      ['06-04-PLAN.md', 'Keep search current', 'Small', 3],
      ['06-05-PLAN.md', 'Harden rename handling', 'Small', 3],
    ]);
    expect(syn.fixPlans[0].tasks.map((t) => t.verify)).toEqual([false, false, true]);
    expect(syn.fixPlans[0].objective).toContain('edits and deletes reach search');
    expect(syn.metadata).toEqual({
      approach: 'Goal-backward (derived from phase goal)',
      source: '06-01-PLAN.md, 06-02-PLAN.md, 06-03-PLAN.md frontmatter',
      automatedPassed: 14,
      automatedFailed: 2,
      duration: '6 min',
    });
  });

  it('leaves only the two artifact sections unhandled', () => {
    expect(alsoOf(syn)).toEqual(['Required Artifacts', 'Key Link Verification']);
  });
});

describe('studio-portal phase 4', () => {
  it('reads 39 truths across 8 groups', () => {
    expect(sp04.truths).toHaveLength(39);
    const groups = [...new Set(sp04.truths.map((t) => t.group))];
    expect(groups).toEqual([
      'Roadmap success criteria', 'Plan 04-01', 'Plan 04-02', 'Plan 04-03', 'Plan 04-04', 'Plan 04-05', 'Plan 04-06', 'Plan 04-07',
    ]);
    const count = (state: string): number => sp04.truths.filter((t) => t.status === state).length;
    expect([count('verified'), count('failed'), count('uncertain'), count('unverified')]).toEqual([19, 9, 8, 3]);
  });

  it('reads the prose gap-closure shape', () => {
    expect(sp04.fixShape).toBe('prose');
    expect(sp04.fixPlans.map((p) => [p.name, p.tasks.length, p.scope])).toEqual([
      ['Backend lifecycle/data-safety plan', 5, null],
      ['Capability-honesty plan', 2, null],
      ['Frontend/evidence closure plan', 5, null],
    ]);
    expect(sp04.fixPlans[0].tasks.map((t) => t.text)).toEqual([
      'Wire HTTP cancellation',
      'Fix full-coverage deletion',
      'Enforce reopen/cumulative sizes',
      'Make sweep/omission persistence failures explicit',
      'Add the missing regression tests',
    ]);
    expect(sp04.fixPlans[0].tasks.map((t) => t.verify)).toEqual([false, false, false, false, true]);
    expect(sp04.fixPlans[1].tasks.map((t) => t.text)).toEqual([
      'Implement cloud archive reads or fail closed before insertion',
      'With an end-to-end cloud test',
    ]);
    expect(sp04.fixPlans[2].tasks.map((t) => t.text)).toEqual([
      'Retain/refresh live terminal jobs',
      'Add atomic explicit-collection gating',
      'Run the browser checkpoint',
      'Execute the exact production archive journey',
      'Complete four native interop results',
    ]);
  });

  it('reads the requirements, spot-checks and human checks', () => {
    expect(sp04.requirements).toHaveLength(10);
    expect(sp04.requirements.filter((r) => r.status === 'blocked')).toHaveLength(5);
    expect(sp04.requirements.find((r) => r.id === 'DL-03')?.plans).toEqual(['04-02', '04-05']);
    expect(sp04.spotChecks).toHaveLength(9);
    expect(sp04.spotChecks.filter((s) => s.status === 'pass')).toHaveLength(8);
    expect(sp04.spotChecks.filter((s) => s.status === 'skip')).toHaveLength(1);
    expect(sp04.humanChecks.map((h) => h.title)).toEqual([
      'Native ZIP64 interoperability',
      'Responsive, focus, live-region, and native-download browser protocol',
      'Real deadline failure',
    ]);
    expect(sp04.antiPatterns).toHaveLength(7);
    expect(sp04.gapProse).toContain('The phase goal is not achieved.');
    expect(alsoOf(sp04)).toEqual([
      'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace', 'Behavioral Spot-Checks', 'Probe Execution',
      'Prohibitions', 'Test Quality Audit', 'Decision Coverage', 'Next Action',
    ]);
  });
});

describe('the other reports', () => {
  it('sideby 04 has no body checks and a roadmap column', () => {
    expect(sb04.humanChecks).toEqual([]);
    expect(sb04.truths).toHaveLength(5);
    expect(sb04.requirements).toHaveLength(15);
    expect(sb04.antiPatterns).toEqual([]);
    expect(sb04.antiNote).toContain('None.');
    expect(alsoOf(sb04)).toEqual([
      'VU-meter note (CALL-04 / SC1) — user-approved reinterpretation, not a gap',
      'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace', 'Behavioral Spot-Checks',
    ]);
  });

  it('deid 01 is a re-verification with its sections left for Source', () => {
    expect(dd01.reVerification).toMatch(/^Yes/);
    expect(dd01.truths).toHaveLength(14);
    expect(dd01.antiPatterns.map((a) => a.severity)).toEqual(['clear', 'warning', 'warning', 'info', 'info']);
    expect(alsoOf(dd01)).toEqual([
      'Re-verification note', 'Data-Blocked Items', 'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace',
      'Behavioral Spot-Checks', 'Probe Execution',
    ]);
  });

  it('labelore 05 keeps four bold-list titles and a warning anti-pattern', () => {
    expect(lb05.humanTitles).toHaveLength(4);
    expect(lb05.humanChecks).toEqual([]);
    expect(lb05.antiPatterns.map((a) => a.severity)).toEqual(['warning', 'info', 'info']);
    expect(lb05.antiPatterns[0].impact).toContain('Reachable via');
    expect(lb05.truths.map((t) => t.n)).toEqual(['1', '2', '3', '4a', '4b', '5a', '5b']);
    expect(lb05.truths.map((t) => t.status).filter((s) => s === 'unverified')).toHaveLength(2);
  });

  it('labelore v1.0/01 reads a same-level numbered check and leaves the Resolved section', () => {
    expect(lb01.humanChecks).toHaveLength(1);
    expect(lb01.humanChecks[0].title).toBe('Manual smoke test against `~/studio-portal`');
    expect(lb01.humanChecks[0].test).toContain('npm run snapshot');
    expect(alsoOf(lb01)).toContain('Human Verification — Resolved 2026-09-09');
  });
});

describe('degradation', () => {
  it('gives an empty model for nothing or frontmatter only', () => {
    for (const input of ['', '---\nstatus: passed\n---\n']) {
      const report = extractVerificationReport(input);
      expect(report.truths).toEqual([]);
      expect(report.sections).toEqual([]);
      expect(report.h1).toBeNull();
    }
  });

  it('never throws on malformed tables, fences and stray structure', () => {
    const bodies = [
      '| Truth | Status |\n|---|---|\n| only a truth |\n| | |\n',
      '| Truth | Status |\n|---|---|\n',
      '```\n| Truth | Status |\n|---|---|\n| hidden | ✓ |\n## Gaps Summary\n',
      '| # | Truth | Status |\n|---|---|---|\n| 1 | outside any section | ✓ VERIFIED |\n',
      '## Gaps Summary\n\n### Critical Gaps (Block Progress)\n\n1. **\n   - Missing:\n2. ****\n',
      '## Human Verification Required\n\n### 1.\n### 2) x\n**Test:**\n**Expected:** \n',
      '## Recommended Fix Plans\n\n### : \n1.\n',
      '`a|b` | ``c|d` | x\n| a | b |\n|---|---|\n| `x | y | ``z\n',
    ];
    for (const body of bodies) expect(() => extractVerificationReport(body)).not.toThrow();
    const truths = extractVerificationReport(bodies[0]).truths;
    expect(truths).toHaveLength(1);
    expect(extractVerificationReport(bodies[2]).truths).toEqual([]);
    expect(extractVerificationReport(bodies[3]).truths).toHaveLength(1);
  });

  it('extracts a 1 MB body holding a 200k-character hostile line within 250 ms', () => {
    const hostile = '`*|[**1. **'.repeat(20000);
    expect(hostile.length).toBeGreaterThanOrEqual(200000);
    const filler = 'x'.repeat(79) + '\n';
    const body = `# T\n\n## Goal Achievement\n\n| # | Truth | Status |\n|---|---|---|\n| 1 | ${hostile} | ✓ |\n\n## Gaps Summary\n\n### Critical Gaps (Block Progress)\n\n1. **${hostile}**\n   - Missing: ${hostile}\n\n## Recommended Gap-Closure Shape\n\n1. **${hostile}:** ${hostile}\n\n${filler.repeat(9000)}`;
    expect(body.length).toBeGreaterThan(900000);
    const start = performance.now();
    const report = extractVerificationReport(body);
    const elapsed = performance.now() - start;
    expect(report.sections.length).toBe(4);
    expect(elapsed).toBeLessThan(250);
  });

  it('caps hostile lists', () => {
    const rows = '| 1 | row | ✓ VERIFIED |\n'.repeat(3000);
    const report = extractVerificationReport(`## Truths\n\n| # | Truth | Status |\n|---|---|---|\n${rows}`);
    expect(report.truths.length).toBeLessThanOrEqual(500);
  });
});
