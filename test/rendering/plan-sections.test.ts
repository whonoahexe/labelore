import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../src/domain/model.ts';
import { createArtifactRenderer } from '../../src/rendering/markdown.ts';

const CORPUS_PLAN_PATH =
  process.env.GSD_LORE_CORPUS ??
  '/home/cinedise/studio-portal/.planning/phases/01-portal-owned-identity-sessions/01-01-PLAN.md';

function artifact(body: string, kind = 'plan'): Pick<Artifact, 'kind' | 'body'> {
  return { kind, body };
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
