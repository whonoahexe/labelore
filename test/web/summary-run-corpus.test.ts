// quick-261006-iz7 (QIZ7-08): real-corpus guards over every SUMMARY.md in this repo's `.planning/` and in
// the made-up Lendshed project (test/fixtures/lendshed), built through the real repository load so quick,
// archived and archived-quick summaries reach the handler with the refs discovery gives them. Every
// summary must carry `structured.summary` and compose to a non-null page, and the sketch docs plus the
// harder ones match the values pinned below. The pinned values were confirmed with grep / awk over the
// source files and with the sketch's own data.js — never copied from the composer's own output.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { composeSummaryRun, requirementPreviews } from '../../src/web/views/summary-run.ts';
import type { ComposedSummaryRun } from '../../src/web/views/summary-run.ts';
import { FX_ROOT, fxPath } from '../helpers/fixture-project.ts';

const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const LB_PLANNING = join(LB_ROOT, '.planning');

/** A folder holding research, not a summary run: `research`, or an archived `v1.0-research` style folder. */
function isResearchFolder(name: string): boolean {
  return name === 'research' || name.endsWith('-research');
}

function walk(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules' || entry === 'worktrees' || isResearchFolder(entry) || entry === '.cache') continue;
        stack.push(abs);
      } else if (entry.endsWith('SUMMARY.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

let lb: ProjectPresentation;
let fx: ProjectPresentation;

beforeAll(async () => {
  const load = async (root: string): Promise<ProjectPresentation> => {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    return toProjectPresentation(await repository.load());
  };
  lb = await load(LB_ROOT);
  fx = await load(FX_ROOT);
}, 60000);

function artifactAt(presentation: ProjectPresentation, suffix: string): ProjectPresentation['artifacts'][number] {
  const found = presentation.artifacts.find((a) => a.path.endsWith(suffix));
  if (!found) throw new Error(`no artifact ending ${suffix}`);
  return found;
}

function compose(a: ProjectPresentation['artifacts'][number]): ComposedSummaryRun {
  const model = composeSummaryRun({
    kind: 'summary',
    frontmatter: a.frontmatter,
    structured: a.structured,
    groups: [],
    planSegments: [],
  });
  if (model === null) throw new Error(`composed null: ${a.path}`);
  return model;
}

const isSummary = (path: string): boolean =>
  path.endsWith('SUMMARY.md') && !path.split('/').slice(0, -1).some(isResearchFolder) && !path.includes('/sketches/');

describe('SUMMARY corpus — every file extracts and composes', () => {
  it('finds the same files on disk and in the presentation (labelore)', () => {
    const onDisk = walk(LB_PLANNING).map((p) => relative(LB_ROOT, p)).sort();
    const loaded = lb.artifacts.filter((a) => isSummary(a.path)).map((a) => a.path).sort();
    expect(loaded).toEqual(onDisk);
    expect(loaded.length).toBeGreaterThanOrEqual(110);
  });

  it('labelore: structured.summary on every file and a non-null page', () => {
    for (const a of lb.artifacts.filter((x) => isSummary(x.path))) {
      expect(a.structured.summary, a.path).toBeDefined();
      expect(() => compose(a), a.path).not.toThrow();
    }
  });

  it('finds the same files on disk and in the presentation (Lendshed)', () => {
    const onDisk = walk(join(FX_ROOT, '.planning')).map((p) => relative(FX_ROOT, p)).sort();
    const loaded = fx.artifacts.filter((a) => isSummary(a.path)).map((a) => a.path).sort();
    expect(loaded).toEqual(onDisk);
    expect(loaded.length).toBeGreaterThanOrEqual(6);
  });

  it('Lendshed: structured.summary on every file and a non-null page', () => {
    const files = fx.artifacts.filter((x) => isSummary(x.path));
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const a of files) {
      expect(a.structured.summary, a.path).toBeDefined();
      expect(() => compose(a), a.path).not.toThrow();
    }
  });

  it('leaves research/SUMMARY.md unclaimed', () => {
    const research = lb.artifacts.filter((a) => a.path.includes('/research/') && a.path.endsWith('SUMMARY.md'));
    for (const a of research) expect(a.structured.summary, a.path).toBeUndefined();
  });

  it('resolves at least the planning-time share of requirement IDs through the archives', () => {
    let found = 0;
    for (const a of lb.artifacts.filter((x) => isSummary(x.path))) {
      const model = compose(a);
      const previews = requirementPreviews(lb, a.path, model.modals.requirements, model.quick);
      found += Object.values(previews).filter((p) => p.found).length;
    }
    expect(found).toBeGreaterThanOrEqual(154);
  });

  // Counted by hand from the frontmatter of exactly these six files, so a summary another plan adds
  // cannot move it (README R6). Found against the Lendshed REQUIREMENTS files:
  //   01-01  SIGN-01, SIGN-05, SIGN-06                  3 of 3
  //   04-06  EXPT-02, EXPT-04, EXPT-06 found, EXPT-09 absent   3 of 4
  //   04-07  EXPT-05                                    1 of 1
  //   01-06 (malformed YAML), 02-12 (no frontmatter) and the quick t8m cite none.
  it('Lendshed: 7 of 8 requirement IDs resolve to a REQUIREMENTS item', () => {
    const paths = [
      'phases/01-member-sign-in-sessions/01-01-SUMMARY.md',
      'phases/01-member-sign-in-sessions/01-06-SUMMARY.md',
      'phases/04-bulk-loan-export/04-06-SUMMARY.md',
      'phases/04-bulk-loan-export/04-07-SUMMARY.md',
      'milestones/v1.0-phases/02-shed-inventory-health/02-12-SUMMARY.md',
      'quick/260402-t8m-restyle-the-top-bar-to-match-the-brand/260402-t8m-SUMMARY.md',
    ];
    let found = 0;
    let total = 0;
    for (const path of paths) {
      fxPath(path);
      const a = artifactAt(fx, path);
      const model = compose(a);
      const previews = requirementPreviews(fx, a.path, model.modals.requirements, model.quick);
      total += Object.keys(previews).length;
      found += Object.values(previews).filter((p) => p.found).length;
    }
    expect([found, total]).toEqual([7, 8]);
  });
});

describe('sketch docs — labelore', () => {
  it('05-01: the canonical summary', () => {
    const a = artifactAt(lb, 'v1.1-phases/05-per-type-document-views/05-01-SUMMARY.md');
    const m = compose(a);
    expect(m.head.eyebrow).toBe('Summary of 05-01 · Phase 5 · Per type document views');
    expect(m.head.title).toBe('Discussion-log view, section-projection extractor, view registry');
    expect([m.head.completed, m.head.duration, m.head.started, m.head.type]).toEqual(['20 Sep 2026', '26min', '20:34', 'UI']);
    expect(m.head.status).toEqual({ label: 'Complete', tone: 'complete' });
    expect(m.head.selfCheck?.label).toBe('Self-check passed');
    expect(m.triggers).toEqual({ tasks: { label: 'Tasks', count: 2 }, files: { count: 15 }, requirements: { done: 3, pending: 0 } });
    expect([m.outcome?.shipped, m.outcome?.proven, m.outcome?.human, m.outcome?.fixed]).toEqual([5, 3, 1, 0]);
    expect(m.outcome?.rows.map((r) => r.pills.map((p) => `${p.id}:${p.state}${p.human ? ':human' : ''}`))).toEqual([['D1:pass'], [], ['D2:pass', 'D3:unknown:human'], [], []]);
    expect(m.run.stops.map((s) => s.kind)).toEqual(['start', 'task', 'task', 'end']);
    expect(m.run.went).not.toBeNull();
    expect(m.proof?.map((p) => [p.id, p.human])).toEqual([['D1', false], ['D2', false], ['D3', true]]);
    const previews = requirementPreviews(lb, a.path, m.modals.requirements, false);
    expect(previews['VIEW-01']).toMatchObject({
      found: true,
      text: 'Each artifact type renders through a view selected for that type, rather than one undifferentiated reader',
      status: 'Complete',
      location: '.planning/milestones/v1.1-REQUIREMENTS.md',
      phase: 'Phase 5',
    });
    expect(previews['VIEW-01'].url).not.toBeNull();
  });

  it('0x4: 16 commits, five deviations on the commits stop, no outcome', () => {
    const a = artifactAt(lb, 'v1.0-quick/260910-0x4-close-every-tech-debt-item-in-planning-v/260910-0x4-SUMMARY.md');
    const m = compose(a);
    expect(m.head.eyebrow).toBe('Quick summary · 260910-0x4');
    expect(m.head.title).toBe('Close Every Tech-Debt Item');
    expect([m.head.completed, m.head.duration, m.head.started, m.head.type]).toEqual(['10 Sep 2026', '50min', null, 'Tech debt remediation']);
    expect(m.triggers).toEqual({ tasks: { label: 'Commits', count: 16 }, files: { count: 28 }, requirements: { done: 14, pending: 0 } });
    expect(m.outcome).toBeNull();
    expect(m.run.aside).toBe('16 commits · 5 fixed on the way');
    expect(m.run.stops.map((s) => [s.kind, s.deviations.length])).toEqual([['start', 0], ['commits', 5], ['end', 0]]);
    expect(m.run.extras.map((e) => e.title)).toEqual(['Out-of-Scope (Not Fixed — Logged)']);
    expect(m.proof).toHaveLength(7);
    expect(m.proof?.filter((p) => p.human)).toHaveLength(1);
    expect(m.decisions.items).toHaveLength(8);
    expect(m.sourceOnly.map((s) => s.label)).toEqual(expect.arrayContaining(['Fourteen-Item Outcome Table', 'Note on STATE.md']));
    expect(m.lineage?.affects).toHaveLength(3);
    const previews = requirementPreviews(lb, a.path, m.modals.requirements, m.quick);
    expect(Object.values(previews).every((p) => !p.found)).toBe(true);
  });

  it('3us: the quick format with a Tasks table', () => {
    const a = artifactAt(lb, 'quick/260922-3us-build-sketch-004-b3-folded-chapters-docu/260922-3us-SUMMARY.md');
    const m = compose(a);
    expect(m.head.eyebrow).toBe('Quick summary · 260922-3us');
    expect(m.head.completed).toBe('22 Sep 2026');
    expect(m.triggers).toEqual({ tasks: { label: 'Tasks', count: 3 }, files: { count: 18 }, requirements: { done: 4, pending: 0 } });
    expect(m.outcome).toBeNull();
    expect(m.run.stops[m.run.stops.length - 1].deviations).toHaveLength(2);
    const previews = requirementPreviews(lb, a.path, m.modals.requirements, m.quick);
    expect(previews['B3-01']).toMatchObject({ found: false, status: 'Complete in this summary', location: '—', phase: '—', url: null });
    expect(m.waits.map((s) => s.title)).toEqual(['Human check (pending)']);
    expect(m.sourceOnly.map((s) => s.label)).toEqual(expect.arrayContaining(['Verification']));
  });
});

describe('sketch docs — Lendshed', () => {
  it('01-01: deps added, five rule-tagged deviations', () => {
    const a = artifactAt(fx, 'phases/01-member-sign-in-sessions/01-01-SUMMARY.md');
    const m = compose(a);
    expect(m.head.eyebrow).toBe('Summary of 01-01 · Phase 1 · Member sign in sessions');
    expect(m.head.title).toBe('Member Password Sessions');
    expect([m.head.completed, m.head.duration, m.head.started, m.head.type]).toEqual(['25 Mar 2026', '41min', '09:12', 'Auth']);
    expect(m.triggers).toEqual({ tasks: { label: 'Tasks', count: 3 }, files: { count: 13 }, requirements: { done: 3, pending: 0 } });
    expect(m.run.stops.filter((s) => s.kind === 'task').map((s) => s.deviations.length)).toEqual([4, 0, 1]);
    expect(m.run.aside).toBe('3 tasks · 5 fixed on the way');
    expect(m.proof?.map((p) => [p.id, p.human])).toEqual([['D1', false], ['D2', false], ['D3', false], ['D4', true], ['D5', false]]);
    expect(m.outcome?.rows.map((r) => r.pills.map((p) => p.id))).toEqual([['D1'], ['D2'], ['D3'], ['D4'], ['D5']]);
    expect(m.patterns?.added).toHaveLength(5);
    expect(m.patterns?.items.filter((p) => p.kind === 'convention')).toHaveLength(2);
    expect(m.lineage?.requires).toEqual([]);
    expect(m.lineage?.affects).toHaveLength(5);
    expect(m.next).not.toBeNull();
    const previews = requirementPreviews(fx, a.path, m.modals.requirements, false);
    expect(previews['SIGN-01']).toMatchObject({
      found: true,
      text: 'A member can sign in with a username and password, without the kiosk passcode',
      status: 'Complete',
      location: '.planning/REQUIREMENTS.md',
      phase: 'Phase 1',
    });
  });
});

describe('sketch docs — Lendshed 04-06', () => {
  it('04-06: awaiting a checkpoint', () => {
    const a = artifactAt(fx, 'phases/04-bulk-loan-export/04-06-SUMMARY.md');
    const m = compose(a);
    expect(m.head.eyebrow).toBe('Summary of 04-06 · Phase 4 · Bulk loan export');
    expect(m.head.title).toBe('Export Row Presentation, Auto-Collection & Skipped-Loan Disclosure');
    expect(m.head.status).toEqual({ label: 'Awaiting checkpoint', tone: 'in-flight' });
    expect([m.head.completed, m.head.duration, m.head.started, m.head.type]).toEqual([null, null, null, 'Frontend']);
    expect(m.triggers).toEqual({ tasks: { label: 'Tasks', count: 2 }, files: { count: 11 }, requirements: { done: 0, pending: 4 } });
    expect(m.outcome).toBeNull();
    expect(m.proof).toBeNull();
    expect(m.run.stops.map((s) => s.kind)).toEqual(['start', 'task', 'task', 'wait', 'end']);
    expect(m.decisions.items).toHaveLength(6);
    expect(m.patterns?.items).toHaveLength(3);
    expect(m.waits.map((s) => s.title)).toEqual(['Task 3 — Pending Human Verification']);
    const previews = requirementPreviews(fx, a.path, m.modals.requirements, false);
    expect(previews['EXPT-02']).toMatchObject({ found: true, status: 'Pending', phase: 'Phase 4' });
    expect(previews['EXPT-09']).toMatchObject({ found: false });
  });
});

describe('harder summaries', () => {
  it('lb 02-13: the longest Proof table (14 deliverables)', () => {
    const m = compose(artifactAt(lb, 'v1.0-phases/02-situational-awareness-artifact-reading/02-13-SUMMARY.md'));
    expect(m.proof).toHaveLength(14);
  });

  it('lb 528: a quick with a commit count and quick-task requirement IDs', () => {
    const a = artifactAt(lb, 'quick/261003-528-build-sketch-018-b-as-the-ui-review-page-view-use-gsd-browse/261003-528-SUMMARY.md');
    const m = compose(a);
    expect(m.quick).toBe(true);
    expect(m.triggers.tasks).toEqual({ label: 'Commits', count: 3 });
    expect(m.modals.requirements.every((r) => r.id.startsWith('QK528-'))).toBe(true);
    expect(m.head.title).toBe('UI-REVIEW scorecard (sketch 018 B)');
  });

  it('Lendshed 04-07: seven Rule deviations', () => {
    const m = compose(artifactAt(fx, 'phases/04-bulk-loan-export/04-07-SUMMARY.md'));
    expect(m.run.cards).toHaveLength(7);
  });

  it('Lendshed 04-07: awaiting a checkpoint with a pending requirement', () => {
    const m = compose(artifactAt(fx, 'phases/04-bulk-loan-export/04-07-SUMMARY.md'));
    expect(m.head.status.tone).toBe('in-flight');
    expect(m.modals.requirements).toEqual([{ id: 'EXPT-05', state: 'pending' }]);
    expect(m.triggers.requirements).toEqual({ done: 0, pending: 1 });
  });

  it('Lendshed 01-06 (malformed YAML): composes from the body with a real title and the Warning in the artifact', () => {
    const a = artifactAt(fx, 'phases/01-member-sign-in-sessions/01-06-SUMMARY.md');
    expect(a.warnings.length).toBeGreaterThan(0);
    const m = compose(a);
    expect(m.head.title).toBe('Set-password screen, top bar identity, passcode prompt removal');
    expect(m.head.status).toEqual({ label: '—', tone: 'quiet' });
    expect(m.triggers.tasks.count).toBe(3);
  });

  it('Lendshed v1.0 02-12 (no frontmatter): status and tasks come from the preamble', () => {
    const m = compose(artifactAt(fx, 'v1.0-phases/02-shed-inventory-health/02-12-SUMMARY.md'));
    expect(m.head.status).toEqual({ label: 'Complete', tone: 'complete' });
    expect(m.modals.tasks.rows.map((t) => t.hashes[0])).toEqual(['e5a40b8', '91cd7f3']);
    expect(m.head.eyebrow).toBe('Summary · Phase 2 · Shed inventory health');
  });
});
