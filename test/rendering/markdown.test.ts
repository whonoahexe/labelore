import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../src/domain/model.ts';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { artifactTokenOf, buildPlanUrl } from '../../src/presentation/routes.ts';
import { buildFrontmatterPanels } from '../../src/rendering/frontmatter-views.ts';
import { createArtifactRenderer } from '../../src/rendering/markdown.ts';
import { buildArtifactIndex } from '../../src/server/artifact-index.ts';
import { createApp } from '../../src/server/index.ts';

const ROOT = '/project';

function artifact(body: string, kind = 'markdown'): Pick<Artifact, 'kind' | 'body'> {
  return { kind, body };
}

describe('safe Markdown rendering', () => {
  it('returns an honest empty state and uses the generic Markdown path for open artifact kinds', async () => {
    const renderer = await createArtifactRenderer();
    const empty = await renderer.render(artifact('', 'future-kind'));
    const open = await renderer.render(
      artifact('## Future body\n\nStill readable.', 'future-kind'),
    );

    expect(empty).toEqual({ html: '', headings: [], warnings: [], empty: true });
    expect(open.empty).toBe(false);
    expect(open.html).toContain('<h2 id="future-body">');
    expect(open.html).toContain('Still readable.');
  });

  it('preserves adjacent GFM blocks and rows in source order with dual-theme highlighting', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`| Name | State |
| --- | --- |
| first | ready |
| second | waiting |
- [x] checked
- [ ] open
> quoted
\`\`\`ts
const answer: number = 42
\`\`\``),
    );

    expect(rendered.html).toContain('<table>');
    expect(rendered.html.indexOf('first')).toBeLessThan(rendered.html.indexOf('second'));
    expect(rendered.html.indexOf('</table>')).toBeLessThan(rendered.html.indexOf('task-list-item'));
    expect(rendered.html.indexOf('task-list-item')).toBeLessThan(
      rendered.html.indexOf('<blockquote>'),
    );
    expect(rendered.html.indexOf('<blockquote>')).toBeLessThan(rendered.html.indexOf('shiki'));
    expect(rendered.html).toContain('--shiki-light');
    expect(rendered.html).toContain('--shiki-dark');
  });

  it('adds stable deep-link anchors to authored requirement definitions', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact('- [ ] **READ-01**: Render the full document\n- **FUTURE-02**: Keep this readable'),
    );

    expect(rendered.html).toMatch(/<li[^>]*id="requirement-read-01"/);
    expect(rendered.html).toMatch(/<li[^>]*id="requirement-future-02"/);
  });

  it('renders the real Phase 1 plan as ordered semantic sections with nested Markdown', async () => {
    const renderer = await createArtifactRenderer();
    const body = await readFile(
      '.planning/phases/01-read-layer-domain-model/01-04-PLAN.md',
      'utf8',
    );
    const rendered = await renderer.render(artifact(body.replace(/^---[\s\S]*?---\n/, ''), 'plan'));

    expect(rendered.html).toContain('data-plan-section="objective"');
    expect(rendered.html).toContain('data-plan-section="task"');
    expect(rendered.html).toContain('Task 1: Eager cross-reference resolution');
    expect(rendered.html).toContain('<ul>');
    expect(rendered.warnings).toEqual([]);
  });

  it('keeps empty wrappers semantic and degrades malformed wrappers locally as literal text', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(
        `<objective></objective>
<task type="auto"><name>Good task</name></task>
<verify>broken
<done>Still visible</done>`,
        'plan',
      ),
    );

    expect(rendered.html).toContain('data-plan-section="objective"');
    expect(rendered.html).toContain('plan-section-empty');
    expect(rendered.html).toContain('&lt;verify&gt;broken');
    expect(rendered.html).toContain('Still visible');
    expect(rendered.warnings.some((warning) => warning.includes('unclosed'))).toBe(true);
  });

  it('preserves Unicode and allowlisted attributes while fenced pseudo-tags remain code', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(
        `<task type="checkpoint:human-verify" gate="blocking-human" tdd="true">
<name>検証 🧭</name>
**深い** 内容
</task>

\`\`\`xml
<task type="auto"><name>not semantic</name></task>
\`\`\``,
        'plan',
      ),
    );

    expect(rendered.html).toContain('検証 🧭');
    expect(rendered.html).toContain('<strong>深い</strong>');
    expect(rendered.html).toContain('data-plan-type="checkpoint:human-verify"');
    expect(rendered.html).toContain('data-plan-gate="blocking-human"');
    expect(rendered.html.match(/data-plan-section="task"/g)).toHaveLength(1);
    expect(rendered.html).toContain('&#x3C;');
    expect(rendered.html).toContain('not semantic');
  });

  it('removes active content and source-authored post-sanitize attributes', async () => {
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render(
      artifact(`<ScRiPt>alert(1)</ScRiPt>
<img src=x oNeRrOr="alert(2)">
<a href="JaVaScRiPt:alert(3)" onclick="alert(4)">unsafe</a>
<a href="&#x6a;avascript:alert(5)">encoded</a>
<iframe srcdoc="<script>alert(6)</script>"></iframe>
<svg onload="alert(7)"><script>alert(8)</script></svg>
<math><mtext href="data:text/html,boom">math</mtext></math>
<p style="background:url(javascript:alert(9))">styled source</p>`),
    );

    expect(rendered.html).not.toMatch(/<script|<iframe|<svg|<math/i);
    expect(rendered.html).not.toMatch(/onerror|onclick|onload|javascript:|data:text\/html|srcdoc/i);
    expect(rendered.html).not.toContain('background:url');
    expect(rendered.html).toContain('unsafe');
    expect(rendered.html).toContain('styled source');
  });

  it('emits only bounded valid Mermaid sources as dormant strict browser targets', async () => {
    const renderer = await createArtifactRenderer();
    const valid = await renderer.render(artifact('```mermaid\nflowchart TD\n  A --> B\n```'));
    const invalid = await renderer.render(artifact('```mermaid\nthis is not a diagram\n```'));
    const oversized = await renderer.render(
      artifact(`\`\`\`mermaid\nflowchart TD\n${'A-->B\n'.repeat(50_000)}\`\`\``),
    );

    expect(valid.html).toContain('data-mermaid-pending="true"');
    expect(valid.html).toContain('flowchart TD');
    expect(invalid.html).not.toContain('data-mermaid-pending="true"');
    expect(invalid.html).toContain('this is not a diagram');
    expect(invalid.warnings.some((warning) => warning.includes('Mermaid'))).toBe(true);
    expect(oversized.html).not.toContain('data-mermaid-pending="true"');
    expect(oversized.warnings.some((warning) => warning.includes('256 KiB'))).toBe(true);
  });

  it('assigns deterministic duplicate-safe heading IDs and dormant adjacent copy controls', async () => {
    const renderer = await createArtifactRenderer();
    const first = await renderer.render(artifact('# Repeat\n\n## Repeat\n\n# Repeat'));
    const second = await renderer.render(artifact('# Repeat\n\n## Repeat\n\n# Repeat'));

    expect(first.headings.map((heading) => heading.id)).toEqual(['repeat', 'repeat-1', 'repeat-2']);
    expect(second).toEqual(first);
    expect(first.html).toContain('data-heading-id="repeat"');
    expect(first.html).toContain('data-heading-id="repeat-1"');
    expect(first.html).not.toContain('autofocus');
  });
});

