// Phase 11 (11-22, VIEW-15, T-11-36): the seed and thread links context. A seed's Breadcrumbs and a thread's
// References are resolved to payload artifact addresses on the server; only a path that names a payload artifact gets
// an address, and nothing built from author text is ever one. Over the made-up Lendshed project loaded through the
// repository, plus planted copies for the path shapes the fixtures lack.
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildSeedThreadLinks, splitLinkText } from '../../src/presentation/seed-thread-links.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

const SEED = '.planning/seeds/SEED-260304-k7q-shed-capacity-alerts.md';
const THREAD = '.planning/threads/loan-limit-policy.md';

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

/** A copy whose seed carries exactly these breadcrumb bullets. */
function withCrumbs(presentation: ProjectPresentation, crumbs: string[]): ProjectPresentation {
  return planted(presentation, (copy) => {
    const seed = copy.artifacts.find((artifact) => artifact.path === SEED)!;
    (seed.structured.seed as { breadcrumbs: string[] }).breadcrumbs = crumbs;
  });
}

describe('splitLinkText', () => {
  it('reads the backticked path and the words after the dash', () => {
    expect(splitLinkText('`.planning/ROADMAP.md` — the v1.0 transfer phase')).toEqual({
      path: '.planning/ROADMAP.md',
      description: 'the v1.0 transfer phase',
    });
  });

  it('reads a bare path before an em dash, and a bare path alone', () => {
    expect(splitLinkText('docs/regions.md — which regions')).toEqual({
      path: 'docs/regions.md',
      description: 'which regions',
    });
    expect(splitLinkText('PROJECT.md')).toEqual({ path: 'PROJECT.md', description: null });
  });

  it('reads prose as no path at all', () => {
    expect(splitLinkText('Steward desk request from the March sync, no ticket number')).toEqual({
      path: null,
      description: null,
    });
    expect(splitLinkText('')).toEqual({ path: null, description: null });
  });
});

describe('buildSeedThreadLinks: Lendshed seeds', () => {
  it("gives SEED-260304's resolving breadcrumb its address and the other two none", async () => {
    const links = buildSeedThreadLinks(await lendshed(), SEED)!;
    expect(links.kind).toBe('seed');
    expect(links.references).toEqual([]);
    expect(links.breadcrumbs).toHaveLength(3);
    expect(links.breadcrumbs[0]!.path).toBe('.planning/ROADMAP.md');
    expect(links.breadcrumbs[0]!.url).toBe('/roadmap');
    expect(links.breadcrumbs[0]!.description).toBe('the v1.0 transfer phase this idea grew out of');
    expect(links.breadcrumbs[1]).toMatchObject({ path: 'frontend/app/globals.css', url: null });
    expect(links.breadcrumbs[2]).toMatchObject({ path: 'frontend/app/stock-alerts.tsx', url: null });
  });

  it('carries the day the project was read, so the page never counts to the browser clock', async () => {
    const presentation = await lendshed();
    expect(buildSeedThreadLinks(presentation, SEED)!.readAt).toBe(presentation.readAt);
  });

  it('gives a seed with no breadcrumbs an empty list, never null', async () => {
    const links = buildSeedThreadLinks(await lendshed(), '.planning/seeds/SEED-003-paper-forms.md')!;
    expect(links.breadcrumbs).toEqual([]);
  });
});

describe('buildSeedThreadLinks: Lendshed threads', () => {
  it("gives loan-limit-policy's resolvable reference its address and its prose reference none", async () => {
    const links = buildSeedThreadLinks(await lendshed(), THREAD)!;
    expect(links.kind).toBe('thread');
    expect(links.breadcrumbs).toEqual([]);
    expect(links.references).toHaveLength(2);
    expect(links.references[0]!.path).toBe('.planning/PROJECT.md');
    expect(links.references[0]!.url).toBe('/project');
    expect(links.references[1]).toMatchObject({
      path: null,
      description: null,
      url: null,
      text: 'Steward desk request from the March sync, no ticket number',
    });
  });
});

describe('buildSeedThreadLinks: path shapes', () => {
  it('resolves a path exactly, under .planning/, and by a unique bare file name', async () => {
    const links = buildSeedThreadLinks(
      withCrumbs(await lendshed(), [
        '`.planning/ROADMAP.md`',
        '`ROADMAP.md`',
        '`./.planning/PROJECT.md` — with a leading dot slash',
        '`PROJECT.md#core-value` — with an anchor',
      ]),
      SEED,
    )!;
    expect(links.breadcrumbs.map((link) => link.url)).toEqual(['/roadmap', '/roadmap', '/project', '/project']);
  });

  it('never resolves a path that climbs out of the project, starts at the root or is not an artifact', async () => {
    const links = buildSeedThreadLinks(
      withCrumbs(await lendshed(), [
        '`../.planning/ROADMAP.md`',
        '`/etc/passwd`',
        '`.planning/nope.md`',
        '`.planning\\ROADMAP.md`',
        '`.planning/../.planning/ROADMAP.md`',
      ]),
      SEED,
    )!;
    expect(links.breadcrumbs.map((link) => link.url)).toEqual([null, null, null, null, null]);
  });

  it('names no artifact for a bare file name two artifacts share', async () => {
    const links = buildSeedThreadLinks(withCrumbs(await lendshed(), ['`CONTEXT.md`']), SEED)!;
    expect(links.breadcrumbs[0]!.url).toBeNull();
  });

  it('returns null for a path that is not a seed or a thread, and never throws on a broken presentation', async () => {
    const presentation = await lendshed();
    expect(buildSeedThreadLinks(presentation, '.planning/ROADMAP.md')).toBeNull();
    expect(buildSeedThreadLinks(presentation, '.planning/seeds/missing.md')).toBeNull();
    expect(buildSeedThreadLinks({ artifacts: null } as unknown as ProjectPresentation, SEED)).toBeNull();
    const stripped = planted(presentation, (copy) => {
      copy.artifacts.find((artifact) => artifact.path === SEED)!.structured = {};
    });
    expect(buildSeedThreadLinks(stripped, SEED)).toBeNull();
  });
});
