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
import { toProjectPresentation, type ProjectPresentation } from '../../src/server/project-presentation.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

const ROOT = '/project';

async function presentationOf(files: Record<string, string | Uint8Array>): Promise<ProjectPresentation> {
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
  for (const group of model.quick.groups) {
    for (const task of group.tasks) urls.push(...task.files.map((row) => row.url));
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
    // deferred-items.md is a recognised unprefixed file (DATA-07): it follows the known post-plan documents.
    expect(phase.after.map((row) => row.label)).toEqual(['Review', 'Verification', 'Deferred items']);
    expect(phase.other.map((row) => row.label)).toEqual(['UI review']);
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
    expect(model.quick.count).toBe(0);
    expect(model.quick.groups).toEqual([]);
    expect(model.defaultPlaceKey).toBe(model.quick.key);
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
  return model.quick.groups.flatMap((group) => group.tasks);
}

describe('buildDrawerViewModel — the After stage (DATA-07, DATA-08)', () => {
  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  const PDF = new TextEncoder().encode('%PDF-1.4\n%%EOF\n');

  it('orders post-plan documents, then recognised unprefixed files, then non-text files, each by file name', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/phases/01-first/01-CONTEXT.md': '# Context',
        '.planning/phases/01-first/01-01-PLAN.md': '# Plan one',
        '.planning/phases/01-first/kiln-floor.png': PNG,
        '.planning/phases/01-first/firing-sheet.pdf': PDF,
        '.planning/phases/01-first/deferred-items.md': '# Deferred',
        '.planning/phases/01-first/COVERAGE.md': '# Coverage',
        '.planning/phases/01-first/01-VERIFICATION.md': '# Verification',
        '.planning/phases/01-first/.continue-here.md': '# Continue',
        '.planning/phases/01-first/01-REVIEW.md': '# Review',
        '.planning/phases/01-first/SKELETON.md': '# Skeleton',
      }),
    );
    const [phase] = model.current.phases;
    expect(phase.after.map((row) => row.label)).toEqual([
      'Review',
      'Verification',
      'Continue here',
      'Coverage',
      'Deferred items',
      'Skeleton',
      'firing-sheet.pdf',
      'kiln-floor.png',
    ]);
  });

  it('gives every non-text row its fileClass and size, and every text row the text class', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/phases/01-first/01-CONTEXT.md': '# Context',
        '.planning/phases/01-first/COVERAGE.md': '# Coverage',
        '.planning/phases/01-first/kiln-floor.png': PNG,
        '.planning/phases/01-first/firing-sheet.pdf': PDF,
      }),
    );
    const [phase] = model.current.phases;
    const byLabel = new Map(phaseFiles(phase).map((row) => [row.label, row]));
    expect(byLabel.get('kiln-floor.png')).toMatchObject({ fileClass: 'image', sizeBytes: PNG.length });
    expect(byLabel.get('firing-sheet.pdf')).toMatchObject({ fileClass: 'binary', sizeBytes: PDF.length });
    expect(byLabel.get('Coverage')?.fileClass).toBe('text');
    expect(byLabel.get('Context')).toMatchObject({ fileClass: 'text', sizeBytes: '# Context'.length });
  });

  it('shows no After rows for a phase whose only extra files are internal or plain text', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/phases/01-first/01-CONTEXT.md': '# Context',
        '.planning/phases/01-first/work.tmp': 'scratch',
        '.planning/phases/01-first/agent.lock': '123',
        '.planning/phases/01-first/data.txt': 'plain text, not a recognised file',
      }),
    );
    const [phase] = model.current.phases;
    expect(phase.after).toEqual([]);
    expect(phase.other).toEqual([]);
    expect(phaseFiles(phase).map((row) => row.path)).toEqual(['.planning/phases/01-first/01-CONTEXT.md']);
  });

  it('keeps a quick task and a milestone place markdown-only', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/quick/260901-aaa-first/260901-aaa-PLAN.md': 'a',
        '.planning/quick/260901-aaa-first/diagram.png': PNG,
        '.planning/milestones/v1.0-ROADMAP.md': '# Roadmap',
        '.planning/milestones/v1.0-research/chart.png': PNG,
      }),
    );
    const [group] = model.quick.groups;
    expect(group.tasks[0].files.map((row) => row.path)).toEqual(['.planning/quick/260901-aaa-first/260901-aaa-PLAN.md']);
    const [milestone] = model.shipped;
    expect(milestone.documents.map((row) => row.path)).toEqual(['.planning/milestones/v1.0-ROADMAP.md']);
  });

  it('lists the Shapes phase 01 picture and PDF in its After stage, by file name', async () => {
    const { presentation } = await loadShapesProject();
    const phase = buildDrawerViewModel(presentation).current.phases.find((place) => place.number === '01');
    expect(phase?.after.map((row) => [row.label, row.fileClass])).toEqual([
      ['firing-sheet.pdf', 'binary'],
      ['kiln-floor.png', 'image'],
    ]);
  });
});

