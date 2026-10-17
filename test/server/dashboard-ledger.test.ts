// quick-261018-4tb: the dashboard ledger (everything below the project head) through the real
// reader. Expected values come from the sketch's own rules run over the fixture files, written out
// in the plan's corpus facts, never from the code under test.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { buildDashboardLedger, emptyLedger } from '../../src/server/dashboard-ledger.ts';
import { createApp } from '../../src/server/index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { fromDirectory } from '../helpers/from-directory.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEDGER_ROOT = join(REPO_ROOT, 'test/fixtures/dashboard/ledger');
const SYNTHETIC_ROOT = join(REPO_ROOT, 'test/fixtures/dashboard/synthetic');
const DENSE_ROOT = join(REPO_ROOT, 'fixtures/dense');
const READ_AT = '2026-10-18T12:00:00.000Z';

async function snapshotOfDirectory(root: string): Promise<ProjectSnapshot> {
  const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
  return { ...snapshot, readAt: READ_AT };
}

async function snapshotOf(files: Record<string, string>): Promise<ProjectSnapshot> {
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
  return { ...snapshot, readAt: READ_AT };
}

async function ledgerOfDirectory(root: string) {
  const snapshot = await snapshotOfDirectory(root);
  return { snapshot, presentation: toProjectPresentation(snapshot), ledger: toProjectPresentation(snapshot).ledger };
}

const keyOf = (presentation: ReturnType<typeof toProjectPresentation>, path: string) =>
  presentation.artifacts.find((artifact) => artifact.path === path)?.key;

const PHASE3 = '.planning/phases/03-gateway-hardening';
const REVIEW = `${PHASE3}/03-REVIEW.md`;
const AUDIT = '.planning/milestones/v1.0-MILESTONE-AUDIT.md';

