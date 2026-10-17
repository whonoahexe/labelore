// quick-261017-k44: the REVIEW page's server join. buildReviewContext attaches the ROADMAP phase name
// and the sibling REVIEW-FIX (path, in-app URL, fix-run frontmatter, parsed report) to a review from
// the cached presentation alone; the served document carries it for a review and null for any other
// document. The fixtures are in-memory projects holding sideby phase 2's real review pair.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildReviewContext } from '../../src/presentation/review-context.ts';
import type { ReviewContext } from '../../src/presentation/review-context.ts';
import { buildReferenceRegistry } from '../../src/presentation/references.ts';
import { createApp } from '../../src/server/index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composeReviewThreads } from '../../src/web/views/review-threads.ts';
import { ReviewThreadsView } from '../../src/web/views/review-threads-components.tsx';

const ROOT = '/project';
const DIR = '.planning/phases/02-container-docs';
const REVIEW = `${DIR}/02-REVIEW.md`;
const FIX = `${DIR}/02-REVIEW-FIX.md`;
const FIXTURES = new URL('../fixtures/review/', import.meta.url).pathname;

const ROADMAP = `# Roadmap: Demo

## Phases

### Phase 2: Container & Docs
**Goal**: Ship the container
**Plans**: 1 plan

Plans:
- [ ] 02-01: Dockerfile
`;

function fixture(name: string): string {
  return readFileSync(`${FIXTURES}${name}`, 'utf8');
}

function pairFiles(): Record<string, string> {
  return {
    '.planning/ROADMAP.md': ROADMAP,
    [REVIEW]: fixture('sb02-REVIEW.md'),
    [FIX]: fixture('sb02-REVIEW-FIX.md'),
  };
}

async function presentationOf(files: Record<string, string>): Promise<ProjectPresentation> {
  return toProjectPresentation(await new PlanningRepository(new InMemoryPlanningFilesystem(files), ROOT).load());
}

describe('buildReviewContext', () => {
  it('joins the sibling REVIEW-FIX: path, url, fix-run frontmatter and the parsed report', async () => {
    const presentation = await presentationOf(pairFiles());
    const context = buildReviewContext(presentation, buildReferenceRegistry(presentation), REVIEW);
    expect(context.phaseName).toBe('Container & Docs');
    const key = presentation.artifacts.find((a) => a.path === FIX)?.key;
    expect(context.fix?.path).toBe(FIX);
    expect(context.fix?.url).toBe(key);
    expect(context.fix?.frontmatter).toMatchObject({
      status: 'partial',
      iteration: 1,
      findings_in_scope: 7,
      fixed: 4,
      skipped: 3,
      fix_scope: null,
    });
    expect(context.fix?.report?.entries).toHaveLength(7);
  });

  it('gives fix: null when there is no sibling, and null context fields on a non-review path', async () => {
    const files = pairFiles();
    delete files[FIX];
    const presentation = await presentationOf(files);
    const registry = buildReferenceRegistry(presentation);
    expect(buildReviewContext(presentation, registry, REVIEW).fix).toBeNull();
    expect(buildReviewContext(presentation, registry, REVIEW).phaseName).toBe('Container & Docs');
    expect(buildReviewContext(presentation, registry, '.planning/ROADMAP.md')).toEqual({ phaseName: null, fix: null });
    expect(buildReviewContext(presentation, registry, `${DIR}/nope-REVIEW.md`)).toEqual({ phaseName: null, fix: null });
  });

  it('ignores the REVIEW-FIX review_path and matches the sibling by exact path only', async () => {
    const files = pairFiles();
    // A fix report in another directory that names this review in its frontmatter is not a sibling.
    files['.planning/phases/03-other/03-REVIEW-FIX.md'] = fixture('sb02-REVIEW-FIX.md');
    delete files[FIX];
    const presentation = await presentationOf(files);
    expect(buildReviewContext(presentation, buildReferenceRegistry(presentation), REVIEW).fix).toBeNull();
  });

  it('never throws on junk presentation data', () => {
    const junk = [null, undefined, {}, { artifacts: 3 }, { artifacts: [null, { path: REVIEW, kind: 'review' }], milestones: 'x' }];
    for (const presentation of junk) {
      expect(() =>
        buildReviewContext(presentation as unknown as ProjectPresentation, { artifactPreviews: new Map() } as never, REVIEW),
      ).not.toThrow();
    }
  });
});

interface DocumentPayload {
  artifact: { frontmatter: Record<string, unknown>; structured: Record<string, unknown> };
  reviewContext: ReviewContext | null;
}

describe('served end to end', () => {
  it('serves the context on the review, null on its fix report and composes the page from it', async () => {
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(pairFiles()), ROOT).load();
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const key = (path: string): string => {
      const dto = presentation.artifacts.find((artifact) => artifact.path === path);
      if (!dto) throw new Error(`no artifact ${path}`);
      return dto.key;
    };
    const documentOf = async (path: string): Promise<DocumentPayload> =>
      (await (await app.request(`/api/documents?route=${encodeURIComponent(key(path))}`)).json()) as DocumentPayload;

    const served = await documentOf(REVIEW);
    expect(served.reviewContext).toEqual(
      JSON.parse(JSON.stringify(buildReviewContext(presentation, buildReferenceRegistry(presentation), REVIEW))),
    );
    expect(served.reviewContext?.fix?.url).toBe(key(FIX));
    expect((await documentOf(FIX)).reviewContext).toBeNull();

    const input: ViewInput = {
      kind: 'review',
      frontmatter: served.artifact.frontmatter,
      structured: served.artifact.structured,
      groups: [],
      planSegments: [],
      headings: [],
      reviewContext: served.reviewContext,
    };
    const model = composeReviewThreads(input);
    expect(model).not.toBeNull();
    const render = (initialUnfolded: string[] = []): string =>
      renderToStaticMarkup(
        createElement(
          MemoryRouter,
          null,
          createElement(ReviewThreadsView, {
            model: model!,
            fallbackTitle: 'Review',
            path: REVIEW,
            mode: 'view',
            onModeChange: () => undefined,
            onShowSource: () => undefined,
            chip: null,
            initialUnfolded,
          }),
        ),
      );
    const markup = render();
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain('Container &amp; Docs');
    expect(markup).toContain('4 of 10 fixed.');
    expect(markup).toContain('6 still in the code');
    for (const id of ['CR-01', 'CR-02', 'CR-03']) {
      const row = markup.match(new RegExp(`<button[^>]*view-review-resolved[^>]*>(?:(?!</button>)[\\s\\S])*${id}[\\s\\S]*?</button>`));
      expect(row?.[0]).toContain('Fixed');
    }
    expect(markup).toContain('fea7e47');
    expect(markup).toContain('77a459a');
    expect(markup).toContain('d1c6017');
    expect(markup).toContain('Skipped on purpose');
    expect(markup).toContain('Intentionally skipped');
    expect(markup).toContain('Not attempted');
    const unfolded = render(['CR-01']);
    expect(unfolded).toContain('Fixed in fea7e47');
    expect(unfolded).toContain('Suggested change');
    expect(unfolded).toContain('Fold −');
  });
});
