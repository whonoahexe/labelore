// Phase 11 (11-20, VIEW-18, D-03, RESEARCH C10): the report and forensics handlers. A session report lifts its
// bold-label head lines as written text, a milestone summary its numbered sections, stats and tables, a forensics
// report its hypothesis, numbered actions, ordered anomalies and artifact grid. Over the Lendshed fixture through
// the real repository, plus planted bodies for the edges.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { ForensicsHandler, ReportHandler } from '../src/planning-repo/handlers/reports.ts';
import { extractForensics, extractReport } from '../src/planning-repo/handlers/reports-lift.ts';
import type {
  ForensicsLift,
  MilestoneReportLift,
  ReportLift,
  SessionReportLift,
} from '../src/planning-repo/handlers/reports-lift.ts';
import { loadFixtureProject } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const REPORTS = '.planning/reports/';
const FORENSICS = '.planning/forensics/';

function refOf(path: string, kind: string): ArtifactRef {
  return { path, kind, location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as ArtifactRef;
}

function rawOf(path: string, text: string): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

async function reportAt(path: string): Promise<ReportLift> {
  const { presentation } = await loadFixtureProject();
  return (presentation.artifacts.find((a) => a.path === path)!.structured as { report: ReportLift }).report;
}

async function forensicsAt(path: string): Promise<ForensicsLift> {
  const { presentation } = await loadFixtureProject();
  return (presentation.artifacts.find((a) => a.path === path)!.structured as { forensics: ForensicsLift }).forensics;
}

describe('ReportHandler and ForensicsHandler registration', () => {
  it('claim only their own kind, sit before the generic handler and keep it last', () => {
    expect(ReportHandler.match(refOf(`${REPORTS}SESSION_REPORT.md`, 'report'))).toBe(true);
    expect(ReportHandler.match(refOf(`${FORENSICS}report-1.md`, 'forensics'))).toBe(false);
    expect(ForensicsHandler.match(refOf(`${FORENSICS}report-1.md`, 'forensics'))).toBe(true);
    expect(HANDLERS.find((h) => h.match(refOf(`${REPORTS}SESSION_REPORT.md`, 'report')))).toBe(ReportHandler);
    expect(HANDLERS.find((h) => h.match(refOf(`${FORENSICS}report-1.md`, 'forensics')))).toBe(ForensicsHandler);
    expect(HANDLERS.indexOf(ReportHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS.indexOf(ForensicsHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });
});

describe('Lendshed session reports', () => {
  it('lifts SESSION_REPORT.md: the head lines as written text, three blockers', async () => {
    const report = (await reportAt(`${REPORTS}SESSION_REPORT.md`)) as SessionReportLift;
    expect(report.variant).toBe('session');
    expect(report.title).toBe('GSD Session Report');
    expect(report.generated).toBe('2026-03-28 09:05 +0100');
    expect(report.project).toBe('Lendshed');
    expect(report.milestone).toBe('v1.1 — Steward Desk');
    expect(report.duration).toBe('~5 hours (first commit 2026-03-27 13:42, last commit 2026-03-27 18:51)');
    expect(report.plansExecuted).toBe('3 (01-04, 01-05, 01-06)');
    expect(report.commitsMade).toBe('17');
    expect(report.phaseProgress).toContain('Phase 1 of 4 is complete');
    expect(report.phases).toHaveLength(2);
    expect(report.outcomes).toHaveLength(7);
    expect(report.decisions).toHaveLength(2);
    expect(report.decisionsNote).toBeNull();
    expect(report.blockers).toHaveLength(3);
    expect(report.blockers[0]).toMatch(/^\[Phase 1\] The Elm Street mini PC/);
    expect(report.filesChanged.summary).toBe('43 files changed, 1,206 insertions(+), 388 deletions(-).');
    expect(report.filesChanged.items).toHaveLength(4);
    expect(report.resources).toEqual([
      { metric: 'Commits', estimate: '17' },
      { metric: 'Files changed', estimate: '43' },
      { metric: 'Plans executed', estimate: '3' },
      { metric: 'Subagents spawned', estimate: '~9' },
    ]);
  });

  it('lifts 20260409-session-report.md: a single session, prose decisions, no blockers', async () => {
    const report = (await reportAt(`${REPORTS}20260409-session-report.md`)) as SessionReportLift;
    expect(report.variant).toBe('session');
    expect(report.duration).toBe('Single session');
    expect(report.commitsMade).toBe('9');
    expect(report.decisions).toEqual([]);
    expect(report.decisionsNote).toBe('No decisions were added to STATE.md this session.');
    expect(report.blockers).toEqual([]);
  });
});

describe('Lendshed milestone summary', () => {
  it('lifts the version, the seven numbered sections in order and the stats strip', async () => {
    const report = (await reportAt(`${REPORTS}MILESTONE_SUMMARY-v1.0.md`)) as MilestoneReportLift;
    expect(report.variant).toBe('milestone');
    expect(report.version).toBe('1.0');
    expect(report.generated).toBe('2026-03-21');
    expect(report.purpose).toBe('Team onboarding and milestone review');
    expect(report.sections.map((s) => [s.number, s.heading])).toEqual([
      [1, 'Project Overview'],
      [2, 'Architecture & Technical Decisions'],
      [3, 'Phases Delivered'],
      [4, 'Requirements Coverage'],
      [5, 'Key Decisions Log'],
      [6, 'Tech Debt & Deferred Items'],
      [7, 'Getting Started'],
    ]);
    expect(report.stats.map((s) => s.label)).toEqual(['Timeline', 'Phases', 'Commits', 'Files changed', 'Contributors']);
    expect(report.stats[0].value).toBe('2026-01-12 → 2026-03-20 (68 days)');
  });

  it('lifts a phases row per v1.0 phase, the status cell as written', async () => {
    const report = (await reportAt(`${REPORTS}MILESTONE_SUMMARY-v1.0.md`)) as MilestoneReportLift;
    expect(report.phases).toHaveLength(4);
    expect(report.phases[0]).toEqual({
      phase: '1',
      name: 'Member Data Foundation',
      status: 'Complete (2026-01-30)',
      oneLiner: 'Member records in a durable SQLite store that survives a pulled plug',
    });
    expect(report.phases.map((p) => p.phase)).toEqual(['1', '2', '3', '4']);
  });

  it('lifts the requirements bullets and the audit verdict, and keeps decision ids that repeat across phases', async () => {
    const report = (await reportAt(`${REPORTS}MILESTONE_SUMMARY-v1.0.md`)) as MilestoneReportLift;
    expect(report.requirements.rows).toHaveLength(4);
    expect(report.requirements.rows[0]).toEqual({ covered: true, category: 'Member records', ids: 'MEMB-01 ... MEMB-05', phase: 'Phase 1' });
    expect(report.requirements.auditVerdict).toContain('tech debt');
    expect(report.decisions).toHaveLength(18);
    const d01 = report.decisions.filter((d) => d.id === 'D-01');
    expect(d01.map((d) => d.phase)).toEqual(['1', '2', '3', '4']);
  });
});

describe('Lendshed forensics reports', () => {
  it('lifts report-20260402-101500: hypothesis and actions verbatim, anomalies HIGH, MEDIUM, LOW', async () => {
    const forensics = await forensicsAt(`${FORENSICS}report-20260402-101500.md`);
    expect(forensics.generated).toBe('2026-04-02T09:15:21Z');
    expect(forensics.problem).toContain('Phase 2 was marked finished');
    // The file wrote MEDIUM, HIGH, LOW; the lift orders HIGH first.
    expect(forensics.anomalies.map((a) => a.confidence)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
    expect(forensics.anomalies[0].type).toBe('Shed list route skips the permission check');
    expect(forensics.anomalies[0].evidence).toContain('never calls the `lend` check');
    expect(forensics.anomalies[0].interpretation).toContain('Plan 02-03 was executed');
    expect(forensics.anomalies[1].type).toBe('Phase marked complete without verification');
    expect(forensics.anomaliesNote).toBeNull();
    expect(forensics.hypothesis).toBe(
      'Plan 02-03 stopped before its route change was committed, and the next session closed the phase from the roadmap instead of from a verification run, so the missing check was never seen.',
    );
    expect(forensics.actions).toEqual([
      'Finish plan 02-03: review the two uncommitted files, add the `lend` check to the shed list route, and commit.',
      'Run `/gsd-verify-work 2` so the phase has a verification record before Phase 3 builds on it.',
      'If the route still lets a member through, run `/gsd-debug` with the shed list route as the starting point.',
    ]);
  });

  it('lifts the artifact grid as phase by artifact cells, a cross as present false', async () => {
    const forensics = await forensicsAt(`${FORENSICS}report-20260402-101500.md`);
    expect(forensics.grid).toHaveLength(4 * 5);
    const cell = (phase: string, artifact: string) => forensics.grid.find((c) => c.phase.startsWith(phase) && c.artifact === artifact)!;
    expect(cell('01', 'PLAN')).toMatchObject({ present: true, cell: '✅ (6)' });
    expect(cell('01', 'VERIFICATION')).toMatchObject({ present: true, cell: '✅ passed 4/4' });
    expect(cell('02', 'RESEARCH')).toMatchObject({ present: false, cell: '❌' });
    expect(cell('04', 'PLAN').present).toBe(false);
    expect(forensics.evidence.map((e) => e.heading)).toEqual(['Git Activity', 'Planning State', 'Artifact Completeness']);
    expect(forensics.evidence[0].items).toHaveLength(5);
  });

  it('edge probe VIEW-18: report-20260406-090000, with no anomalies, has an empty list and keeps the writer sentence', async () => {
    const forensics = await forensicsAt(`${FORENSICS}report-20260406-090000.md`);
    expect(forensics.anomalies).toEqual([]);
    expect(forensics.anomaliesNote).toBe('No anomalies detected.');
    expect(forensics.actions).toEqual(['No action needed. Continue with `/gsd-execute-phase 3`.']);
    expect(forensics.grid).toHaveLength(3 * 5);
  });
});

describe('forensics edges', () => {
  it('reads a confidence word outside HIGH, MEDIUM and LOW verbatim, ordered after LOW, and the others by case', () => {
    const body = [
      '# Forensic Report',
      '',
      '## Anomalies Detected',
      '',
      '### First thing — Confidence: Unclear',
      '**Evidence:** e1',
      '',
      '### Second thing — Confidence: low',
      '**Evidence:** e2',
      '',
      '### Third thing — Confidence: HIGH',
      '**Interpretation:** i3',
      '',
      '### No confidence slot',
      '**Evidence:** e4',
      '',
    ].join('\n');
    const forensics = extractForensics(body)!;
    expect(forensics.anomalies.map((a) => [a.type, a.confidence])).toEqual([
      ['Third thing', 'HIGH'],
      ['Second thing', 'LOW'],
      ['First thing', 'Unclear'],
      ['No confidence slot', null],
    ]);
    expect(forensics.anomalies[0].evidence).toBeNull();
    expect(forensics.anomalies[0].interpretation).toBe('i3');
  });

  it('reads a cell that is neither a check nor a cross as unknown, verbatim', () => {
    const body = ['## Evidence Summary', '', '### Artifact Completeness', '| Phase | PLAN | SUMMARY |', '|---|---|---|', '| 01 One | ✅ | n/a |', '| 02 Two | ❌ (0) |  |', ''].join('\n');
    const forensics = extractForensics(body)!;
    expect(forensics.grid.map((c) => [c.phase, c.artifact, c.present, c.cell])).toEqual([
      ['01 One', 'PLAN', true, '✅'],
      ['01 One', 'SUMMARY', null, 'n/a'],
      ['02 Two', 'PLAN', false, '❌ (0)'],
      ['02 Two', 'SUMMARY', null, ''],
    ]);
  });

  it('gives null for a body with none of the known headings', () => {
    expect(extractForensics('# Notes\n\nNothing here.\n')).toBeNull();
  });
});

describe('report edges', () => {
  it('gives null for a report file with none of the known headings, and decides the variant by file name only', () => {
    expect(extractReport('SESSION_REPORT.md', {}, '# Something else\n\nProse.\n')).toBeNull();
    expect(extractReport('MILESTONE_SUMMARY-v2.0.md', {}, '# Something else\n\nProse.\n')).toBeNull();
    // A numbered-section body under a session file name is still a session body: no session headings, no lift.
    expect(extractReport('SESSION_REPORT.md', {}, '# Milestone v1.0 — Project Summary\n\n## 1. Project Overview\n\ntext\n')).toBeNull();
    // A session body under the milestone file name is not a milestone summary either.
    expect(extractReport('MILESTONE_SUMMARY-v1.0.md', {}, '# GSD Session Report\n\n## Session Summary\n\n**Duration:** x\n')).toBeNull();
  });

  it('takes the version from the file name when the title lacks it', () => {
    const lifted = extractReport('MILESTONE_SUMMARY-v3.2.md', {}, '# Project Summary\n\n## 1. Project Overview\n\ntext\n') as MilestoneReportLift;
    expect(lifted.version).toBe('3.2');
  });

  it('keeps a missing numbered section out of the list, never inventing it', () => {
    const body = ['# Milestone v1.0 — Project Summary', '', '## 1. Project Overview', '', 'a', '', '## 3. Phases Delivered', '', 'b', '', '## Stats', '', '- **Commits:** 4', ''].join('\n');
    const lifted = extractReport('MILESTONE_SUMMARY-v1.0.md', {}, body) as MilestoneReportLift;
    expect(lifted.sections.map((s) => s.number)).toEqual([1, 3]);
    expect(lifted.phases).toEqual([]);
    expect(lifted.stats).toEqual([{ label: 'Commits', value: '4' }]);
  });

  it('edge probe VIEW-18: a session report with none of the bold-label head lines has null headline fields, never 0', () => {
    const body = [
      '# GSD Session Report',
      '',
      '## Session Summary',
      '',
      'Some prose with no labelled lines.',
      '',
      '## Work Performed',
      '',
      '### Key Outcomes',
      '- Shipped the thing.',
      '',
      '### Decisions Made',
      '- Keep it small.',
      '',
      '## Blockers & Open Items',
      '',
      '- None blocking.',
      '',
    ].join('\n');
    const report = extractReport('SESSION_REPORT.md', {}, body) as SessionReportLift;
    expect(report.variant).toBe('session');
    expect(report.duration).toBeNull();
    expect(report.plansExecuted).toBeNull();
    expect(report.commitsMade).toBeNull();
    expect(report.phaseProgress).toBeNull();
    expect(report.generated).toBeNull();
    expect(report.outcomes).toEqual(['Shipped the thing.']);
    expect(report.decisions).toEqual(['Keep it small.']);
    // One with no blockers has an empty blockers list.
    expect(report.blockers).toEqual([]);
  });

  it('edge probe VIEW-18: 20260409-session-report.md has no blockers, an empty list not a "None blocking." row', async () => {
    const report = (await reportAt(`${REPORTS}20260409-session-report.md`)) as SessionReportLift;
    expect(report.blockers).toEqual([]);
    expect(report.outcomes).toHaveLength(5);
  });

  it('keeps a real blocker that merely starts with the word None', () => {
    const body = '## Blockers & Open Items\n\n- None of the kiosk screens were checked on the real device.\n';
    const report = extractReport('SESSION_REPORT.md', {}, body) as SessionReportLift;
    expect(report.blockers).toEqual(['None of the kiosk screens were checked on the real device.']);
  });

  it('edge probe VIEW-18: report-20260406-090000, a forensics file with no anomalies, still builds a lift (hypothesis kept)', async () => {
    const forensics = await forensicsAt(`${FORENSICS}report-20260406-090000.md`);
    expect(forensics.hypothesis).toContain('No issue was found.');
  });
});

describe('guards', () => {
  it('keeps title, body and frontmatter and omits structured when the lift throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/reports-lift.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/reports-lift.ts')>()),
      extractReport: () => {
        throw new Error('boom');
      },
      extractForensics: () => {
        throw new Error('boom');
      },
    }));
    const { ReportHandler: GuardedReport, ForensicsHandler: GuardedForensics } = await import('../src/planning-repo/handlers/reports.ts');
    const report = GuardedReport.parse(rawOf(`${REPORTS}SESSION_REPORT.md`, '---\nmade_up_example: true\n---\n# GSD Session Report\n\n## Session Summary\n\n**Duration:** x\n'), refOf(`${REPORTS}SESSION_REPORT.md`, 'report'));
    expect(report.title).toBe('GSD Session Report');
    expect(report.body).toContain('**Duration:** x');
    expect(report.frontmatter.made_up_example).toBe(true);
    expect(report.structured).toEqual({});
    const forensics = GuardedForensics.parse(rawOf(`${FORENSICS}report-1.md`, '# Forensic Report\n\n## Anomalies Detected\n'), refOf(`${FORENSICS}report-1.md`, 'forensics'));
    expect(forensics.title).toBe('Forensic Report');
    expect(forensics.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/reports-lift.ts');
  });

  it('leaves structured empty for a file with none of the known headings, keeping title and body', () => {
    const result = ReportHandler.parse(rawOf(`${REPORTS}notes.md`, '# Loose notes\n\nNo structure.\n'), refOf(`${REPORTS}notes.md`, 'report'));
    expect(result.title).toBe('Loose notes');
    expect(result.body).toContain('No structure.');
    expect(result.structured).toEqual({});
  });
});

describe('growth', () => {
  it('extractReport on a large phases table is linear', () => {
    const growth = measureGrowth({
      make: (n) => {
        const rows = Array.from({ length: n }, (_, i) => `| ${i} | Phase ${i} | Complete (2026-01-01) | One-liner ${i} |`).join('\n');
        return `# Milestone v1.0 — Project Summary\n\n## 3. Phases Delivered\n\n| Phase | Name | Status | One-Liner |\n|---|---|---|---|\n${rows}\n`;
      },
      run: (body) => {
        extractReport('MILESTONE_SUMMARY-v1.0.md', {}, body);
      },
      startSize: 20,
      maxSize: 40,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('extractForensics on many anomalies and a wide grid is linear', () => {
    const growth = measureGrowth({
      make: (n) => {
        const anomalies = Array.from({ length: n }, (_, i) => `### Anomaly ${i} — Confidence: LOW\n**Evidence:** e${i}\n\n**Interpretation:** i${i}\n`).join('\n');
        return `# Forensic Report\n\n## Anomalies Detected\n\n${anomalies}\n## Recommended Actions\n\n1. one\n`;
      },
      run: (body) => {
        extractForensics(body);
      },
      startSize: 20,
      maxSize: 40,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