describe('buildDrawerViewModel — quick tasks', () => {
  it('puts every quick task in one place, grouped by milestone with the current ones first', async () => {
    const model = buildDrawerViewModel(await presentationOf(QUICK_FIXTURE));
    expect(model.quick.key).toBe('quick');
    expect(model.quick.count).toBe(2);
    expect(model.quick.groups.map((group) => [group.current, group.version])).toEqual([
      [true, null],
      [false, 'v1.0'],
    ]);
    const [task] = model.quick.groups[0].tasks;
    expect(task.dateBadge).toBe('Oct 24');
    expect(task.label).toBe('Some task');
    expect(task.files.map((row) => row.label)).toEqual(['Context', 'Plan', 'Summary']);
    expect(task.files.some((row) => row.path.endsWith('helper.mjs'))).toBe(false);
    // The row opens the plan even though the context file sorts first.
    expect(task.url).toBe(task.files[1].url);
    expect(model.quick.groups[1].tasks.map((archived) => archived.key)).toEqual([
      '.planning/milestones/v1.0-quick/260901-xyz-old-task',
    ]);
    expect(model.shipped.map((milestone) => milestone.version)).toEqual(['v1.0']);
  });

  it('leaves out the current group and any milestone that has no quick tasks', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/milestones/v2.0-ROADMAP.md': '# Roadmap',
        '.planning/milestones/v1.0-quick/260901-xyz-old-task/260901-xyz-PLAN.md': '# Old plan',
      }),
    );
    expect(model.quick.groups.map((group) => group.version)).toEqual(['v1.0']);
    expect(model.shipped.map((milestone) => milestone.version)).toEqual(['v2.0', 'v1.0']);
  });

  it('points a task without a plan at its summary, and one with neither at its first file', async () => {
    const model = buildDrawerViewModel(
      await presentationOf({
        '.planning/quick/261024-abc-summary-only/261024-abc-CONTEXT.md': '# Context',
        '.planning/quick/261024-abc-summary-only/261024-abc-SUMMARY.md': '# Summary',
        '.planning/quick/261023-def-context-only/261023-def-CONTEXT.md': '# Context',
      }),
    );
    const tasks = everyQuickTask(model);
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
    expect(model.quick.count).toBe(2);
    expect(everyQuickTask(model).map((task) => task.key)).toEqual([
      '.planning/quick/261024-abc-some-task',
      '.planning/milestones/v1.0-quick/260901-xyz-old-task',
    ]);
    const paths = everyQuickTask(model).flatMap((task) => task.files.map((row) => row.path));
    expect(paths.some((path) => /readme\.md$/i.test(path))).toBe(false);
  });

  it('lists a group newest first and leaves strays that are not dated task folders out of it', async () => {
    // Only a folder named {date}-{time}-{slug} is a quick task (DATA-07): a stray folder or a loose note
    // under quick/ keeps a model entry at location other, so it is not a task row in the drawer.
    const presentation = await presentationOf({
      '.planning/quick/260901-aaa-first/260901-aaa-PLAN.md': 'a',
      '.planning/quick/261002-bbb-second/261002-bbb-PLAN.md': 'b',
      '.planning/quick/261003-ccc-third/261003-ccc-PLAN.md': 'c',
      '.planning/quick/stray-dir/notes.md': 'd',
      '.planning/quick/loose-note.md': 'e',
    });
    const model = buildDrawerViewModel(presentation);
    const [group] = model.quick.groups;
    expect(group.tasks.map((task) => task.label)).toEqual(['Third', 'Second', 'First']);
    for (const path of ['.planning/quick/stray-dir/notes.md', '.planning/quick/loose-note.md']) {
      expect(presentation.artifacts.find((artifact) => artifact.path === path)?.location, path).toBe('other');
    }
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

  it('finds the one quick place and the task for any quick-task page, current or shipped', async () => {
    const model = buildDrawerViewModel(await presentationOf(QUICK_FIXTURE));
    for (const task of everyQuickTask(model)) {
      expect(placeKeyForPath(model, task.url)).toBe('quick');
      expect(quickTaskKeyForPath(model, task.url)).toBe(task.key);
    }
    expect(quickTaskKeyForPath(model, '/nowhere')).toBeNull();
    expect(findPlace(model, 'quick')).toBe(model.quick);
    // Quick tasks sit outside the shipped milestones, so none of them unfolds for it.
    expect(shippedOwnerOf(model, model.quick.key)).toBeNull();
  });

  it('opens on the quick tasks when there is no live phase and current quick tasks exist', async () => {
    const model = buildDrawerViewModel(await presentationOf(QUICK_FIXTURE));
    expect(model.defaultPlaceKey).toBe('quick');
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

  it("opens this repository's own corpus on its current milestone, with v2.0 the newest shipped one", async () => {
    const model = buildDrawerViewModel(await diskPresentation(resolve('.')));
    // v2.1 is the milestone in progress, so the drawer opens on one of its phases, not on a shipped place.
    expect(model.current.version).toBe('v2.1');
    expect(model.current.phases.length).toBeGreaterThan(0);
    expect(model.current.phases.map((phase) => phase.key)).toContain(model.defaultPlaceKey);
    expect(model.shipped.map((milestone) => milestone.key)).not.toContain(model.defaultPlaceKey);
    // The shipped milestones, newest first, and what the drawer lists for each. The v2.0 folder holds
    // quick tasks and no phases; v1.0 and v1.1 are archived and no longer change.
    expect(model.shipped.map((milestone) => milestone.version)).toEqual(['v2.0', 'v1.1', 'v1.0']);
    expect(model.shipped.map((milestone) => milestone.phases.length)).toEqual([0, 1, 4]);
    for (const milestone of model.shipped) expect(milestone.shippedLabel).not.toBeNull();
    const shippedQuick = model.quick.groups.filter((group) => !group.current);
    expect(shippedQuick.map((group) => [group.version, group.tasks.length])).toEqual([
      ['v2.0', 40],
      ['v1.1', 13],
      ['v1.0', 5],
    ]);
  });
});
