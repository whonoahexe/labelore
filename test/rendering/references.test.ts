import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../src/domain/model.ts';
import {
  buildReferenceRegistry,
  resolveArtifactReference,
  resolvePresentationReference,
} from '../../src/presentation/references.ts';
import {
  buildArtifactUrl,
  buildPhaseUrl,
  buildPlanUrl,
  milestoneKeyOf,
  phaseKeyOf,
} from '../../src/presentation/routes.ts';
import { createArtifactRenderer } from '../../src/rendering/markdown.ts';
import type {
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../../src/server/project-presentation.ts';
import {
  handleDocumentReferenceActivation,
  restoreDocumentReferenceFocus,
} from '../../src/web/pages/document-reference-activation.ts';

const activeIdentity = {
  milestoneVersion: 'v2.0',
  number: '01',
  projectCode: null,
  slug: 'live',
};
const archivedIdentity = { ...activeIdentity, milestoneVersion: 'v1.0', slug: 'old' };
const activeArtifact = '.planning/phases/01-live/01-CONTEXT.md';
const archivedArtifact = '.planning/milestones/v1.0-phases/01-old/01-CONTEXT.md';
const rootArtifact = '.planning/PROJECT.md';

function plan(identity: typeof activeIdentity, path: string): PlanDto {
  const phaseKey = phaseKeyOf(identity);
  return {
    key: buildPlanUrl(identity, '01-01'),
    id: '01-01',
    phaseKey,
    planNumber: '01',
    path,
    description: null,
    frontmatter: { wave: 1 },
    complete: identity.milestoneVersion === 'v1.0',
    summary: null,
    dependsOn: [],
    checkpoints: [],
  };
}

function phase(identity: typeof activeIdentity, archived: boolean, artifactPath: string): PhaseDto {
  return {
    key: phaseKeyOf(identity),
    milestoneKey: milestoneKeyOf(identity.milestoneVersion),
    identity,
    name: archived ? 'Archived foundation' : 'Current foundation',
    dirPath: artifactPath.slice(0, artifactPath.lastIndexOf('/')),
    archived,
    goal: archived ? 'Past goal' : 'Current goal',
    dependsOnRaw: null,
    requirementIds: ['READ-05'],
    requirementRefs: [{ raw: 'READ-05', targetRequirementId: 'READ-05' }],
    successCriteria: [],
    roadmapComplete: archived,
    formalPlanProgress: {
      completed: archived ? 1 : 0,
      total: 1,
      sourcePath: '.planning/ROADMAP.md',
    },
    diskStatus: archived ? 'complete' : 'in_progress',
    plans: [plan(identity, artifactPath.replace('CONTEXT.md', '01-01-PLAN.md'))],
  };
}

function milestone(version: string, archived: boolean, phaseDto: PhaseDto): MilestoneDto {
  return {
    key: milestoneKeyOf(version),
    version,
    name: archived ? 'Archive v1.0' : 'Current v2.0',
    archived,
    phases: [phaseDto],
  };
}

function presentation(): ProjectPresentation {
  const activePhase = phase(activeIdentity, false, activeArtifact);
  const oldPhase = phase(archivedIdentity, true, archivedArtifact);
  return {
    readAt: '2026-08-27T04:00:00.000Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'Reference fixture',
    config: {},
    state: null,
    milestones: [milestone('v1.0', true, oldPhase), milestone('v2.0', false, activePhase)],
    requirements: [
      {
        id: 'READ-05',
        category: 'Reading',
        text: 'Compare authored truths with recorded coverage.',
        tier: 'v1',
        checked: false,
        coveringPhases: [{ raw: 'Phase 01', targetPhaseKey: activePhase.key }],
      },
    ],
    artifacts: [
      {
        key: buildArtifactUrl(activeIdentity, activeArtifact),
        path: activeArtifact,
        kind: 'context',
        title: 'Current context',
        frontmatter: {},
        structured: {},
        milestoneKey: milestoneKeyOf('v2.0'),
        phaseKey: activePhase.key,
      },
      {
        key: buildArtifactUrl(archivedIdentity, archivedArtifact),
        path: archivedArtifact,
        kind: 'context',
        title: 'Archived context',
        frontmatter: {},
        structured: {},
        milestoneKey: milestoneKeyOf('v1.0'),
        phaseKey: oldPhase.key,
      },
      {
        key: buildArtifactUrl(null, rootArtifact),
        path: rootArtifact,
        kind: 'project',
        title: 'Project',
        frontmatter: {},
        structured: {},
        milestoneKey: null,
        phaseKey: null,
      },
    ],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
  };
}

function artifact(body: string, path = activeArtifact): Pick<Artifact, 'kind' | 'body' | 'path'> {
  return { kind: 'markdown', body, path };
}

describe('milestone-contextual presentation references', () => {
  it('resolves duplicate phase and plan identities inside their containing milestone', () => {
    const registry = buildReferenceRegistry(presentation());

    expect(resolvePresentationReference(registry, 'Phase 01', activeArtifact)?.url).toBe(
      buildPhaseUrl(activeIdentity),
    );
    expect(resolvePresentationReference(registry, 'Phase 01', archivedArtifact)?.url).toBe(
      buildPhaseUrl(archivedIdentity),
    );
    expect(resolvePresentationReference(registry, '01-01', activeArtifact)?.url).toBe(
      buildPlanUrl(activeIdentity, '01-01'),
    );
    expect(resolvePresentationReference(registry, '01-01', archivedArtifact)?.url).toBe(
      buildPlanUrl(archivedIdentity, '01-01'),
    );
  });

  it('uses the active milestone for root documents and routes requirements through its covering phase', () => {
    const registry = buildReferenceRegistry(presentation());
    const requirement = resolvePresentationReference(registry, 'READ-05', rootArtifact);

    expect(requirement).toMatchObject({
      type: 'requirement',
      identity: 'READ-05',
      title: 'Compare authored truths with recorded coverage.',
      url: buildPhaseUrl(activeIdentity),
    });
    expect(resolvePresentationReference(registry, 'READ-05', archivedArtifact)?.url).toBe(
      buildPhaseUrl(archivedIdentity),
    );
  });

  it.each([
    '',
    ' ',
    'READ-',
    'READ-999',
    'Phase',
    'Phase 99',
    '01-',
    '99-99',
    '.planning/phases/99-missing/99-MISSING.md',
    'backend/src/auth/mod.rs',
    'a1b2c3d',
  ])('leaves unresolved or malformed token %j ordinary', (token) => {
    expect(
      resolvePresentationReference(buildReferenceRegistry(presentation()), token, activeArtifact),
    ).toBeNull();
  });
});

describe('exact artifact-path presentation references', () => {
  it('resolves a registered phase artifact path to its existing artifact preview and Open URL', () => {
    const registry = buildReferenceRegistry(presentation());

    expect(resolvePresentationReference(registry, activeArtifact, rootArtifact)).toMatchObject({
      type: 'artifact',
      identity: activeArtifact,
      title: 'Current context',
      url: buildArtifactUrl(activeIdentity, activeArtifact),
    });
    expect(resolveArtifactReference(registry, activeArtifact)?.url).toBe(
      buildArtifactUrl(activeIdentity, activeArtifact),
    );
  });

  it('resolves milestone-root and archived artifact paths from the same registry, without phase-number assumptions', () => {
    const registry = buildReferenceRegistry(presentation());

    // Resolved while "contained in" an unrelated artifact — proves resolution never consults the
    // containing document's own milestone/phase context, unlike phase/plan/requirement tokens.
    expect(resolvePresentationReference(registry, rootArtifact, activeArtifact)).toMatchObject({
      type: 'artifact',
      identity: rootArtifact,
      title: 'Project',
      url: buildArtifactUrl(null, rootArtifact),
    });
    expect(resolvePresentationReference(registry, archivedArtifact, rootArtifact)).toMatchObject({
      type: 'artifact',
      identity: archivedArtifact,
      title: 'Archived context',
      url: buildArtifactUrl(archivedIdentity, archivedArtifact),
    });
  });

  it('never synthesizes a destination for an unregistered .planning path, a source path, or a commit hash', () => {
    const registry = buildReferenceRegistry(presentation());

    expect(resolveArtifactReference(registry, '.planning/phases/99-missing/99-MISSING.md')).toBeNull();
    expect(resolvePresentationReference(registry, 'backend/src/auth/mod.rs', activeArtifact)).toBeNull();
    expect(resolvePresentationReference(registry, 'a1b2c3d', activeArtifact)).toBeNull();
  });
});

describe('post-sanitize reference enrichment', () => {
  it('linkifies only resolved plain text while preserving Unicode and skipped ancestry', async () => {
    const registry = buildReferenceRegistry(presentation());
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`雪（READ-05）, Phase 01; 01-01。BAD-99 remains.

[READ-05](https://example.com) and \`READ-05\`.

<pre>READ-05</pre>

\`\`\`mermaid
flowchart TD
  READ-05 --> A
\`\`\``),
      { referenceRegistry: registry },
    );

    expect(rendered.html).toContain('雪（');
    expect(rendered.html).toContain('。BAD-99 remains.');
    expect(rendered.html.match(/data-reference-key=/g)).toHaveLength(3);
    expect(rendered.html).toContain('<a href="https://example.com">READ-05</a>');
    expect(rendered.html).toContain('<code>READ-05</code>');
    expect(rendered.html).toContain('READ-05 --> A');
    expect(rendered.references).toHaveLength(3);
    expect(rendered.warnings).toEqual([]);
  });

  it('linkifies an exact prose artifact path to a preview whose Open URL is the existing artifact URL', async () => {
    const registry = buildReferenceRegistry(presentation());
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`See ${rootArtifact} for the project overview.`),
      { referenceRegistry: registry },
    );

    expect(rendered.html.match(/data-reference-key=/g)).toHaveLength(1);
    expect(rendered.html).toContain(`>${rootArtifact}</button>`);
    expect(rendered.references).toHaveLength(1);
    expect(rendered.references?.[0]).toMatchObject({
      type: 'artifact',
      identity: rootArtifact,
      url: buildArtifactUrl(null, rootArtifact),
    });
  });

  it('resolves a milestone-root or archived artifact path from the same registry, without phase-number assumptions', async () => {
    const registry = buildReferenceRegistry(presentation());
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`Archived copy lives at ${archivedArtifact} in the old milestone.`),
      { referenceRegistry: registry },
    );

    expect(rendered.html.match(/data-reference-key=/g)).toHaveLength(1);
    expect(rendered.references?.[0]).toMatchObject({
      type: 'artifact',
      identity: archivedArtifact,
      url: buildArtifactUrl(archivedIdentity, archivedArtifact),
    });
  });

  it('leaves an unknown .planning path, a reproduced source path, and a commit hash as plain text (D-17)', async () => {
    const registry = buildReferenceRegistry(presentation());
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(
        'Missing at .planning/phases/99-missing/99-MISSING.md, source backend/src/auth/mod.rs, commit a1b2c3d.',
      ),
      { referenceRegistry: registry },
    );

    expect(rendered.html).not.toContain('data-reference-key=');
    expect(rendered.html).toContain('.planning/phases/99-missing/99-MISSING.md');
    expect(rendered.html).toContain('backend/src/auth/mod.rs');
    expect(rendered.html).toContain('a1b2c3d');
    expect(rendered.references ?? []).toHaveLength(0);
  });

  it('excludes trailing sentence punctuation from lookup while keeping the visible reference faithful to the authored path', async () => {
    const registry = buildReferenceRegistry(presentation());
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(artifact(`Read ${rootArtifact}. Then continue.`), {
      referenceRegistry: registry,
    });

    expect(rendered.html).toContain(`>${rootArtifact}</button>`);
    expect(rendered.html).toContain('</button>. Then continue.');
    expect(rendered.references).toHaveLength(1);
  });

  it('installs reference enrichment after sanitize and before stringify', async () => {
    const source = await readFile('src/rendering/markdown.ts', 'utf8');
    const sanitize = source.indexOf('.use(rehypeSanitize');
    const references = source.indexOf('.use(rehypeResolvedReferences');
    const stringify = source.indexOf('.use(rehypeStringify');

    expect(sanitize).toBeGreaterThan(-1);
    expect(references).toBeGreaterThan(sanitize);
    expect(stringify).toBeGreaterThan(references);
  });
});

