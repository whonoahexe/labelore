import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import {
  buildDrawerViewModel,
  type DrawerFileRow,
  type DrawerMilestonePlace,
  type DrawerPhasePlace,
  type DrawerViewModel,
} from '../../src/presentation/drawer.ts';
import { findPlace, placeKeyForPath, shippedOwnerOf } from '../../src/presentation/drawer-route.ts';
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
    expect(model.defaultPlaceKey).toBeNull();
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
    const place: DrawerMilestonePlace | DrawerPhasePlace | null = findPlace(model, model.shipped[1].key);
    expect(place?.kind).toBe('milestone');
  });
});
