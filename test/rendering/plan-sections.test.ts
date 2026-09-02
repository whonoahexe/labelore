import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../src/domain/model.ts';
import { buildReferenceRegistry, type ReferenceRegistry } from '../../src/presentation/references.ts';
import { phaseKeyOf, buildPlanUrl } from '../../src/presentation/routes.ts';
import { createArtifactRenderer } from '../../src/rendering/markdown.ts';
import type { PhaseDto, ProjectPresentation } from '../../src/server/project-presentation.ts';

const CORPUS_PLAN_PATH =
  process.env.GSD_LORE_CORPUS ??
  '/home/cinedise/studio-portal/.planning/phases/01-portal-owned-identity-sessions/01-01-PLAN.md';

function artifact(
  body: string,
  kind = 'plan',
  path?: string,
): Pick<Artifact, 'kind' | 'body'> & Partial<Pick<Artifact, 'path'>> {
  return path === undefined ? { kind, body } : { kind, body, path };
}

function basePresentation(overrides: Partial<ProjectPresentation> = {}): ProjectPresentation {
  return {
    readAt: '2026-08-30T00:00:00.000Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'fixture',
    config: {},
    state: null,
    milestones: [],
    requirements: [],
    artifacts: [],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
    exclusions: [],
    ...overrides,
  };
}

const READ05_IDENTITY = { milestoneVersion: 'v1.0', number: '01', projectCode: null, slug: 'fixture' };
const READ05_ARTIFACT = '.planning/PROJECT.md';

function registryWithRead05(): ReferenceRegistry {
  const phaseKey = phaseKeyOf(READ05_IDENTITY);
  const phase: PhaseDto = {
    key: phaseKey,
    milestoneKey: `milestone:${READ05_IDENTITY.milestoneVersion}`,
    identity: READ05_IDENTITY,
    name: 'Fixture phase',
    dirPath: '.planning/phases/01-fixture',
    archived: false,
    goal: 'fixture goal',
    dependsOnRaw: null,
    requirementIds: ['READ-05'],
    requirementRefs: [{ raw: 'READ-05', targetRequirementId: 'READ-05' }],
    successCriteria: [],
    roadmapComplete: false,
    formalPlanProgress: { completed: 0, total: 1, sourcePath: '.planning/ROADMAP.md' },
    diskStatus: 'in_progress',
    plans: [
      {
        key: buildPlanUrl(READ05_IDENTITY, '01-01'),
        id: '01-01',
        phaseKey,
        planNumber: '01',
        path: '.planning/phases/01-fixture/01-01-PLAN.md',
        description: null,
        frontmatter: {},
        complete: false,
        summary: null,
        dependsOn: [],
        checkpoints: [],
      },
    ],
  };
  return buildReferenceRegistry(
    basePresentation({
      milestones: [
        {
          key: `milestone:${READ05_IDENTITY.milestoneVersion}`,
          version: READ05_IDENTITY.milestoneVersion,
          name: 'Fixture milestone',
          archived: false,
          phases: [phase],
        },
      ],
      requirements: [
        {
          id: 'READ-05',
          category: 'Reading',
          text: 'fixture requirement',
          tier: 'v1',
          checked: false,
          coveringPhases: [{ raw: 'Phase 01', targetPhaseKey: phaseKey }],
        },
      ],
      artifacts: [
        {
          key: `root:${READ05_ARTIFACT}`,
          path: READ05_ARTIFACT,
          kind: 'project',
          title: 'Project',
          location: 'root',
          frontmatter: {},
          structured: {},
          milestoneKey: null,
          phaseKey: null,
          warnings: [],
        },
      ],
    }),
  );
}

