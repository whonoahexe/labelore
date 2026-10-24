import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import {
  buildDrawerViewModel,
  type DrawerFileRow,
  type DrawerPhasePlace,
  type DrawerViewModel,
} from '../../src/presentation/drawer.ts';
import {
  findPlace,
  placeKeyForPath,
  quickTaskKeyForPath,
  shippedOwnerOf,
} from '../../src/presentation/drawer-route.ts';
import { quickMonthOf } from '../../src/presentation/tree-labels.ts';
import { toProjectPresentation, type ProjectPresentation } from '../../src/server/project-presentation.ts';

const ROOT = '/project';

async function presentationOf(files: Record<string, string>): Promise<ProjectPresentation> {
  const repository = new PlanningRepository(new InMemoryPlanningFilesystem(files), ROOT);
  return toProjectPresentation(await repository.load());
}

async function diskPresentation(root: string): Promise<ProjectPresentation> {
  const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
  return toProjectPresentation(await repository.load());
}

const fixturePresentation = (name: string) => diskPresentation(resolve(`fixtures/${name}`));

function phaseFiles(phase: DrawerPhasePlace): DrawerFileRow[] {
  return [...phase.before, ...phase.after, ...phase.other];
}

function everyPhase(model: DrawerViewModel): DrawerPhasePlace[] {
  return [...model.current.phases, ...model.shipped.flatMap((milestone) => milestone.phases)];
}

function everyUrl(model: DrawerViewModel): string[] {
  const urls: string[] = [];
  for (const phase of everyPhase(model)) {
    urls.push(phase.url, ...phaseFiles(phase).map((row) => row.url));
    for (const plan of phase.plans) urls.push(plan.url, ...plan.matchUrls);
  }
  for (const milestone of model.shipped) {
    urls.push(milestone.url, ...milestone.documents.map((row) => row.url));
  }
  for (const place of [model.current.quick, ...model.shipped.map((milestone) => milestone.quick)]) {
    for (const month of place.months) {
      for (const task of month.tasks) urls.push(...task.files.map((row) => row.url));
    }
  }
  return urls;
}

const LIFECYCLE_FIXTURE = {
  '.planning/phases/01-first/01-CONTEXT.md': '# Context',
  '.planning/phases/01-first/01-RESEARCH.md': '# Research',
  '.planning/phases/01-first/01-01-PLAN.md': '# Plan one',
  '.planning/phases/01-first/01-01-SUMMARY.md': '# Summary one',
  '.planning/phases/01-first/01-02-PLAN.md': '# Plan two',
  '.planning/phases/01-first/01-REVIEW.md': '# Review',
  '.planning/phases/01-first/01-VERIFICATION.md': '# Verification',
  '.planning/phases/01-first/01-UI-REVIEW.md': '# UI review',
  '.planning/phases/01-first/deferred-items.md': '# Deferred',
};