describe('dashboard ledger: blockers', () => {
  it('reads the ledger fixture row for row', async () => {
    const { presentation, ledger } = await ledgerOfDirectory(LEDGER_ROOT);
    const plan32 = presentation.milestones.flatMap((m) => m.phases).flatMap((p) => p.plans).find((p) => p.id === '03-02');
    expect(plan32).toBeDefined();
    const blockers = ledger.blockers;
    expect(blockers).toHaveLength(5);

    expect(blockers.map((b) => [b.group, b.tag, b.urgent, b.resolved, b.title, b.why])).toEqual([
      ['Phase 3 review', 'ACTIVE PAUSE', false, false, 'Gateway retries stall', 'backoff ignores the header (03-REVIEW WR-02), tracked in plan 03-02.'],
      ['Phase 3 review', null, false, false, 'WR-01 is still open: a retry storm on every 5xx.', null],
      ['Operational', null, true, false, 'The sandbox certificate expires 2026-10-30', 'Renew it before the integration run; ACCESS-04 depends on it.'],
      ['Operational', 'RESOLVED', false, true, 'Flaky snapshot test', 'fixed in 260714-3tp.'],
      ['Operational', null, false, false, 'Vendor ticket WHAT-75 was opened on 10-14 and has no answer yet.', null],
    ]);

    const shape = (b: (typeof blockers)[number]) =>
      b.sources.map((s) => [s.kind, s.label, s.meta, s.detail, s.path]);
    expect(shape(blockers[0])).toEqual([
      ['Review finding', 'WR-02', 'Phase 03 review', 'Backoff ignores the Retry-After header', REVIEW],
      ['Plan', '03-02', 'No summary yet', 'Honour Retry-After in the gateway backoff.', `${PHASE3}/03-02-PLAN.md`],
      ['Document', 'v1.0-MILESTONE-AUDIT', 'Named for the whole “Phase 3 review” group', null, AUDIT],
    ]);
    expect(shape(blockers[1])).toEqual([
      ['Review finding', 'WR-01', 'Phase 3 review', 'Retry storm on every 5xx', REVIEW],
      ['Document', 'v1.0-MILESTONE-AUDIT', 'Named for the whole “Phase 3 review” group', null, AUDIT],
    ]);
    expect(shape(blockers[2])).toEqual([
      ['Requirement', 'ACCESS-04', 'REQUIREMENTS', 'Importers can sign in and see only their own filings', '.planning/REQUIREMENTS.md'],
    ]);
    expect(shape(blockers[3])).toEqual([
      [
        'Quick task',
        '260714-3tp',
        'Has a summary',
        'Cache tariff lookups for the session.',
        '.planning/quick/260714-3tp-cache-tariff-lookups/260714-3tp-SUMMARY.md',
      ],
    ]);
    expect(blockers[4].sources).toEqual([]);

    const mentions = (b: (typeof blockers)[number]) => b.mentions.map((m) => [m.label, m.path]);
    expect(mentions(blockers[0])).toEqual([['2026-07-20-retry-after', '.planning/notes/2026-07-20-retry-after.md']]);
    expect(mentions(blockers[1])).toEqual([]);
    expect(mentions(blockers[2])).toEqual([['portal', '.planning/research/portal.md']]);
    expect(mentions(blockers[3])).toEqual([['03-02-PLAN', `${PHASE3}/03-02-PLAN.md`]]);
    expect(mentions(blockers[4])).toEqual([]);
    for (const b of blockers) expect(b.moreMentions).toBe(0);

    // The plan source links to the plan's own page; every other url is the artifact page.
    expect(blockers[0].sources[1].url).toBe(plan32!.key);
    for (const b of blockers) {
      for (const s of b.sources.filter((x) => x.kind !== 'Plan')) expect(s.url).toBe(keyOf(presentation, s.path));
      for (const m of b.mentions) expect(m.url).toBe(keyOf(presentation, m.path));
    }
    // Nothing that reaches the page names the file the blockers were read from.
    expect(JSON.stringify(blockers)).not.toContain('STATE.md');
  });

  it('keeps the blocker text whole for Copy text, and keys by position', async () => {
    const { ledger } = await ledgerOfDirectory(LEDGER_ROOT);
    expect(ledger.blockers.map((b) => b.key)).toEqual(['blocker-0', 'blocker-1', 'blocker-2', 'blocker-3', 'blocker-4']);
    expect(ledger.blockers[4].text).toBe('Vendor ticket WHAT-75 was opened on 10-14 and has no answer yet.');
  });

  it('reads the synthetic fixture: three blockers, no sources, the certificate one urgent', async () => {
    const { ledger } = await ledgerOfDirectory(SYNTHETIC_ROOT);
    expect(ledger.blockers.map((b) => b.group)).toEqual(['Gateway', 'Gateway', 'Process']);
    expect(ledger.blockers.every((b) => b.sources.length === 0)).toBe(true);
    expect(ledger.blockers.map((b) => b.urgent)).toEqual([true, false, false]);
    expect(ledger.blockers[0].title).toBe('The ACE sandbox certificate expires 2026-10-30');
  });

  it('reads the dense fixture: one untagged blocker with no group', async () => {
    const { ledger } = await ledgerOfDirectory(DENSE_ROOT);
    expect(ledger.blockers).toHaveLength(1);
    expect(ledger.blockers[0]).toMatchObject({
      group: null,
      title: "Phase 2's transport layer plan has not yet produced a summary",
      why: 'mid-flight phase shape.',
      sources: [],
    });
  });

  it('degrades to empty sections and never throws', async () => {
    const onlyProject = await snapshotOf({ '.planning/PROJECT.md': '# P\n' });
    expect(toProjectPresentation(onlyProject).ledger).toEqual(emptyLedger());

    const none = await snapshotOf({
      '.planning/STATE.md': '---\nstatus: x\n---\n\n## Accumulated Context\n\n### Blockers/Concerns\n\nNone yet.\n',
    });
    expect(toProjectPresentation(none).ledger.blockers).toEqual([]);

    const malformed = await snapshotOf({
      '.planning/STATE.md':
        '---\nstatus: [unclosed\n---\n\n## Accumulated Context\n\n### Blockers/Concerns\n\n- Something is wrong 03-REVIEW WR-09 and ZZZ-99\n',
    });
    const built = toProjectPresentation(malformed).ledger.blockers;
    expect(built.length).toBeLessThanOrEqual(1);
    for (const blocker of built) expect(blocker.sources).toEqual([]);

    const noHeading = await snapshotOf({
      '.planning/STATE.md':
        '---\nstatus: x\n---\n\n## Accumulated Context\n\n### Blockers/Concerns\n\n- Waiting on 05-REVIEW WR-02 and DEPLOY-77\n',
      '.planning/phases/05-x/05-01-PLAN.md': '<objective>\nDo.\n</objective>\n',
      '.planning/phases/05-x/05-REVIEW.md': '# Review\n\n### WR-01: Another\n',
    });
    expect(toProjectPresentation(noHeading).ledger.blockers[0].sources).toEqual([]);
  });

  it('builds 300 long blockers over 300 large artifacts in under 1,500 ms', async () => {
    const files: Record<string, string> = {};
    const bullets: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      const quick = `26${String(1000 + i).slice(-4)}-a${String(i % 10)}z`;
      const requirement = `REQ-${String(10 + (i % 80))}`;
      const filler = 'lorem ipsum dolor sit amet, '.repeat(32);
      bullets.push(
        `- **Blocker ${i} stalls the pipeline.** ${filler}see ${quick}, ${requirement} and 03-REVIEW WR-${String((i % 9) + 1).padStart(2, '0')}. ${filler}`,
      );
      files[`.planning/research/doc-${String(i).padStart(3, '0')}.md`] =
        `# Doc ${i}\n\n${`${quick} ${requirement} 03-REVIEW WR-01 filler text. `.repeat(2)}${'x'.repeat(40_000)}\n`;
    }
    files['.planning/STATE.md'] = `---\nstatus: x\n---\n\n## Accumulated Context\n\n### Blockers/Concerns\n\n${bullets.join('\n')}\n`;
    files['.planning/REQUIREMENTS.md'] = '# R\n\n- [ ] **REQ-10**: Ten\n';
    const snapshot = await snapshotOf(files);
    const started = performance.now();
    const ledger = buildDashboardLedger(snapshot.project!);
    const elapsed = performance.now() - started;
    // The section cap (200,000 characters) keeps the first ~110 of the 300 entries; what matters is
    // that reading them and indexing 300 x 40 KB of artifacts stays inside the budget.
    expect(ledger.blockers.length).toBeGreaterThanOrEqual(100);
    expect(ledger.blockers.length).toBeLessThanOrEqual(300);
    expect(ledger.blockers[0].sources.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1500);
  }, 30_000);
});