describe('unrecognised PLAN wrapper segmentation (G-01, G-11)', () => {
  it('renders wrappers the recognised set has never registered as labelled sections with markdown intact', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`<execution_context>
Plain prose inside a previously unrecognised wrapper.
</execution_context>

<read_first>
- first item
- second item
- third item
</read_first>

<scope_note>
Another previously unrecognised wrapper.
</scope_note>`),
    );

    expect(rendered.html).toContain('data-plan-section="execution_context"');
    expect(rendered.html).toContain('Execution Context');
    expect(rendered.html).toContain('data-plan-section="read_first"');
    expect(rendered.html).toContain('Read First');
    expect(rendered.html).toContain('data-plan-section="scope_note"');
    expect(rendered.html).toContain('Scope Note');

    const readFirstStart = rendered.html.indexOf('data-plan-section="read_first"');
    const readFirstSection = rendered.html.slice(
      readFirstStart,
      rendered.html.indexOf('</section>', readFirstStart),
    );
    expect(readFirstSection).toContain('<ul>');
    expect(readFirstSection.match(/<li>/g)).toHaveLength(3);

    // No HTML-escaped angle bracket sequence anywhere — every wrapper was consumed by the
    // segmenter, none fell through to literal markdown text.
    expect(rendered.html).not.toContain('&lt;');
    expect(rendered.html).not.toContain('&#x3C;');
  });

  it('produces zero renderer warnings mentioning "unclosed" for bare HTML void elements', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`<objective>Body with real HTML</objective>

A line break<br>and an image<img src="x">follow.`),
    );

    expect(rendered.warnings.some((warning) => warning.includes('unclosed'))).toBe(false);
  });

  it.runIf(existsSync(CORPUS_PLAN_PATH))(
    'renders the exact real GSD PLAN the UAT flagged with no literal wrapper text',
    async () => {
      const renderer = await createArtifactRenderer();
      const body = await readFile(CORPUS_PLAN_PATH, 'utf8');
      const rendered = await renderer.render(artifact(body.replace(/^---[\s\S]*?---\n/, '')));

      expect(rendered.html).not.toMatch(/&lt;\/?[a-z][\w-]*&gt;/i);
      expect(rendered.html).not.toMatch(/&#x3C;\/?[a-z][\w-]*&#x3E;/i);
    },
  );
});

