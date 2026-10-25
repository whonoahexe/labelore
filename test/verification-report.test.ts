// quick-261017-18a (sketch 021 E): the VERIFICATION body extractor - pinned against the synthetic template
// report (test/fixtures/verification/), four made-up Lendshed reports (D-01, D-06), labelore's own phase 1
// and phase 5 reports, the tolerant degrade paths and the T-18a-02 growth bound. Every Lendshed pin was
// recounted by grep and awk in the made-up file itself (R5), never copied from the extractor's output.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  extractVerificationReport,
  requirementStatusOf,
  severityOf,
  truthStatusOf,
} from '../src/planning-repo/handlers/verification-report.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { fxPath } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const FIXTURES = new URL('./fixtures/verification/', import.meta.url).pathname;
const LB = new URL('../.planning/', import.meta.url).pathname;

function bodyOf(path: string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

const syn = extractVerificationReport(bodyOf(`${FIXTURES}synthetic-VERIFICATION.md`));
const lx04 = extractVerificationReport(bodyOf(fxPath('phases/04-bulk-loan-export/04-VERIFICATION.md')));
const lx03 = extractVerificationReport(bodyOf(fxPath('phases/03-account-admin-and-sessions/03-VERIFICATION.md')));
const lx01 = extractVerificationReport(bodyOf(fxPath('milestones/v1.0-phases/01-member-data-foundation/01-VERIFICATION.md')));
const lxq = extractVerificationReport(
  bodyOf(fxPath('quick/260327-h4w-move-the-live-status-socket-into-a-provider/260327-h4w-VERIFICATION.md')),
);
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

describe('Lendshed phase 4 (prose gap-closure shape)', () => {
  it('reads 21 truths across 5 groups', () => {
    expect(lx04.truths).toHaveLength(21);
    const groups = [...new Set(lx04.truths.map((t) => t.group))];
    expect(groups).toEqual(['Roadmap success criteria', 'Plan 04-01', 'Plan 04-02', 'Plan 04-03', 'Plan 04-04']);
    const count = (state: string): number => lx04.truths.filter((t) => t.status === state).length;
    expect([count('verified'), count('failed'), count('uncertain'), count('unverified')]).toEqual([8, 6, 5, 2]);
  });

  it('reads the prose gap-closure shape', () => {
    expect(lx04.fixShape).toBe('prose');
    expect(lx04.fixPlans.map((p) => [p.name, p.tasks.length, p.scope])).toEqual([
      ['Server lifecycle plan', 5, null],
      ['Capability-honesty plan', 2, null],
      ['Web and evidence plan', 5, null],
    ]);
    expect(lx04.fixPlans[0].tasks.map((t) => t.text)).toEqual([
      'Wire HTTP cancellation',
      'Fix whole-file removal',
      'Enforce row counts when rewriting',
      'Make sweep and skipped-loan write failures explicit',
      'Add the missing regression tests',
    ]);
    expect(lx04.fixPlans[0].tasks.map((t) => t.verify)).toEqual([false, false, false, false, true]);
    expect(lx04.fixPlans[1].tasks.map((t) => t.text)).toEqual([
      'Read counter-fed loans or refuse before any job row',
      'With an end-to-end Depot test',
    ]);
    expect(lx04.fixPlans[2].tasks.map((t) => t.text)).toEqual([
      'Keep finished live jobs',
      'Gate explicit fetches atomically',
      'Run the browser check',
      'Run the built-export journey over the member route',
      'Complete four desktop archive results',
    ]);
  });

  it('reads the requirements, spot-checks and human checks', () => {
    expect(lx04.requirements).toHaveLength(6);
    expect(lx04.requirements.filter((r) => r.status === 'blocked')).toHaveLength(3);
    expect(lx04.requirements.find((r) => r.id === 'EXPT-03')?.plans).toEqual(['04-02', '04-04']);
    expect(lx04.spotChecks).toHaveLength(8);
    expect(lx04.spotChecks.filter((s) => s.status === 'pass')).toHaveLength(7);
    expect(lx04.spotChecks.filter((s) => s.status === 'skip')).toHaveLength(1);
    expect(lx04.humanChecks.map((h) => h.title)).toEqual([
      'Desktop archive readability',
      'Responsive, focus and announcement protocol',
      'Real deadline failure',
    ]);
    expect(lx04.antiPatterns).toHaveLength(7);
    expect(lx04.gapProse).toContain('The goal of this phase is not met.');
    expect(alsoOf(lx04)).toEqual([
      'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace', 'Behavioral Spot-Checks', 'Probe Execution',
      'Prohibitions', 'Test Quality Audit', 'Decision Coverage', 'Next Action',
    ]);
  });
});

describe('the other reports', () => {
  it('Lendshed 03 has no body checks and a roadmap column', () => {
    expect(lx03.humanChecks).toEqual([]);
    expect(lx03.truths).toHaveLength(5);
    expect(lx03.requirements).toHaveLength(6);
    expect(lx03.antiPatterns).toEqual([]);
    expect(lx03.antiNote).toContain('None.');
    expect(alsoOf(lx03)).toEqual([
      'Session-count note (ADMN-05 / SC4) — steward-approved reinterpretation, not a gap',
      'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace', 'Behavioral Spot-Checks',
    ]);
  });

  it('Lendshed v1.0/01 is a re-verification with its sections left for Source', () => {
    expect(lx01.reVerification).toMatch(/^Yes/);
    expect(lx01.truths).toHaveLength(8);
    expect(lx01.antiPatterns.map((a) => a.severity)).toEqual(['clear', 'warning', 'warning', 'info', 'info']);
    expect(alsoOf(lx01)).toEqual([
      'Re-verification note', 'Data-Blocked Items', 'Required Artifacts', 'Key Link Verification', 'Data-Flow Trace',
      'Behavioral Spot-Checks', 'Probe Execution',
    ]);
  });

  it('Lendshed quick 260327-h4w reads a same-level numbered check', () => {
    expect(lxq.humanChecks).toHaveLength(1);
    expect(lxq.humanChecks[0].title).toBe('One socket survives in-app navigation');
    expect(lxq.humanChecks[0].test).toContain('network panel on the WS filter');
    expect(lxq.truths).toHaveLength(5);
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
    expect(lb01.humanChecks[0].title).toMatch(/^Manual smoke test against /);
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

  it('extracts a 1 MB body holding a 200k-character hostile line without throwing', () => {
    const hostile = '`*|[**1. **'.repeat(20000);
    expect(hostile.length).toBeGreaterThanOrEqual(200000);
    const filler = 'x'.repeat(79) + '\n';
    const body = `# T\n\n## Goal Achievement\n\n| # | Truth | Status |\n|---|---|---|\n| 1 | ${hostile} | ✓ |\n\n## Gaps Summary\n\n### Critical Gaps (Block Progress)\n\n1. **${hostile}**\n   - Missing: ${hostile}\n\n## Recommended Gap-Closure Shape\n\n1. **${hostile}:** ${hostile}\n\n${filler.repeat(9000)}`;
    expect(body.length).toBeGreaterThan(900000);
    const report = extractVerificationReport(body);
    expect(report.sections.length).toBe(4);
  });

  it('the same hostile body grows no faster than linearly', () => {
    const unit = '`*|[**1. **';
    const filler = 'x'.repeat(79) + '\n';
    const make = (size: number): string => {
      // Both sizes keep each hostile line under the 8000-character line clip, so the ratio measures the scan, not the clip.
      const hostile = unit.repeat(Math.max(1, Math.floor(size / unit.length / 80)));
      return `# T\n\n## Goal Achievement\n\n| # | Truth | Status |\n|---|---|---|\n| 1 | ${hostile} | ✓ |\n\n## Gaps Summary\n\n### Critical Gaps (Block Progress)\n\n1. **${hostile}**\n   - Missing: ${hostile}\n\n## Recommended Gap-Closure Shape\n\n1. **${hostile}:** ${hostile}\n\n${filler.repeat(Math.max(1, Math.floor(size / 160)))}`;
    };
    const { ratio } = measureGrowth({ make, run: (body) => void extractVerificationReport(body), startSize: 20000 });
    expect(ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('caps hostile lists', () => {
    const rows = '| 1 | row | ✓ VERIFIED |\n'.repeat(3000);
    const report = extractVerificationReport(`## Truths\n\n| # | Truth | Status |\n|---|---|---|\n${rows}`);
    expect(report.truths.length).toBeLessThanOrEqual(500);
  });
});