describe('dashboard ledger: decisions', () => {
  it('reads the ledger fixture newest first with its sources and phase links', async () => {
    const { presentation, ledger } = await ledgerOfDirectory(LEDGER_ROOT);
    const decisions = ledger.decisions;
    expect(decisions.map((d) => [d.phase, d.plan, d.title, d.why, d.logged])).toEqual([
      [null, null, 'Keep the retry queue in Postgres, not Redis.', null, 'No phase'],
      ['02', null, 'Corrections are new filings, never edits in place.', null, 'Phase 02'],
      ['03', '03-01', 'Key filings by entry number', 'the gateway echoes it on every rejection.', 'Phase 03 · while executing plan 03-01'],
      [null, '260714-3tp', 'Cache tariff lookups per session', 'the form refetched on every keystroke.', 'No phase · during quick task 260714-3tp'],
      ['01', '01-CONTEXT', 'Reconcile on entry number plus line number.', null, 'Phase 01 · while gathering context'],
      ['01', '01-02', 'Store the raw response beside the parsed one', 'parse failures must stay recoverable.', 'Phase 01 · while executing plan 01-02'],
    ]);
    expect(decisions.map((d) => (d.source ? [d.source.kind, d.source.label, d.source.meta, d.source.detail, d.source.path] : null))).toEqual([
      null,
      null,
      ['Plan', '03-01', null, 'Key filings by entry number across the gateway client.', `${PHASE3}/03-01-PLAN.md`],
      [
        'Quick task',
        '260714-3tp',
        null,
        'Cache tariff lookups for the session.',
        '.planning/quick/260714-3tp-cache-tariff-lookups/260714-3tp-SUMMARY.md',
      ],
      ['Context', 'Phase 01', 'v1.0', null, '.planning/milestones/v1.0-phases/01-filing-gateway/01-CONTEXT.md'],
      ['Plan', '01-02', 'v1.0', 'Store each raw ACE response beside its parsed form.', '.planning/milestones/v1.0-phases/01-filing-gateway/01-02-PLAN.md'],
    ]);

    const phases = presentation.milestones.flatMap((m) => m.phases);
    const phaseKey = (version: string, number: string) =>
      phases.find((p) => p.identity.milestoneVersion === version && p.identity.number === number)?.key;
    const urlOfPhase = (key: string | undefined) => presentation.milestones.flatMap((m) => m.phases).find((p) => p.key === key);
    expect(decisions.map((d) => d.phaseUrl !== null)).toEqual([false, true, true, false, true, true]);
    expect(decisions[1].phaseUrl).toContain(phaseKey('v1.0', '02'));
    expect(decisions[2].phaseUrl).toContain(phaseKey('v2.0', '03'));
    expect(decisions[5].phaseUrl).toContain(phaseKey('v1.0', '01'));
    expect(urlOfPhase(phaseKey('v1.0', '02'))).toBeDefined();
    // The plan source links to the plan's page; the others to the artifact page.
    const plan0301 = phases.flatMap((p) => p.plans).find((p) => p.id === '03-01');
    expect(decisions[2].source?.url).toBe(plan0301?.key);
    expect(decisions[3].source?.url).toBe(keyOf(presentation, decisions[3].source!.path));
    expect(JSON.stringify(decisions)).not.toContain('STATE.md');
  });

  it('reads the synthetic and dense fixtures', async () => {
    const synthetic = (await ledgerOfDirectory(SYNTHETIC_ROOT)).ledger.decisions;
    expect(synthetic).toHaveLength(9);
    expect(synthetic.every((d) => d.source === null)).toBe(true);
    expect(synthetic[0].title).toBe(
      "Duty differences under ₹500 auto-reconcile; anything above waits for a broker's sign-off.",
    );
    expect([synthetic[0].phase, synthetic[0].plan]).toEqual(['03', '03-CONTEXT']);

    const dense = (await ledgerOfDirectory(DENSE_ROOT)).ledger.decisions;
    expect(dense.map((d) => [d.phase, d.title, d.source, d.phaseUrl !== null])).toEqual([
      [null, 'Corruption deliberately isolated to two files, per D-02.', null, false],
      ['01', 'Included every artifact type studio-portal has never produced, per D-01.', null, true],
    ]);
  });

  it('splits plan-id tags and quick tags the way the sketch does', async () => {
    const snapshot = await snapshotOf({
      '.planning/STATE.md': [
        '---',
        'status: x',
        '---',
        '',
        '## Accumulated Context',
        '',
        '### Decisions',
        '',
        'Prose above the log is a note, not a decision.',
        '',
        '- [Phase 01-01]: Plan-id tag',
        '- [Phase quick-260709-rk9]: Quick-id tag',
        '- [Quick 260718-x5s follow-up]: Bare quick tag',
        '- [Phase ?]: 02-03: Plan id after an unknown phase',
        '- [Phase 2.1]: Decimal phase',
        '',
      ].join('\n'),
    });
    const decisions = toProjectPresentation(snapshot).ledger.decisions.reverse();
    expect(decisions.map((d) => [d.phase, d.plan, d.title])).toEqual([
      ['01', '01-01', 'Plan-id tag'],
      [null, '260709-rk9', 'Quick-id tag'],
      [null, '260718-x5s', 'Bare quick tag'],
      ['02', '02-03', 'Plan id after an unknown phase'],
      ['2.1', null, 'Decimal phase'],
    ]);
  });

  it('gives no decisions for a missing or prose-only section', async () => {
    const none = await snapshotOf({ '.planning/STATE.md': '---\nstatus: x\n---\n\n## Accumulated Context\n\n### Blockers/Concerns\n\nNone.\n' });
    expect(toProjectPresentation(none).ledger.decisions).toEqual([]);
    const prose = await snapshotOf({
      '.planning/STATE.md': '---\nstatus: x\n---\n\n## Accumulated Context\n\n### Decisions\n\nDecisions are logged in PROJECT.md.\n',
    });
    expect(toProjectPresentation(prose).ledger.decisions).toEqual([]);
  });
});

