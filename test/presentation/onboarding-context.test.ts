// Phase 11 (11-20, VIEW-18, D-03, RESEARCH C11): the onboarding page's join. The summary's own command is carried
// verbatim; for a map-only project the Codebase head's computed command is carried beside it, never merged, with a
// flag for whether they differ. Over Lendshed (not map-only) and Tidemark (a complete map and nothing else).
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildOnboardingContext } from '../../src/presentation/onboarding-context.ts';
import { hasPlanningDocCandidates, mapReadiness, nextStep } from '../../src/presentation/codebase-map.ts';
import { projectMapState } from '../../src/presentation/project-map-state.ts';
import { extractOnboarding } from '../../src/planning-repo/handlers/onboarding.ts';
import { loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';

const PATH = '.planning/onboarding/SUMMARY.md';
const TIDEMARK_ROOT = fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)).replace(/[\\/]$/, '');

function planted(presentation: ProjectPresentation, body: string): ProjectPresentation {
  const copy = structuredClone(presentation);
  const artifact = copy.artifacts.find((a) => a.path === PATH)!;
  const lifted = extractOnboarding(body);
  artifact.structured = lifted === null ? {} : { onboarding: lifted };
  return copy;
}

describe('buildOnboardingContext over Lendshed', () => {
  it('carries the summary command and facts, and no first screen: Lendshed is not map-only', async () => {
    const { presentation } = await loadFixtureProject();
    const context = buildOnboardingContext(presentation, PATH)!;
    expect(context.summaryCommand).toBe('/gsd-manager');
    expect(context.files.map((f) => [f.name, f.present])).toEqual([
      ['PROJECT.md', true],
      ['REQUIREMENTS.md', true],
      ['ROADMAP.md', true],
      ['STATE.md', true],
    ]);
    expect(context.codebase).toEqual({ brownfield: true, readiness: 'none', mapPath: null, fastMapAvailable: false });
    expect(context.docsCount).toBe(2);
    expect(context.firstScreen).toBeNull();
    expect(context.differs).toBe(false);
  });
});

describe('buildOnboardingContext over Tidemark (map-only)', () => {
  it("carries both commands verbatim and apart: the summary's /gsd-ingest-docs and the head's computed command", async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const context = buildOnboardingContext(presentation, PATH)!;
    // The same inputs the Phase 10 head uses.
    const state = projectMapState(presentation.artifacts);
    expect(state.mapOnly).toBe(true);
    const computed = nextStep(mapReadiness(state.present), hasPlanningDocCandidates(presentation.artifacts));
    expect(context.firstScreen).toEqual(computed);
    expect(context.firstScreen?.command).toBe('/gsd-new-project');
    // The summary's own command is not replaced, validated or reconciled.
    expect(context.summaryCommand).toBe('/gsd-ingest-docs');
    expect(context.differs).toBe(true);
    expect(context.codebase.readiness).toBe('complete');
    expect(context.codebase.mapPath).toBe('.planning/codebase/');
  });

  it('says the commands do not differ when the summary names the computed one', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const same = planted(presentation, '## Recommended Next Step\n- /gsd-new-project\n');
    const context = buildOnboardingContext(same, PATH)!;
    expect(context.summaryCommand).toBe('/gsd-new-project');
    expect(context.firstScreen?.command).toBe('/gsd-new-project');
    expect(context.differs).toBe(false);
  });
});

describe('edge probes', () => {
  it('edge probe VIEW-18: no Recommended Next Step gives a null summary command and the context still builds', async () => {
    const { presentation } = await loadProject(TIDEMARK_ROOT);
    const context = buildOnboardingContext(planted(presentation, '# Onboarding Summary\n\n## Project State\n- PROJECT.md: missing\n'), PATH)!;
    expect(context.summaryCommand).toBeNull();
    expect(context.files).toEqual([{ name: 'PROJECT.md', present: false }]);
    // The map-only first screen is still computed, and with no summary command there is nothing to differ from.
    expect(context.firstScreen?.command).toBe('/gsd-new-project');
    expect(context.differs).toBe(false);
  });

  it('edge probe VIEW-18: a summary with all four files missing builds four rows present false', async () => {
    const { presentation } = await loadFixtureProject();
    const body = '## Project State\n- PROJECT.md: missing\n- REQUIREMENTS.md: missing\n- ROADMAP.md: missing\n- STATE.md: missing\n';
    const context = buildOnboardingContext(planted(presentation, body), PATH)!;
    expect(context.files).toHaveLength(4);
    expect(context.files.every((f) => f.present === false)).toBe(true);
  });
});

describe('buildOnboardingContext: absent and odd input', () => {
  it('gives null for a path that is not an artifact, and for a file with no lifted summary', async () => {
    const { presentation } = await loadFixtureProject();
    expect(buildOnboardingContext(presentation, '.planning/onboarding/NOPE.md')).toBeNull();
    expect(buildOnboardingContext(planted(presentation, '# Not a summary\n'), PATH)).toBeNull();
  });

  it('never throws on a broken presentation', () => {
    expect(buildOnboardingContext(null as unknown as ProjectPresentation, PATH)).toBeNull();
    expect(buildOnboardingContext({ artifacts: [{ path: PATH, structured: { onboarding: 'x' } }] } as unknown as ProjectPresentation, PATH)).toBeNull();
  });

  it('reads a malformed lifted record as empty fields, not a throw', async () => {
    const { presentation } = await loadFixtureProject();
    const copy = structuredClone(presentation);
    copy.artifacts.find((a) => a.path === PATH)!.structured = { onboarding: { files: 'no', codebase: 3, docsCount: 'x', command: 5 } };
    const context = buildOnboardingContext(copy, PATH)!;
    expect(context.files).toEqual([]);
    expect(context.summaryCommand).toBeNull();
    expect(context.docsCount).toBeNull();
    expect(context.codebase).toEqual({ brownfield: null, readiness: null, mapPath: null, fastMapAvailable: null });
  });
});