describe('recognition decides presentation only (plan-segments.ts / markdown.ts contract)', () => {
  it('keeps the segmenter free of any recognised-set consultation', async () => {
    const source = await readFile('src/rendering/plan-segments.ts', 'utf8');
    const start = source.indexOf('export function segmentPlanBody');
    const bodyEnd = source.indexOf('\n}', start);
    const fnBody = source
      .slice(start, bodyEnd)
      .split('\n')
      .filter((line) => !/^\s*[/*]/.test(line))
      .join('\n');

    expect(fnBody).not.toContain('RECOGNIZED');
  });

  it('has the rendering layer branch on isRecognizedPlanTag', async () => {
    const source = await readFile('src/rendering/markdown.ts', 'utf8');
    expect(source.match(/isRecognizedPlanTag/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe('E15 state coverage — generic PLAN section shell', () => {
  it('empty: a whitespace-only wrapper body still renders its label and the empty-section marker', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(artifact('<scope_note>   \n\n  </scope_note>'));

    expect(rendered.html).toContain('data-plan-section="scope_note"');
    expect(rendered.html).toContain('plan-section-empty');
  });

  it('error: an unclosed wrapper still produces the warning aside, the literal raw block, and a recorded warning', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(artifact('<scope_note>never closed'));

    expect(rendered.html).toContain('plan-segment-warning');
    expect(rendered.html).toContain('plan-segment-literal');
    expect(rendered.warnings.some((warning) => warning.includes('unclosed'))).toBe(true);
  });

  it('adjacency: two wrappers touching with zero characters between them render as two distinct sections', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact('<a-tag>first</a-tag><b-tag>second</b-tag>'),
    );

    expect(rendered.html.match(/<section /g)).toHaveLength(2);
  });

  it('ordering: siblings emit in source order, and a same-start nested segment emits outermost-first', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`<alpha>one</alpha>
<beta>two</beta>
<gamma>three</gamma>
<outer><inner>nested</inner></outer>`),
    );

    const alphaIndex = rendered.html.indexOf('data-plan-section="alpha"');
    const betaIndex = rendered.html.indexOf('data-plan-section="beta"');
    const gammaIndex = rendered.html.indexOf('data-plan-section="gamma"');
    const outerIndex = rendered.html.indexOf('data-plan-section="outer"');
    const innerIndex = rendered.html.indexOf('data-plan-section="inner"');

    expect(alphaIndex).toBeGreaterThan(-1);
    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(betaIndex).toBeLessThan(gammaIndex);
    expect(outerIndex).toBeGreaterThan(-1);
    expect(outerIndex).toBeLessThan(innerIndex);
  });

  it('encoding: a section body with CJK text and a combining-mark sequence round-trips unchanged', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact('<scope_note>雪 결정 é́ combining marks</scope_note>'),
    );

    expect(rendered.html).toContain('雪 결정 é́ combining marks');
  });

  it('empty markdown structures: a header-only GFM table and an empty fenced block each render as their own element', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(
        `| Name | State |
| --- | --- |

\`\`\`
\`\`\`
`,
        'markdown',
      ),
    );

    expect(rendered.html).toContain('<table>');
    expect(rendered.html).toContain('<pre');
  });

  it('references: the reference-trigger element count equals references.length for a populated registry, and an unresolved mention produces none', async () => {
    const registry = registryWithRead05();
    const renderer = await createArtifactRenderer();
    const resolved = await renderer.render(
      artifact('See READ-05 for context.', 'markdown', READ05_ARTIFACT),
      { referenceRegistry: registry },
    );
    const unresolved = await renderer.render(
      artifact('BAD-99 has no registry match.', 'markdown', READ05_ARTIFACT),
      { referenceRegistry: registry },
    );

    expect(resolved.html.match(/data-reference-key=/g)?.length ?? 0).toBe(
      resolved.references?.length ?? 0,
    );
    expect(resolved.references?.length ?? 0).toBeGreaterThan(0);
    expect(unresolved.html.match(/data-reference-key=/g)).toBeNull();
    expect(unresolved.references).toBeUndefined();
  });

  it('zero-one-many: a body of only recognised wrappers is unaffected by this change', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(
        '<objective>Only recognised wrappers.</objective><task type="auto"><name>t</name></task>',
      ),
    );

    expect(rendered.html.match(/data-plan-section="objective"/g)).toHaveLength(1);
    expect(rendered.html.match(/data-plan-section="task"/g)).toHaveLength(1);
  });

  it('partial: recognised and unrecognised sections carry no attribute or class any stylesheet rule targets to distinguish them', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact('<objective>known</objective><scope_note>unknown</scope_note>'),
    );

    expect(rendered.html).toContain('data-plan-recognized="true"');
    expect(rendered.html).toContain('data-plan-recognized="false"');

    const css = await readFile('src/web/styles/globals.css', 'utf8');
    expect(css).not.toContain('data-plan-recognized');
  });
});

describe('identifier-edge detection (NAV-04 encoding)', () => {
  it('resolves an identifier adjacent to full-width CJK punctuation, but not one glued to an ASCII letter', async () => {
    const registry = registryWithRead05();
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact('（READ-05） resolves, but xREAD-05 does not.', 'markdown', READ05_ARTIFACT),
      { referenceRegistry: registry },
    );

    expect(rendered.html.match(/data-reference-key=/g)).toHaveLength(1);
    expect(rendered.html).toContain('xREAD-05');
  });
});

describe('locked syntax theme (G-06)', () => {
  it('loads and emits the vitesse-light / vitesse-dark theme pair, never the rejected github pair', async () => {
    const source = await readFile('src/rendering/markdown.ts', 'utf8');

    expect(source.match(/vitesse-light/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source.match(/vitesse-dark/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source.match(/github-light|github-dark/g)).toBeNull();

    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact('```typescript\nconst answer: number = 42\n```', 'markdown'),
    );

    expect(rendered.html).toContain('--shiki-light');
    expect(rendered.html).toContain('--shiki-dark');
  });
});

describe('nested PLAN section ordinals (F8)', () => {
  it('numbers each section by its dotted position among its siblings', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`<objective>
First.
</objective>

<tasks>
<task>
<name>
Alpha.
</name>
<verify>
Check alpha.
</verify>
</task>
<task>
<name>
Beta.
</name>
</task>
</tasks>`),
    );

    // Top level counts 1..n; depth appends, so a reader can tell 2.1.2 from 2.2.
    expect(rendered.html).toContain('data-plan-ordinal="1"');
    expect(rendered.html).toContain('data-plan-ordinal="2"');
    expect(rendered.html).toContain('data-plan-ordinal="2.1"');
    expect(rendered.html).toContain('data-plan-ordinal="2.1.1"');
    expect(rendered.html).toContain('data-plan-ordinal="2.1.2"');
    expect(rendered.html).toContain('data-plan-ordinal="2.2"');
    expect(rendered.html).toContain('<span class="plan-section-ordinal">2.1.2</span>');

    // Every section carries one, so the cue never goes missing partway down a plan.
    const sections = rendered.html.match(/<section class="plan-section /g) ?? [];
    const ordinals = rendered.html.match(/data-plan-ordinal="/g) ?? [];
    expect(ordinals).toHaveLength(sections.length);
  });
});
