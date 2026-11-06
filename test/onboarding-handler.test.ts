// Phase 11 (11-20, VIEW-18, D-03, RESEARCH C11): the onboarding handler. The summary lifts to its four project
// files, its Codebase Context facts, the Docs Context count and the Recommended Next Step's first bullet
// verbatim, never validated. Over the Lendshed and Tidemark summaries through the real repository, plus planted
// bodies for the edges.
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { OnboardingHandler, extractOnboarding } from '../src/planning-repo/handlers/onboarding.ts';
import type { OnboardingLift } from '../src/planning-repo/handlers/onboarding.ts';
import { loadFixtureProject, loadProject } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const PATH = '.planning/onboarding/SUMMARY.md';
const TIDEMARK_ROOT = fileURLToPath(new URL('./fixtures/tidemark', import.meta.url)).replace(/[\\/]$/, '');

function refOf(path: string, kind: string): ArtifactRef {
  return { path, kind, location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as ArtifactRef;
}

function rawOf(path: string, text: string): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

const liftOf = (body: string): OnboardingLift => extractOnboarding(body)!;

describe('OnboardingHandler registration', () => {
  it('claims only the onboarding kind, sits before the generic handler and keeps it last', () => {
    expect(OnboardingHandler.match(refOf(PATH, 'onboarding'))).toBe(true);
    expect(OnboardingHandler.match(refOf('.planning/notes/x.md', 'note'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(refOf(PATH, 'onboarding')))).toBe(OnboardingHandler);
    expect(HANDLERS.indexOf(OnboardingHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });
});

describe('Lendshed and Tidemark summaries', () => {
  it('lifts the Lendshed summary: four files present, the command as written', async () => {
    const { presentation } = await loadFixtureProject();
    const lifted = (presentation.artifacts.find((a) => a.path === PATH)!.structured as { onboarding: OnboardingLift }).onboarding;
    expect(lifted.files).toEqual([
      { name: 'PROJECT.md', present: true },
      { name: 'REQUIREMENTS.md', present: true },
      { name: 'ROADMAP.md', present: true },
      { name: 'STATE.md', present: true },
    ]);
    expect(lifted.codebase).toEqual({ brownfield: true, readiness: 'none', mapPath: null, mapDetail: null, fastMapAvailable: false });
    expect(lifted.docsCount).toBe(2);
    expect(lifted.command).toBe('/gsd-manager');
  });

  it('lifts the Tidemark summary: four files missing, a complete map with its path and detail', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const lifted = (presentation.artifacts.find((a) => a.path === PATH)!.structured as { onboarding: OnboardingLift }).onboarding;
    expect(lifted.files.map((f) => f.present)).toEqual([false, false, false, false]);
    expect(lifted.codebase.readiness).toBe('complete');
    expect(lifted.codebase.mapPath).toBe('.planning/codebase/');
    expect(lifted.codebase.mapDetail).toBe('7 documents');
    expect(lifted.docsCount).toBe(3);
    expect(lifted.command).toBe('/gsd-ingest-docs');
  });
});

describe('extractOnboarding', () => {
  it('keeps the command verbatim, backticks, extra words and an unknown command included', () => {
    expect(liftOf('## Recommended Next Step\n- /gsd-not-a-real-command --flag\n').command).toBe('/gsd-not-a-real-command --flag');
    expect(liftOf('## Recommended Next Step\n- `/gsd-manager`\n').command).toBe('`/gsd-manager`');
  });

  it('reads a file word other than present or missing as unknown, and keeps the file order', () => {
    const lifted = liftOf('## Project State\n- STATE.md: missing\n- PROJECT.md: stale\n- ROADMAP.md: present\n');
    expect(lifted.files).toEqual([
      { name: 'STATE.md', present: false },
      { name: 'PROJECT.md', present: null },
      { name: 'ROADMAP.md', present: true },
    ]);
  });

  it('takes the leading number of the docs line, and null for a line with none', () => {
    expect(liftOf('## Docs Context\n- Existing ADR/PRD/SPEC/RFC candidates: 12 (3 in docs/)\n').docsCount).toBe(12);
    expect(liftOf('## Docs Context\n- Existing ADR/PRD/SPEC/RFC candidates: many\n').docsCount).toBeNull();
  });

  it('gives null for a body with none of the four known headings', () => {
    expect(extractOnboarding('# Onboarding Summary\n\nJust prose.\n')).toBeNull();
  });

  it('is linear in the size of the body', () => {
    const growth = measureGrowth({
      make: (n) => `## Project State\n${Array.from({ length: n }, (_, i) => `- FILE${i}.md: present`).join('\n')}\n`,
      run: (body) => {
        extractOnboarding(body);
      },
      startSize: 20,
      maxSize: 40,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('edge probes', () => {
  it('edge probe VIEW-18: a planted summary with all four project files missing gives four rows present false', () => {
    const body = [
      '# Onboarding Summary',
      '',
      '## Project State',
      '- PROJECT.md: missing',
      '- REQUIREMENTS.md: missing',
      '- ROADMAP.md: missing',
      '- STATE.md: missing',
      '',
      '## Codebase Context',
      '- Brownfield repo: no',
      '- Map readiness: none',
      '- Codebase map: missing',
      '- Fast map available: no',
      '',
      '## Docs Context',
      '- Existing ADR/PRD/SPEC/RFC candidates: 0',
      '',
      '## Recommended Next Step',
      '- /gsd-new-project',
      '',
    ].join('\n');
    const lifted = liftOf(body);
    expect(lifted.files).toHaveLength(4);
    expect(lifted.files.every((f) => f.present === false)).toBe(true);
    expect(lifted.docsCount).toBe(0);
    expect(lifted.codebase.brownfield).toBe(false);
    expect(lifted.command).toBe('/gsd-new-project');
  });

  it('edge probe VIEW-18: a planted summary with no Recommended Next Step gives a null command, the rest still lifted', () => {
    const body = '# Onboarding Summary\n\n## Project State\n- PROJECT.md: present\n\n## Codebase Context\n- Map readiness: fast\n';
    const result = OnboardingHandler.parse(rawOf(PATH, body), refOf(PATH, 'onboarding'));
    const lifted = (result.structured as { onboarding: OnboardingLift }).onboarding;
    expect(lifted.command).toBeNull();
    expect(lifted.files).toEqual([{ name: 'PROJECT.md', present: true }]);
    expect(lifted.codebase.readiness).toBe('fast');
    expect(lifted.docsCount).toBeNull();
    // An empty Recommended Next Step section is the same: no command.
    expect(liftOf('## Recommended Next Step\n\n').command).toBeNull();
  });

  it('edge probe VIEW-18: a summary with a heading and nothing under it still lifts, empty not guessed', () => {
    const lifted = liftOf('# Onboarding Summary\n\n## Project State\n\n## Recommended Next Step\n');
    expect(lifted.files).toEqual([]);
    expect(lifted.command).toBeNull();
    expect(lifted.codebase).toEqual({ brownfield: null, readiness: null, mapPath: null, mapDetail: null, fastMapAvailable: null });
  });
});

describe('guards', () => {
  it('keeps title, body and frontmatter and omits structured.onboarding when the lift throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/seed-thread-lift.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/seed-thread-lift.ts')>()),
      listItems: () => {
        throw new Error('boom');
      },
    }));
    const { OnboardingHandler: Guarded } = await import('../src/planning-repo/handlers/onboarding.ts');
    const result = Guarded.parse(rawOf(PATH, '---\nmade_up_example: true\n---\n# Onboarding Summary\n\n## Project State\n- PROJECT.md: present\n'), refOf(PATH, 'onboarding'));
    expect(result.title).toBe('Onboarding Summary');
    expect(result.body).toContain('PROJECT.md: present');
    expect(result.frontmatter.made_up_example).toBe(true);
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/seed-thread-lift.ts');
  });

  it('leaves structured empty for a file with none of the known headings, keeping title and body', () => {
    const result = OnboardingHandler.parse(rawOf(PATH, '# Hand-written notes\n\nNo structure.\n'), refOf(PATH, 'onboarding'));
    expect(result.title).toBe('Hand-written notes');
    expect(result.body).toContain('No structure.');
    expect(result.structured).toEqual({});
  });
});