describe('structured frontmatter views', () => {
  it('places guarded known panels before an unconditional generic remainder', () => {
    const panels = buildFrontmatterPanels({
      phase: '02-reader',
      must_haves: { truths: ['Body remains visible'], artifacts: [] },
      coverage: [{ id: 'D1', human_judgment: false }],
      key_links: [{ from: 'renderer', to: 'mount', via: 'sanitized HTML' }],
      progress: { completed: 2, total: 4 },
      future_shape: { nested: ['<script>text only</script>', { enabled: true }] },
    });

    expect(panels.map((panel) => [panel.key, panel.presentation])).toEqual([
      ['must_haves', 'known'],
      ['coverage', 'known'],
      ['key_links', 'known'],
      ['progress', 'known'],
      ['phase', 'generic'],
      ['future_shape', 'generic'],
    ]);
    expect(JSON.stringify(panels)).toContain('<script>text only</script>');
  });

  it('routes empty and wrong-shaped known values through the generic recursive view', () => {
    const panels = buildFrontmatterPanels({
      must_haves: 'future syntax',
      coverage: [],
      key_links: null,
      progress: {},
    });

    expect(panels).toHaveLength(4);
    expect(panels.every((panel) => panel.presentation === 'generic')).toBe(true);
    expect(panels.map((panel) => panel.key)).toEqual([
      'must_haves',
      'coverage',
      'key_links',
      'progress',
    ]);
  });
});

