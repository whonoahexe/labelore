// NAV-09: the project slug is derived once on the server (slugOf), shares its reserved words with
// the server's routing split, and reaches the web on the presentation payload.
import { describe, expect, it } from 'vitest';
import { RESERVED_SLUGS, SERVER_OWNED_PREFIXES, isServerOwnedUrl } from '../../src/presentation/reserved.ts';
import { SLUG_PATTERN, allocateSlug, isValidSlug, slugOf } from '../../src/presentation/project-slug.ts';
import { createApp, routesToApp } from '../../src/server/index.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

describe('slugOf', () => {
  it.each([
    ['/home/user/labelore', 'labelore'],
    ['/x/My Project.v2', 'my-project-v2'],
    ['/x/kilnrow/.planning', 'kilnrow'],
    ['user@host:/srv/kiln row', 'kiln-row'],
    ['/x/Über', 'uber'],
    ['/x/Crème Brûlée', 'creme-brulee'],
    ['C:\\work\\Kiln Row', 'kiln-row'],
    ['/x/--a__b--', 'a-b'],
    ['/x/kilnrow/', 'kilnrow'],
  ])('turns %j into %j', (rootPath, slug) => {
    expect(slugOf(rootPath)).toBe(slug);
  });

  it.each(['', '/', '/x/!!!', '/x/日本語', '/.planning', '.planning'])(
    'never answers empty: %j is "project"',
    (rootPath) => {
      expect(slugOf(rootPath)).toBe('project');
    },
  );

  it('gives every reserved word used as a folder name the -project suffix', () => {
    expect(RESERVED_SLUGS.size).toBeGreaterThan(0);
    for (const word of RESERVED_SLUGS) {
      expect(slugOf(`/work/${word}`)).toBe(`${word}-project`);
      expect(slugOf(`/work/${word.toUpperCase()}/.planning`)).toBe(`${word}-project`);
    }
  });

  it('keeps a reserved word that only appears inside a longer name', () => {
    expect(slugOf('/work/api-gateway')).toBe('api-gateway');
    expect(slugOf('/work/docs2')).toBe('docs2');
  });

  it('never answers a slug that the server would own', () => {
    for (const prefix of SERVER_OWNED_PREFIXES) {
      const word = prefix.replaceAll('/', '');
      expect(slugOf(`/work/${word}`)).not.toBe(word);
    }
  });
});

describe('allocateSlug', () => {
  it('answers the base when it is free', () => {
    expect(allocateSlug('portal', new Set())).toBe('portal');
    expect(allocateSlug('portal', new Set(['other']))).toBe('portal');
  });

  it('answers base-2 when the base is taken', () => {
    expect(allocateSlug('portal', new Set(['portal']))).toBe('portal-2');
  });

  it('answers base-3 when the base and base-2 are taken', () => {
    expect(allocateSlug('portal', new Set(['portal', 'portal-2']))).toBe('portal-3');
  });

  it('fills a gap left by a forgotten project', () => {
    expect(allocateSlug('portal', new Set(['portal', 'portal-3']))).toBe('portal-2');
  });
});

describe('isValidSlug', () => {
  it.each(['Portal', 'a--b', '-a', 'a-', 'api', 'settings', '', 'a b', 'ü'])('rejects %j', (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });

  it.each(['portal', 'portal-2', 'a1', 'api-gateway'])('accepts %j', (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it('exports the pattern the check uses', () => {
    expect(SLUG_PATTERN.test('portal-2')).toBe(true);
    expect(SLUG_PATTERN.test('Portal')).toBe(false);
  });
});

describe('routesToApp - the one reserved-word constant', () => {
  it('sends the API and the sketch files to the app and everything else to Vite', () => {
    expect(routesToApp('/api/x')).toBe(true);
    expect(routesToApp('/sketches/a')).toBe(true);
    expect(routesToApp('/lendshed/sketches')).toBe(false);
    expect(routesToApp('/sketches')).toBe(false);
    expect(routesToApp('/lendshed')).toBe(false);
    expect(routesToApp(undefined)).toBe(false);
  });

  it('agrees with isServerOwnedUrl', () => {
    for (const url of ['/api/presentation', '/sketches/001/x.html', '/', '/api', '/src/main.tsx']) {
      expect(routesToApp(url)).toBe(isServerOwnedUrl(url));
    }
  });
});

describe('/api/presentation carries the slug', () => {
  it('answers projectSlug lendshed for the Lendshed fixture', async () => {
    const { snapshot } = await loadFixtureProject();
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const response = await app.request('/api/presentation');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { projectSlug: string };
    expect(body.projectSlug).toBe('lendshed');
  });

  it('answers a slug for a source with no project loaded', async () => {
    const { snapshot } = await loadFixtureProject();
    const app = createApp({ getSnapshot: () => ({ ...snapshot, project: null }) }, true, '.');
    const body = (await (await app.request('/api/presentation')).json()) as { projectSlug: string };
    expect(body.projectSlug).toBe('lendshed');
  });
});