describe('sanitized metadata to controlled React preview bridge', () => {
  it.each([
    { type: 'click', key: undefined },
    { type: 'keydown', key: 'Enter' },
    { type: 'keydown', key: ' ' },
  ])('opens preview before navigation for $type $key', async ({ type, key }) => {
    const registry = buildReferenceRegistry(presentation());
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(artifact('Open READ-05 for context.'), {
      referenceRegistry: registry,
    });
    const preview = rendered.references?.[0];
    if (!preview) throw new Error('Resolved renderer output did not expose its preview DTO');
    let prevented = 0;
    const navigationCalls = 0;
    let focused = 0;
    const trigger = {
      dataset: { referenceKey: preview.key },
      closest: (selector: string) => (selector === '[data-reference-key]' ? trigger : null),
      focus: () => {
        focused += 1;
      },
    };
    const event = {
      type,
      key,
      target: trigger,
      preventDefault: () => {
        prevented += 1;
      },
    };

    const state = handleDocumentReferenceActivation(
      event,
      new Map(rendered.references?.map((item) => [item.key, item]) ?? []),
    );

    expect(state).toEqual({ trigger, preview });
    expect(prevented).toBe(1);
    expect(navigationCalls).toBe(0);
    restoreDocumentReferenceFocus(state?.trigger ?? null);
    expect(focused).toBe(1);
  });

  it('ignores non-activation keys and keys absent from the renderer result', () => {
    let prevented = 0;
    const trigger = {
      dataset: { referenceKey: 'not-authorized' },
      closest: () => trigger,
      focus: () => undefined,
    };
    const state = handleDocumentReferenceActivation(
      {
        type: 'keydown',
        key: 'ArrowDown',
        target: trigger,
        preventDefault: () => {
          prevented += 1;
        },
      },
      new Map(),
    );

    expect(state).toBeNull();
    expect(prevented).toBe(0);
  });

  it('renders one Base UI preview with the locked fields, explicit Open, and exact focus return', async () => {
    const preview = await readFile('src/web/components/reference-preview.tsx', 'utf8');
    const css = await readFile('src/web/styles/globals.css', 'utf8');
    const artifactPage = await readFile('src/web/pages/artifact-page.tsx', 'utf8');
    const activation = await readFile('src/web/pages/document-reference-activation.ts', 'utf8');
    const router = await readFile('src/web/app-router.tsx', 'utf8');

    for (const field of ['identity', 'title', 'status', 'location', 'detail']) {
      expect(preview).toContain(`preview.${field}`);
    }
    expect(preview).toContain("from '@base-ui/react/popover'");
    expect(preview).toMatch(
      /<Popover\.Positioner[\s\S]*className="reference-preview-positioner"[\s\S]*anchor=\{state\.trigger\}[\s\S]*sideOffset=\{8\}[\s\S]*align="start"[\s\S]*positionMethod="fixed"/,
    );
    expect(preview).toContain('finalFocus={() => state.trigger}');
    expect(preview).toContain('href={preview.url}');
    expect(preview).toContain('Open');
    expect(artifactPage.match(/dangerouslySetInnerHTML/g)).toHaveLength(1);
    expect(artifactPage).toContain('handleDocumentReferenceActivation<HTMLElement>');
    expect(activation).toContain("'[data-reference-key]'");
    expect(router).toContain('presentationRoutePatterns.plan, element: <PlanPairPage />');
    expect(router).toContain('presentationRoutePatterns.artifact, element: <ArtifactPage />');
    expect(css).toMatch(/\.reference-preview-positioner\s*\{[^}]*z-index:\s*(?:2[1-9]|[3-9]\d|\d{3,})/s);
    expect(css).toMatch(/\.reference-preview\s*\{[^}]*width:\s*min\(24rem, calc\(100vw - 2rem\)\)/s);
    expect(css).not.toMatch(/\.reference-preview\s*\{[^}]*z-index:/s);
  });
});