describe('buildDrawerViewModel — fixtures/dense', () => {
  it('lists the live milestone, then shipped milestones newest first, with their recorded names', async () => {
    const presentation = await fixturePresentation('dense');
    const model = buildDrawerViewModel(presentation);
    expect(model.current.version).toBe('v3.0');
    expect(model.current.phases.map((phase) => phase.number)).toEqual(['01', '02']);
    expect(model.shipped.map((milestone) => milestone.version)).toEqual(['v2.0', 'v1.0']);
    const v2 = model.shipped[0];
    expect(v2.name).toBe('Legacy Bridge');
    expect(v2.shippedLabel).not.toBeNull();
    expect(v2.phases.map((phase) => phase.number)).toEqual(['01', '02']);
    expect(v2.documents.map((row) => row.label)).toEqual(['Roadmap', 'Requirements', 'Milestone audit']);
  });

  it('pads every phase number to two digits, including roadmap-only phases with a bare number', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/ROADMAP.md': [
          '# Roadmap',
          '',
          '### Phase 1: First',
          '',
          '### Phase 2.1: Inserted',
          '',
          '### Phase 3: Third',
          '',
        ].join('\n'),
        '.planning/phases/01-first/01-01-PLAN.md': '# Plan one',
      }),
    );
    expect(model.current.phases.map((phase) => phase.number)).toEqual(['01', '02.1', '03']);
  });

  it('opens on the state phase when it is current', async () => {
    const presentation = await fixturePresentation('dense');
    const model = buildDrawerViewModel(presentation);
    expect(model.defaultPlaceKey).toBe(model.current.phases[0].key);
  });

  it('puts no root, research or other file anywhere in the model', async () => {
    const presentation = await fixturePresentation('dense');
    const model = buildDrawerViewModel(presentation);
    const paths = new Set<string>();
    for (const phase of everyPhase(model)) {
      for (const row of phaseFiles(phase)) paths.add(row.path);
    }
    for (const milestone of model.shipped) for (const row of milestone.documents) paths.add(row.path);
    for (const artifact of presentation.artifacts) {
      if (['root', 'research', 'other'].includes(artifact.location)) {
        expect(paths.has(artifact.path), `${artifact.path} must not be in the drawer`).toBe(false);
      }
    }
  });

  it('places every phase and archived-phase markdown file exactly once', async () => {
    const presentation = await fixturePresentation('dense');
    const model = buildDrawerViewModel(presentation);
    const phaseKeys = new Set(everyPhase(model).map((phase) => phase.key));
    const placed: string[] = [];
    for (const phase of everyPhase(model)) {
      placed.push(...phaseFiles(phase).map((row) => row.path));
    }
    const planPaths = presentation.milestones
      .flatMap((milestone) => milestone.phases)
      .flatMap((phase) => phase.plans)
      .flatMap((plan) => [plan.path, ...(plan.summary ? [plan.summary.path] : [])]);
    placed.push(...planPaths);
    const expected = presentation.artifacts
      .filter(
        (artifact) =>
          (artifact.location === 'phase' || artifact.location === 'archived-phase') &&
          artifact.path.endsWith('.md') &&
          artifact.phaseKey !== null &&
          phaseKeys.has(artifact.phaseKey),
      )
      .map((artifact) => artifact.path);
    expect([...placed].sort()).toEqual([...expected].sort());
    expect(new Set(placed).size).toBe(placed.length);
  });

  it('keeps every url a path on this app', async () => {
    const model = buildDrawerViewModel(await fixturePresentation('dense'));
    const urls = everyUrl(model);
    expect(urls.length).toBeGreaterThan(20);
    for (const url of urls) expect(url.startsWith('/'), url).toBe(true);
  });
});