describe('dashboard ledger: pace rows', () => {
  const shape = (plans: { id: string; milestone: string | null; date: string | null; minutes: number | null; approx: boolean; untimedReason: string | null; tasks: number | null }[]) =>
    plans.map((p) => [p.id, p.milestone, p.date, p.minutes, p.approx, p.untimedReason, p.tasks]);

  it('rebuilds the ledger fixture from each SUMMARY.md, in finish order', async () => {
    const { ledger } = await ledgerOfDirectory(LEDGER_ROOT);
    expect(ledger.pace.current).toBe('v2.0');
    expect(shape(ledger.pace.plans)).toEqual([
      ['01-01', 'v1.0', '2026-05-30', 60, false, null, 1],
      ['01-02', 'v1.0', '2026-06-01', 35, true, null, 3],
      ['02-01', 'v1.0', '2026-06-10', null, false, 'wall-clock time', 1],
      ['03-01', 'v2.0', '2026-07-10', 20, false, null, 2],
    ]);
    expect(ledger.pace.plans[0].phaseName).toBe('Filing Gateway');
  });

  it('rebuilds the dense fixture', async () => {
    const { ledger } = await ledgerOfDirectory(DENSE_ROOT);
    expect(ledger.pace.current).toBe('v3.0');
    expect(shape(ledger.pace.plans)).toEqual([
      ['01-01', 'v1.0', '2025-10-25', 15, false, null, 1],
      ['01-01', 'v2.0', '2026-02-10', 18, false, null, 1],
      ['02-01', 'v2.0', '2026-03-15', 16, false, null, 1],
      ['01-01', 'v3.0', '2026-06-08', 20, false, null, 2],
      ['01-02', 'v3.0', '2026-06-09', 24, false, null, 2],
    ]);
  });

  it('has no rows when no plan has a summary', async () => {
    const { ledger } = await ledgerOfDirectory(SYNTHETIC_ROOT);
    expect(ledger.pace.plans).toEqual([]);
  });

  it('reads duration and completed under metrics, and falls back to tasks_completed', async () => {
    const snapshot = await snapshotOf({
      '.planning/STATE.md': '---\nmilestone: v1.0\n---\n',
      '.planning/phases/01-a/01-01-PLAN.md': '<objective>\nDo.\n</objective>\n',
      '.planning/phases/01-a/01-01-SUMMARY.md':
        '---\nmetrics:\n  duration: 25min\n  completed: 2026-09-01\n  tasks_completed: 4\n---\n',
      '.planning/phases/01-a/01-02-PLAN.md': '<objective>\nDo.\n</objective>\n',
      '.planning/phases/01-a/01-02-SUMMARY.md': '---\nduration: 10min\ncompleted: someday\n---\n',
    });
    const plans = toProjectPresentation(snapshot).ledger.pace.plans;
    expect(shape(plans)).toEqual([
      ['01-01', 'v1.0', '2026-09-01', 25, false, null, 4],
      ['01-02', 'v1.0', null, 10, false, null, null],
    ]);
  });
});

describe('GET /api/dashboard', () => {
  let staticRoot = '';
  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'labelore-dashboard-ledger-'));
    await writeFile(join(staticRoot, 'index.html'), '<!doctype html><div id="root"></div>');
  });
  afterAll(async () => {
    await rm(staticRoot, { recursive: true, force: true });
  });

  it('carries the ledger fixture blockers with their first source on the first one', async () => {
    const snapshot = await snapshotOfDirectory(LEDGER_ROOT);
    const response = await createApp({ getSnapshot: () => snapshot }, true, staticRoot).request('/api/dashboard');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { blockers: { sources: { label: string }[] }[] };
    expect(body.blockers).toHaveLength(5);
    expect(body.blockers[0].sources[0].label).toBe('WR-02');
  });

  it('answers 200 for a project with only PROJECT.md', async () => {
    const snapshot = await snapshotOf({ '.planning/PROJECT.md': '# P\n' });
    const response = await createApp({ getSnapshot: () => snapshot }, true, staticRoot).request('/api/dashboard');
    expect(response.status).toBe(200);
    expect(((await response.json()) as { blockers: unknown[] }).blockers).toEqual([]);
  });
});