describe('document-first browser contract', () => {
  it('keeps one finalized HTML mount and strict manual Mermaid execution activation-only', async () => {
    const source = await readFile('src/web/pages/artifact-page.tsx', 'utf8');

    expect(source.match(/dangerouslySetInnerHTML/g)).toHaveLength(1);
    expect(source).toContain('__html: document.html');
    expect(source).toContain("securityLevel: 'strict'");
    expect(source).toContain('startOnLoad: false');
    expect(source).toContain('mermaid.parse(source, { suppressErrors: false })');
    expect(source).toContain('mermaid.run({ nodes: [node], suppressErrors: false })');
    expect(source).toContain('querySelectorAll<HTMLElement>(\'[data-mermaid-pending="true"]\')');
    expect(source).toContain("querySelectorAll<HTMLButtonElement>('[data-heading-id]')");
    expect(source).toContain("addEventListener('click'");
    expect(source).not.toMatch(/addEventListener\(['"]scroll/);
  });
});

describe('snapshot-only artifact lookup', () => {
  it('resolves canonical paths only from the immutable index and returns typed misses', async () => {
    const repository = new PlanningRepository(
      new InMemoryPlanningFilesystem({
        '.planning/PROJECT.md': '# Indexed project',
        '.planning/phases/01-safe/01-01-PLAN.md': '<objective>Indexed plan</objective>',
      }),
      ROOT,
    );
    const snapshot = await repository.load();
    const index = buildArtifactIndex(snapshot);

    const found = index.lookup('.planning/phases/01-safe/01-01-PLAN.md');
    const traversal = index.lookup('../../etc/passwd');

    expect(found).toMatchObject({ found: true, artifact: { kind: 'plan' } });
    expect(traversal).toEqual({
      found: false,
      status: 'not-found',
      artifactPath: '../../etc/passwd',
      warning: 'Artifact is not present in the loaded project snapshot.',
    });
  });

  it('serves finalized documents from the artifact API and fails closed for traversal tokens', async () => {
    const repository = new PlanningRepository(
      new InMemoryPlanningFilesystem({
        '.planning/PROJECT.md': '# API project',
        '.planning/phases/01-safe/01-01-PLAN.md': '<objective>API plan</objective>',
      }),
      ROOT,
    );
    await repository.load();
    const app = createApp(repository);
    const artifactPath = '.planning/phases/01-safe/01-01-PLAN.md';
    const snapshot = repository.getSnapshot();
    const phase = snapshot.project?.phases[0];
    const plan = phase?.plans[0];
    if (!phase || !plan) throw new Error('Fixture plan was not assembled');

    const response = await app.request(`/api/artifacts/${artifactTokenOf(artifactPath)}`);
    const canonical = await app.request(
      `/api/documents?route=${encodeURIComponent(buildPlanUrl(phase.identity, plan.id))}`,
    );
    const missing = await app.request(`/api/artifacts/${artifactTokenOf('../../etc/passwd')}`);
    const malformed = await app.request('/api/artifacts/not-a-token');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'found',
      artifact: { path: artifactPath, kind: 'plan' },
      document: { empty: false },
    });
    expect(canonical.status).toBe(200);
    expect(await canonical.json()).toMatchObject({
      status: 'found',
      artifact: { path: artifactPath, kind: 'plan' },
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      status: 'not-found',
      artifactPath: '../../etc/passwd',
    });
    expect(malformed.status).toBe(404);
    expect(await malformed.json()).toMatchObject({ status: 'not-found' });
  });
});