describe('buildDrawerViewModel — a phase through its lifecycle', () => {
  it('splits files into before, plans, after and other', async () => {
    const model = buildDrawerViewModel(await presentationOf(LIFECYCLE_FIXTURE));
    const phase = model.current.phases[0];
    expect(phase.before.map((row) => row.label)).toEqual(['Context', 'Research']);
    expect(phase.plans.map((plan) => [plan.label, plan.badge, plan.done])).toEqual([
      ['Plan 01', '01-01', true],
      ['Plan 02', '01-02', false],
    ]);
    expect(phase.after.map((row) => row.label)).toEqual(['Review', 'Verification']);
    expect(phase.other.map((row) => row.label)).toEqual(['UI review', 'Deferred items']);
    expect(phase.done).toBe(1);
    expect(phase.total).toBe(2);
    expect(phase.status).toEqual({ label: 'In progress', tone: 'active' });
    for (const row of phaseFiles(phase)) {
      expect(row.path).not.toMatch(/-(PLAN|SUMMARY)\.md$/);
    }
  });

  it('gives each plan row the plan page and its summary page to match', async () => {
    const presentation = await presentationOf(LIFECYCLE_FIXTURE);
    const model = buildDrawerViewModel(presentation);
    const [done, notDone] = model.current.phases[0].plans;
    const keyOf = (path: string) => presentation.artifacts.find((artifact) => artifact.path === path)!.key;
    expect(done.matchUrls).toEqual([
      keyOf('.planning/phases/01-first/01-01-PLAN.md'),
      keyOf('.planning/phases/01-first/01-01-SUMMARY.md'),
    ]);
    expect(notDone.matchUrls).toEqual([keyOf('.planning/phases/01-first/01-02-PLAN.md')]);
  });

  it('keeps a summary with no plan as an other file', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({ '.planning/phases/01-first/01-03-SUMMARY.md': '# Orphan summary' }),
    );
    const phase = model.current.phases[0];
    expect(phase.plans).toEqual([]);
    expect(phase.other.map((row) => row.label)).toEqual(['Summary 03']);
  });

  it.each([
    ['all plans summarised', { '.planning/phases/01-a/01-01-PLAN.md': 'p', '.planning/phases/01-a/01-01-SUMMARY.md': 's' }, 'Complete', 'complete'],
    ['some plans not summarised', { '.planning/phases/01-a/01-01-PLAN.md': 'p' }, 'In progress', 'active'],
    ['research and no plans', { '.planning/phases/01-a/01-RESEARCH.md': 'r', '.planning/phases/01-a/01-CONTEXT.md': 'c' }, 'Researched', 'quiet'],
    ['context and no plans', { '.planning/phases/01-a/01-CONTEXT.md': 'c' }, 'Discussed', 'quiet'],
    ['nothing yet', { '.planning/phases/01-a/notes.md': 'n' }, 'Not started', 'quiet'],
  ] as const)('status when %s', async (_name, files, label, tone) => {
    const model = buildDrawerViewModel(await presentationOf({ ...files }));
    expect(model.current.phases[0].status).toEqual({ label, tone });
  });

  it('calls a planless phase the roadmap marks complete Complete', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/ROADMAP.md': '# Roadmap\n\n## Phases\n\n- [x] **Phase 1: First** - done\n\n### Phase 1: First\n**Goal**: Do it\n**Plans**: 1 plan\n\nPlans:\n- [x] 01-01: Do it\n',
        '.planning/phases/01-first/01-CONTEXT.md': 'c',
      }),
    );
    expect(model.current.phases[0].status.label).toBe('Complete');
  });
});

