// quick-261017-wlg: the dashboard head (sketch 025 R3b) through the real reader. Expected values
// come from the sketch's own data.js and gen-data.mjs rules, not from the code under test.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import {
  activityClause,
  activityDateLabel,
  buildDashboardHead,
  projectSectionLead,
  splitProjectTitle,
  sectionLead,
} from '../../src/presentation/dashboard-head.ts';
import { fromDirectory } from '../helpers/from-directory.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixture = (name: string) => readFileSync(join(REPO_ROOT, 'test/fixtures/dashboard', name), 'utf8');

async function headOfDirectory(root: string) {
  const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
  return buildDashboardHead(toProjectPresentation({ ...snapshot, readAt: '2026-10-17T12:00:00.000Z' }));
}

async function headOf(files: Record<string, string>) {
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
  return buildDashboardHead(toProjectPresentation({ ...snapshot, readAt: '2026-10-17T12:00:00.000Z' }));
}

describe('dashboard head', () => {
  it('opens the dense fixture on its project name and lead', async () => {
    const head = await headOfDirectory(join(REPO_ROOT, 'fixtures/dense'));
    expect(head.name).toBe('Dense Fixture Project');
    expect(head.tagline).toBeNull();
    expect(head.lead).toBe(
      "A synthetic, hand-authored GSD project three milestones deep, carrying every artifact type `gsd-core`'s templates define plus several it does not.",
    );
  });

  it('splits a tagline off the title', async () => {
    const head = await headOf({
      '.planning/PROJECT.md': fixture('synthetic-PROJECT.md'),
      '.planning/STATE.md': fixture('synthetic-STATE.md'),
    });
    expect(head.name).toBe('Harbor Ledger');
    expect(head.tagline).toBe('Customs Filing Automation');
    expect(head.lead).toBe(
      "A batch service and review console that turns a broker's shipment manifests into customs filings for the `ace-gateway` submission API.",
    );
  });

  it('cuts any PROJECT.md section to a lead, such as Core Value for the Traceability lede', async () => {
    const snapshot = await new PlanningRepository(
      new InMemoryPlanningFilesystem({ '.planning/PROJECT.md': fixture('synthetic-PROJECT.md') }),
      '/project',
    ).load();
    const presentation = toProjectPresentation(snapshot);
    expect(projectSectionLead(presentation, /^core value\b/i)).toBe(
      'Every manifest line becomes a cited filing row or a visible exception, with nothing silently dropped.',
    );
    expect(projectSectionLead(presentation, /^no such section\b/i)).toBeNull();
  });

  it('shows just the name for a project with a bare PROJECT.md', async () => {
    const head = await headOf({ '.planning/PROJECT.md': fixture('sparse-PROJECT.md') });
    expect(head).toEqual({ name: 'Untitled Spike', tagline: null, lead: null, position: null, projectUrl: '/project' });
  });

  it('never throws on malformed STATE frontmatter', async () => {
    const head = await headOf({ '.planning/STATE.md': '---\nmilestone: [unclosed\n---\n' });
    expect(head.name).toBe('project');
  });
});

describe('dashboard head extractors', () => {
  it('splits the title at the first spaced dash, and falls back to the folder name', () => {
    expect(splitProjectTitle('Harbor Ledger — Customs Filing Automation', '/x')).toEqual({
      name: 'Harbor Ledger',
      tagline: 'Customs Filing Automation',
    });
    expect(splitProjectTitle('.planning/PROJECT.md', '/work/labelore')).toEqual({ name: 'labelore', tagline: null });
  });

  it('cuts What This Is to a lead', () => {
    expect(sectionLead('**Bold lead here.** Then more text follows here.')).toBe('Bold lead here.');
    expect(sectionLead('Short one. Second sentence here that adds detail to make it longer than seventy chars.')).toBe(
      'Short one. Second sentence here that adds detail to make it longer than seventy chars.',
    );
    expect(sectionLead('*Reviewed at v1.0 close.*\n\nThe real lead sentence, long enough to stand alone as a lead here.')).toBe(
      'The real lead sentence, long enough to stand alone as a lead here.',
    );
    expect(sectionLead('### Sub\n\nNever used.')).toBeNull();
  });

  it('shortens the last activity to one clause', () => {
    expect(activityClause('Completed quick task 261016-2j6 (compact discussion-log tables)')).toBe(
      'Quick task: compact discussion-log tables',
    );
    expect(activityClause('Phase 3 context gathered — five decisions locked, two left open')).toBe('Phase 3 context gathered');
    expect(activityClause('Phase 04 execution resumed (wave continue)')).toBe('Phase 04 execution resumed (wave continue)');
    expect(activityClause('Shipped the reconciliation worker; two follow-ups remain')).toBe('Shipped the reconciliation worker');
    expect(
      activityClause('An extremely long activity description that keeps going well past the seventy-two character limit for sure'),
    ).toBe('An extremely long activity description that keeps going well past the…');
  });

  it('shows the year only when it differs from the snapshot', () => {
    expect(activityDateLabel('2026-08-22', '2026-10-17T00:00:00.000Z')).toBe('22 Aug');
    expect(activityDateLabel('2026-08-22', '2027-01-02T00:00:00.000Z')).toBe('22 Aug 2026');
    expect(activityDateLabel('not a date', '2026-10-17T00:00:00.000Z')).toBeNull();
  });
});

describe('dashboard head project link', () => {
  it('points at the root PROJECT.md address for Lendshed', async () => {
    const { presentation } = await loadFixtureProject();
    expect(buildDashboardHead(presentation).projectUrl).toBe('/project');
  });

  it('is null for a payload with no root PROJECT.md', async () => {
    const head = await headOf({ '.planning/STATE.md': '---\nstatus: executing\n---\n# State\n' });
    expect(head.projectUrl).toBeNull();
  });

  it('never takes a PROJECT.md below the root', async () => {
    const head = await headOf({
      '.planning/research/PROJECT.md': '# Research project notes\n',
      '.planning/phases/01-x/PROJECT.md': '# A phase file\n',
    });
    expect(head.projectUrl).toBeNull();
  });
});
