// NAV-09: the pure slug helpers behind src/web/nav.tsx and the project layout.
import { describe, expect, it } from 'vitest';
import {
  decodeAddress,
  projectLayoutOutcome,
  projectRootPath,
  splitProjectPath,
  withProjectSlug,
} from '../../src/web/project-path.ts';

describe('withProjectSlug', () => {
  it('leaves the target alone when there is no slug', () => {
    expect(withProjectSlug(null, '/roadmap')).toBe('/roadmap');
    expect(withProjectSlug(null, '/')).toBe('/');
  });

  it('maps the root to the project root', () => {
    expect(withProjectSlug('kilnrow', '/')).toBe('/kilnrow');
  });

  it('puts the slug in front of a project-relative path, keeping query and hash', () => {
    expect(withProjectSlug('kilnrow', '/roadmap')).toBe('/kilnrow/roadmap');
    expect(withProjectSlug('kilnrow', '/search?q=glaze')).toBe('/kilnrow/search?q=glaze');
    expect(withProjectSlug('kilnrow', '/milestones/m~v1/phases/x#top')).toBe(
      '/kilnrow/milestones/m~v1/phases/x#top',
    );
    expect(withProjectSlug('kilnrow', '/?q=1')).toBe('/kilnrow?q=1');
    expect(withProjectSlug('kilnrow', '/#a')).toBe('/kilnrow#a');
  });

  it('collapses a protocol-relative or backslash target to the dashboard (T-07-07)', () => {
    expect(withProjectSlug('kilnrow', '//evil.example/x')).toBe('/kilnrow');
    expect(withProjectSlug('kilnrow', '/\\evil.example')).toBe('/kilnrow');
    expect(withProjectSlug('kilnrow', '//')).toBe('/kilnrow');
  });

  it('collapses a target that does not start with a slash to the dashboard', () => {
    expect(withProjectSlug('kilnrow', 'roadmap')).toBe('/kilnrow');
    expect(withProjectSlug('kilnrow', 'https://evil.example')).toBe('/kilnrow');
    expect(withProjectSlug('kilnrow', '')).toBe('/kilnrow');
  });
});

describe('splitProjectPath', () => {
  it('splits the first raw segment from the rest', () => {
    expect(splitProjectPath('/kilnrow/roadmap')).toEqual({ first: 'kilnrow', rest: '/roadmap' });
    expect(splitProjectPath('/kilnrow/a/b/c')).toEqual({ first: 'kilnrow', rest: '/a/b/c' });
  });

  it('answers "/" as the rest when only the slug is present', () => {
    expect(splitProjectPath('/kilnrow')).toEqual({ first: 'kilnrow', rest: '/' });
    expect(splitProjectPath('/kilnrow/')).toEqual({ first: 'kilnrow', rest: '/' });
  });

  it('answers an empty first segment for the root', () => {
    expect(splitProjectPath('/')).toEqual({ first: '', rest: '/' });
    expect(splitProjectPath('')).toEqual({ first: '', rest: '/' });
  });

  it('keeps the remainder raw', () => {
    expect(splitProjectPath('/kilnrow/artifacts/a~x%2Fy')).toEqual({
      first: 'kilnrow',
      rest: '/artifacts/a~x%2Fy',
    });
  });
});

describe('decodeAddress', () => {
  it('decodes each segment once', () => {
    expect(decodeAddress('/kilnrow/file/notes%20and%20more.md')).toBe('/kilnrow/file/notes and more.md');
    expect(decodeAddress('/kilnrow/%E6%97%A5')).toBe('/kilnrow/日');
  });

  it('decodes only once', () => {
    expect(decodeAddress('/a/%2541')).toBe('/a/%41');
  });

  it('keeps a segment that fails to decode raw and still decodes the others', () => {
    expect(decodeAddress('/kilnrow/100%/a%20b')).toBe('/kilnrow/100%/a b');
  });

  it('keeps an encoded slash inside its segment, as a character', () => {
    expect(decodeAddress('/a/b%2Fc')).toBe('/a/b/c');
  });

  it('leaves the root alone', () => {
    expect(decodeAddress('/')).toBe('/');
  });
});

describe('projectRootPath', () => {
  it('is the slug under a slash when it is a valid slug, else the landing page', () => {
    expect(projectRootPath('kilnrow')).toBe('/kilnrow');
    expect(projectRootPath('API')).toBe('/');
    expect(projectRootPath('//evil')).toBe('/');
    expect(projectRootPath('')).toBe('/');
  });
});

describe('projectLayoutOutcome', () => {
  const list = [{ slug: 'kilnrow' }, { slug: 'lendshed' }];
  const ok = { loadStatus: { status: 'ok' } };
  const missing = { loadStatus: { status: 'missing' } };

  it.each([
    ['kilnrow', 'pending', undefined, 'pending', undefined, 'loading-list'],
    ['kilnrow', 'success', undefined, 'pending', undefined, 'loading-list'],
    ['kilnrow', 'error', undefined, 'pending', undefined, 'list-error'],
    ['other', 'success', list, 'pending', undefined, 'unknown'],
    ['', 'success', list, 'pending', undefined, 'unknown'],
    ['Kilnrow', 'success', list, 'pending', undefined, 'unknown'],
    ['kilnrow ', 'success', list, 'pending', undefined, 'unknown'],
    ['kilnrow', 'success', [], 'pending', undefined, 'unknown'],
    ['kilnrow', 'success', list, 'pending', undefined, 'opening'],
    ['kilnrow', 'success', list, 'success', undefined, 'opening'],
    ['kilnrow', 'success', list, 'error', undefined, 'presentation-error'],
    ['kilnrow', 'success', list, 'success', missing, 'invalid'],
    ['kilnrow', 'success', list, 'success', ok, 'open'],
  ] as const)(
    'slug %j, list %s %j, presentation %s %j is %s',
    (slug, listStatus, projects, presentationStatus, presentation, outcome) => {
      expect(projectLayoutOutcome({ slug, listStatus, projects, presentationStatus, presentation })).toBe(outcome);
    },
  );
});