describe('buildDrawerViewModel — degradation', () => {
  it('returns an empty model for a project with nothing in it', async () => {
    const model = buildDrawerViewModel(await fixturePresentation('sparse-empty'));
    expect(model.current.phases).toEqual([]);
    expect(model.shipped).toEqual([]);
    expect(model.current.quick.count).toBe(0);
    expect(model.defaultPlaceKey).toBe(model.current.quick.key);
  });

  it('does not throw on a stray file', async () => {
    const presentation = await presentationOf({ '.planning/spikes/idea.md': '# idea' });
    expect(() => buildDrawerViewModel(presentation)).not.toThrow();
  });

  it('is a pure projection: drawer.ts imports nothing from node:', () => {
    const source = readFileSync(resolve('src/presentation/drawer.ts'), 'utf8');
    expect(source).not.toMatch(/from\s+['"]node:/);
    expect(source).not.toMatch(/from\s+['"][^'"]*web\//);
  });
});

describe('drawer-route', () => {
  it('finds the phase for its own, plan and plan-artifact pages', async () => {
    const presentation = await presentationOf(LIFECYCLE_FIXTURE);
    const model = buildDrawerViewModel(presentation);
    const phase = model.current.phases[0];
    const planArtifact = presentation.artifacts.find((a) => a.path.endsWith('01-01-PLAN.md'))!;
    const summaryArtifact = presentation.artifacts.find((a) => a.path.endsWith('01-01-SUMMARY.md'))!;
    expect(placeKeyForPath(model, phase.url)).toBe(phase.key);
    expect(placeKeyForPath(model, phase.plans[0].url)).toBe(phase.key);
    expect(placeKeyForPath(model, planArtifact.key)).toBe(phase.key);
    expect(placeKeyForPath(model, summaryArtifact.key)).toBe(phase.key);
    expect(placeKeyForPath(model, phase.before[0].url)).toBe(phase.key);
  });

  it('finds a shipped milestone for its own page and its documents', async () => {
    const model = buildDrawerViewModel(await fixturePresentation('dense'));
    const milestone = model.shipped[0];
    expect(placeKeyForPath(model, milestone.url)).toBe(milestone.key);
    expect(placeKeyForPath(model, milestone.documents[0].url)).toBe(milestone.key);
  });

  it('returns null for a path no place holds', async () => {
    const model = buildDrawerViewModel(await fixturePresentation('dense'));
    expect(placeKeyForPath(model, '/nowhere')).toBeNull();
    expect(findPlace(model, 'nope')).toBeNull();
    expect(findPlace(model, null)).toBeNull();
  });

  it('names the shipped owner of an archived phase, and none for a current one', async () => {
    const model = buildDrawerViewModel(await fixturePresentation('dense'));
    const archived = model.shipped[0].phases[0];
    expect(shippedOwnerOf(model, archived.key)).toBe(model.shipped[0].key);
    expect(shippedOwnerOf(model, model.shipped[0].key)).toBe(model.shipped[0].key);
    expect(shippedOwnerOf(model, model.current.phases[0].key)).toBeNull();
    expect(findPlace(model, archived.key)).toBe(archived);
    const place = findPlace(model, model.shipped[1].key);
    expect(place?.kind).toBe('milestone');
  });
});

const QUICK_FIXTURE = {
  '.planning/quick/261024-abc-some-task/261024-abc-PLAN.md': '# Plan',
  '.planning/quick/261024-abc-some-task/261024-abc-SUMMARY.md': '# Summary',
  '.planning/quick/261024-abc-some-task/261024-abc-CONTEXT.md': '# Context',
  '.planning/quick/261024-abc-some-task/helper.mjs': 'export {};',
  '.planning/milestones/v1.0-quick/260901-xyz-old-task/260901-xyz-PLAN.md': '# Old plan',
};

function everyQuickTask(model: DrawerViewModel) {
  return [model.current.quick, ...model.shipped.map((milestone) => milestone.quick)].flatMap((place) =>
    place.months.flatMap((month) => month.tasks),
  );
}

describe('quickMonthOf', () => {
  it('names the month and year from the YYMMDD date', () => {
    expect(quickMonthOf('261024')).toBe('Oct 2026');
    expect(quickMonthOf('260101')).toBe('Jan 2026');
  });

  it('gives null for a month out of range', () => {
    expect(quickMonthOf('261324')).toBeNull();
    expect(quickMonthOf('260024')).toBeNull();
  });
});

describe('buildDrawerViewModel — quick tasks', () => {
  it('groups current and shipped quick tasks by month with a chip per markdown file', async () => {
    const model = buildDrawerViewModel(await presentationOf(QUICK_FIXTURE));
    const current = model.current.quick;
    expect(current.key).toBe('quick:current');
    expect(current.count).toBe(1);
    expect(current.months.map((month) => month.label)).toEqual(['Oct 2026']);
    const [task] = current.months[0].tasks;
    expect(task.dateBadge).toBe('Oct 24');
    expect(task.label).toBe('Some task');
    expect(task.files.map((row) => row.label)).toEqual(['Context', 'Plan', 'Summary']);
    expect(task.files.some((row) => row.path.endsWith('helper.mjs'))).toBe(false);
    // The row opens the plan even though the context file sorts first.
    expect(task.url).toBe(task.files[1].url);

    expect(model.shipped.map((milestone) => milestone.version)).toEqual(['v1.0']);
    const archived = model.shipped[0].quick;
    expect(archived.count).toBe(1);
    expect(archived.months.map((month) => month.label)).toEqual(['Sep 2026']);
    expect(archived.milestoneVersion).toBe('v1.0');
  });

  it('points a task without a plan at its summary, and one with neither at its first file', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/quick/261024-abc-summary-only/261024-abc-CONTEXT.md': '# Context',
        '.planning/quick/261024-abc-summary-only/261024-abc-SUMMARY.md': '# Summary',
        '.planning/quick/261023-def-context-only/261023-def-CONTEXT.md': '# Context',
      }),
    );
    const tasks = model.current.quick.months.flatMap((month) => month.tasks);
    const summaryOnly = tasks.find((task) => task.key.endsWith('summary-only'))!;
    expect(summaryOnly.url).toBe(summaryOnly.files.find((row) => row.label === 'Summary')!.url);
    const contextOnly = tasks.find((task) => task.key.endsWith('context-only'))!;
    expect(contextOnly.url).toBe(contextOnly.files[0].url);
  });

  it('leaves READMEs out of current and shipped quick tasks', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/quick/README.md': '# About quick tasks',
        '.planning/quick/261024-abc-some-task/261024-abc-PLAN.md': '# Plan',
        '.planning/quick/261024-abc-some-task/README.md': '# Notes',
        '.planning/milestones/v1.0-quick/README.md': '# About',
        '.planning/milestones/v1.0-quick/260901-xyz-old-task/260901-xyz-PLAN.md': '# Old plan',
      }),
    );
    expect(model.current.quick.count).toBe(1);
    expect(everyQuickTask(model).map((task) => task.key)).toEqual([
      '.planning/quick/261024-abc-some-task',
      '.planning/milestones/v1.0-quick/260901-xyz-old-task',
    ]);
    const paths = everyQuickTask(model).flatMap((task) => task.files.map((row) => row.path));
    expect(paths.some((path) => /readme\.md$/i.test(path))).toBe(false);
    expect(model.shipped[0].quick.count).toBe(1);
  });

  it('lists tasks newest first, one group per month, with unparseable names last as Undated', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/quick/260901-aaa-first/260901-aaa-PLAN.md': 'a',
        '.planning/quick/261002-bbb-second/261002-bbb-PLAN.md': 'b',
        '.planning/quick/261003-ccc-third/261003-ccc-PLAN.md': 'c',
        '.planning/quick/stray-dir/notes.md': 'd',
        '.planning/quick/loose-note.md': 'e',
      }),
    );
    const { months } = model.current.quick;
    expect(months.map((month) => month.label)).toEqual(['Oct 2026', 'Sep 2026', 'Undated']);
    expect(months[0].tasks.map((task) => task.label)).toEqual(['Third', 'Second']);
    const undated = months[2].tasks;
    expect(undated.map((task) => task.dateBadge)).toEqual([null, null]);
    expect(undated.flatMap((task) => task.files.map((row) => row.path)).sort()).toEqual([
      '.planning/quick/loose-note.md',
      '.planning/quick/stray-dir/notes.md',
    ]);
  });

  it('puts a milestone-root file under another vX.Y-name directory into that milestone documents', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/milestones/v1.0-ROADMAP.md': '# Roadmap',
        '.planning/milestones/v1.0-research/STACK.md': '# Stack',
      }),
    );
    const [milestone] = model.shipped;
    expect(milestone.documents.map((row) => row.path)).toEqual([
      '.planning/milestones/v1.0-ROADMAP.md',
      '.planning/milestones/v1.0-research/STACK.md',
    ]);
  });

  it('leaves a milestone-root file with no recoverable version out of the drawer', async () => {
    const model = buildDrawerViewModel(await presentationOf({ '.planning/milestones/notes/loose.md': '# n' }));
    expect(model.shipped).toEqual([]);
  });

  it('finds the quick place and task for a chip page, and the shipped owner of an archived one', async () => {
    const model = buildDrawerViewModel(await presentationOf(QUICK_FIXTURE));
    const [task] = model.current.quick.months[0].tasks;
    expect(placeKeyForPath(model, task.files[1].url)).toBe('quick:current');
    expect(quickTaskKeyForPath(model, task.files[1].url)).toBe(task.key);
    expect(quickTaskKeyForPath(model, '/nowhere')).toBeNull();
    const archived = model.shipped[0];
    expect(shippedOwnerOf(model, archived.quick.key)).toBe(archived.key);
    expect(findPlace(model, archived.quick.key)).toBe(archived.quick);
    expect(shippedOwnerOf(model, model.current.quick.key)).toBeNull();
  });

  it('opens on the current quick tasks when there is no live phase and quick tasks exist', async () => {
    const model = buildDrawerViewModel(await presentationOf(QUICK_FIXTURE));
    expect(model.defaultPlaceKey).toBe('quick:current');
  });

  it('opens on the newest shipped milestone when there is nothing current at all', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({ '.planning/milestones/v1.0-ROADMAP.md': '# Roadmap' }),
    );
    expect(model.defaultPlaceKey).toBe(model.shipped[0].key);
  });
});

/** Every markdown file the drawer can place must appear in exactly one place. The exceptions are
 * the two cases the drawer cannot place at all: a phase-folder file with no owning phase, and a
 * milestones/ file with no recoverable version (or a version still being worked on). */
function placedPaths(model: DrawerViewModel, presentation: ProjectPresentation): string[] {
  const paths: string[] = [];
  for (const phase of everyPhase(model)) paths.push(...phaseFiles(phase).map((row) => row.path));
  paths.push(
    ...presentation.milestones
      .flatMap((milestone) => milestone.phases)
      .flatMap((phase) => phase.plans)
      .flatMap((plan) => [plan.path, ...(plan.summary ? [plan.summary.path] : [])]),
  );
  for (const milestone of model.shipped) paths.push(...milestone.documents.map((row) => row.path));
  for (const task of everyQuickTask(model)) paths.push(...task.files.map((row) => row.path));
  return paths;
}

function expectedPaths(model: DrawerViewModel, presentation: ProjectPresentation): string[] {
  const phaseKeys = new Set(everyPhase(model).map((phase) => phase.key));
  const shippedVersions = new Set(model.shipped.map((milestone) => milestone.version.toLowerCase()));
  return presentation.artifacts
    .filter((artifact) => {
      if (!artifact.path.endsWith('.md')) return false;
      // A README in a quick-task folder is about the folder, not a task.
      const quickFolder =
        artifact.location === 'quick' || /^v[\d.]+-quick$/i.test(artifact.path.split('/')[2] ?? '');
      if (quickFolder && /(^|\/)readme\.md$/i.test(artifact.path)) return false;
      if (artifact.location === 'phase' || artifact.location === 'archived-phase') {
        return artifact.phaseKey !== null && phaseKeys.has(artifact.phaseKey);
      }
      if (artifact.location === 'quick') return artifact.path.split('/').length >= 3;
      if (artifact.location === 'milestone-root') {
        const segment = artifact.path.split('/')[2] ?? '';
        const version = segment.match(/^(v\d+\.\d+(?:\.\d+)?)-/i)?.[1];
        return version !== undefined && shippedVersions.has(version.toLowerCase());
      }
      return false;
    })
    .map((artifact) => artifact.path);
}

describe('buildDrawerViewModel — coverage', () => {
  it('places every placeable markdown file of fixtures/dense exactly once', async () => {
    const presentation = await fixturePresentation('dense');
    const model = buildDrawerViewModel(presentation);
    const placed = placedPaths(model, presentation);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...expectedPaths(model, presentation)].sort());
  });

  it("places every placeable markdown file of this repository's own .planning exactly once", async () => {
    const presentation = await diskPresentation(resolve('.'));
    const model = buildDrawerViewModel(presentation);
    const placed = placedPaths(model, presentation);
    expect(placed.length).toBeGreaterThan(200);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...expectedPaths(model, presentation)].sort());
  });

  it("opens this repository's own corpus on the current quick tasks", async () => {
    const model = buildDrawerViewModel(await diskPresentation(resolve('.')));
    expect(model.current.phases).toEqual([]);
    expect(model.current.quick.count).toBeGreaterThan(0);
    expect(model.defaultPlaceKey).toBe(model.current.quick.key);
    expect(model.shipped.map((milestone) => milestone.version)).toEqual(['v1.1', 'v1.0']);
    for (const milestone of model.shipped) {
      expect(milestone.shippedLabel).not.toBeNull();
      expect(milestone.phases.length).toBeGreaterThan(0);
    }
  });
});
