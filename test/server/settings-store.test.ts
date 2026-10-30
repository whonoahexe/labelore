// The settings store (PLAT-06, D-19): the tracer is one store writing settings.json and another reading
// it back unchanged, on a throwaway directory.
import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NOTICE_TOO_NEW, NOTICE_UNREADABLE, addEntry } from '../../src/server/settings-model.ts';
import type { SettingsState } from '../../src/server/settings-model.ts';
import { FileSettingsStore, MemorySettingsStore, defaultSettingsDir } from '../../src/server/settings-store.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const roots: string[] = [];
function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'labelore-settings-test-'));
  roots.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

const NOW = '2026-10-30T12:34:56.789Z';
const identityOf = (target: string) => target;
const adder = (target: string, slugBase: string) => (state: SettingsState) =>
  addEntry(state, { target, identity: target, slugBase, identityOf, now: NOW }).state;

describe('FileSettingsStore (tracer)', () => {
  it('writes settings.json through one store and reads it back unchanged through another', () => {
    const dir = join(scratch(), 'labelore');
    const one = new FileSettingsStore(dir);
    const result = one.mutate(adder(SHAPES_ROOT, 'shapes'));
    expect(result.ok).toBe(true);
    expect(result.state.projects.map((p) => p.slug)).toEqual(['shapes']);

    const two = new FileSettingsStore(dir);
    const read = two.read();
    expect(read.condition).toBe('ok');
    expect(read.state.projects).toHaveLength(1);
    expect(read.state.projects[0]).toMatchObject({ slug: 'shapes', target: SHAPES_ROOT, addedAt: NOW });

    const onDisk = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'));
    expect(onDisk.version).toBe(1);
    expect(statSync(join(dir, 'settings.json')).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(readdirSync(dir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('reports a missing file as an empty list and creates nothing on read', () => {
    const dir = join(scratch(), 'nothing-yet');
    const read = new FileSettingsStore(dir).read();
    expect(read.condition).toBe('missing');
    expect(read.state.projects).toEqual([]);
    expect(() => statSync(dir)).toThrow();
  });

  it('reports a location ending in settings.json', () => {
    const dir = join(scratch(), 'a', 'b');
    expect(new FileSettingsStore(dir).location()?.endsWith(join('a', 'b', 'settings.json'))).toBe(true);
  });
});

describe('FileSettingsStore degradation (D-12, T-08-11, T-08-12, T-08-15)', () => {
  const seed = (dir: string, text: string): string => {
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'settings.json');
    writeFileSync(path, text);
    return path;
  };

  it('moves a corrupt file to settings.json.bak with its original bytes and starts empty, without throwing', () => {
    const dir = scratch();
    const original = '{ not json';
    seed(dir, original);
    const read = new FileSettingsStore(dir).read();
    expect(read.condition).toBe('corrupt');
    expect(read.state.projects).toEqual([]);
    expect(read.notices).toEqual([NOTICE_UNREADABLE]);
    expect(readFileSync(join(dir, 'settings.json.bak'), 'utf8')).toBe(original);
    expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    // The next read finds no file at all and says nothing more.
    expect(new FileSettingsStore(dir).read().notices).toEqual([]);
  });

  it('lists a newer file and refuses to rewrite it', () => {
    const dir = scratch();
    const original = JSON.stringify({ version: 2, projects: [{ target: '/a/p', slug: 'p', addedAt: NOW, lastOpened: null }] });
    const path = seed(dir, original);
    const store = new FileSettingsStore(dir);
    const read = store.read();
    expect(read.condition).toBe('too-new');
    expect(read.notices).toEqual([NOTICE_TOO_NEW]);
    expect(read.state.projects.map((p) => p.slug)).toEqual(['p']);
    const result = store.mutate(adder('/b/q', 'q'));
    expect(result.ok).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(original);
    expect(readdirSync(dir)).toEqual(['settings.json']);
  });

  it('lists only the valid entries of a hand-edited file, with the four exact notices, and does not rewrite it', () => {
    const dir = scratch();
    const e = (slug: string, target: string) => ({ target, slug, addedAt: NOW, lastOpened: null });
    const original = JSON.stringify(
      {
        version: 1,
        projects: [e('API', '/a'), e('api', '/b'), e('portal', '/c'), e('portal', '/d'), e('x', '/c'), e('ok', '/e')],
      },
      null,
      4,
    );
    const path = seed(dir, original);
    const read = new FileSettingsStore(dir).read();
    expect(read.state.projects.map((p) => p.slug)).toEqual(['portal', 'ok']);
    expect(read.notices).toEqual([
      'A saved project was skipped: its slug "API" is not a valid project name.',
      'A saved project was skipped: its slug "api" is reserved.',
      'A saved project was skipped: its slug "portal" is used twice.',
      'A saved project was skipped: it repeats another saved project.',
    ]);
    expect(readFileSync(path, 'utf8')).toBe(original);
    expect(readdirSync(dir)).toEqual(['settings.json']);
  });

  it('keeps unknown top-level and entry keys through an add', () => {
    const dir = scratch();
    seed(
      dir,
      JSON.stringify({
        version: 1,
        theme: 'dark',
        projects: [{ target: '/a/p', slug: 'p', addedAt: NOW, lastOpened: null, pinned: true }],
        lastActive: null,
      }),
    );
    const result = new FileSettingsStore(dir).mutate(adder('/b/q', 'q'));
    expect(result.ok).toBe(true);
    const onDisk = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'));
    expect(onDisk.theme).toBe('dark');
    expect(onDisk.projects[0].pinned).toBe(true);
    expect(onDisk.projects.map((p: { slug: string }) => p.slug)).toEqual(['p', 'q']);
  });

  it('keeps both entries when two stores on one directory add alternately, with slugs portal and portal-2 (D-11)', () => {
    const dir = join(scratch(), 'shared');
    const one = new FileSettingsStore(dir);
    const two = new FileSettingsStore(dir);
    expect(one.mutate(adder('/folder-a/portal', 'portal')).ok).toBe(true);
    expect(two.mutate(adder('/folder-b/portal', 'portal')).ok).toBe(true);
    const slugs = new FileSettingsStore(dir)
      .read()
      .state.projects.map((p) => [p.slug, p.target]);
    expect(slugs).toEqual([
      ['portal', '/folder-a/portal'],
      ['portal-2', '/folder-b/portal'],
    ]);
  });

  it('returns ok false with the error code when the directory cannot be created, leaving no .tmp file', () => {
    const base = scratch();
    const blocker = join(base, 'a-regular-file');
    writeFileSync(blocker, 'x');
    const result = new FileSettingsStore(join(blocker, 'labelore')).mutate(adder('/a/p', 'p'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('ENOTDIR');
    expect(readdirSync(base)).toEqual(['a-regular-file']);
  });

  it('refuses to overwrite a settings path it cannot read, leaving it and the directory untouched', () => {
    const dir = scratch();
    mkdirSync(join(dir, 'settings.json'));
    const result = new FileSettingsStore(dir).mutate(adder('/a/p', 'p'));
    expect(result.ok).toBe(false);
    expect(statSync(join(dir, 'settings.json')).isDirectory()).toBe(true);
    expect(readdirSync(dir)).toEqual(['settings.json']);
  });

  it('leaves the file unchanged when the update function throws', () => {
    const dir = scratch();
    const store = new FileSettingsStore(dir);
    expect(store.mutate(adder('/a/p', 'p')).ok).toBe(true);
    const before = readFileSync(join(dir, 'settings.json'), 'utf8');
    const result = store.mutate(() => {
      throw new Error('boom');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('boom');
    expect(readFileSync(join(dir, 'settings.json'), 'utf8')).toBe(before);
    expect(readdirSync(dir)).toEqual(['settings.json']);
  });
});

describe('MemorySettingsStore', () => {
  it('applies updates in memory and has no location', () => {
    const store = new MemorySettingsStore();
    expect(store.location()).toBeNull();
    const result = store.mutate(adder('/a/p', 'p'));
    expect(result.ok).toBe(true);
    expect(store.read().state.projects.map((p) => p.slug)).toEqual(['p']);
  });
});

describe('defaultSettingsDir', () => {
  it('throws under vitest when LABELORE_CONFIG_DIR is unset', () => {
    expect(() => defaultSettingsDir({ VITEST: 'true' }, '/home/u')).toThrow(
      'LABELORE_CONFIG_DIR must be set when Labelore runs under vitest',
    );
  });

  it('prefers LABELORE_CONFIG_DIR', () => {
    expect(defaultSettingsDir({ LABELORE_CONFIG_DIR: '/x/y', XDG_CONFIG_HOME: '/z' }, '/home/u')).toBe('/x/y');
  });

  it('uses an absolute XDG_CONFIG_HOME', () => {
    expect(defaultSettingsDir({ XDG_CONFIG_HOME: '/xdg' }, '/home/u')).toBe(join('/xdg', 'labelore'));
  });

  it('falls back to ~/.config/labelore for a relative XDG_CONFIG_HOME or none', () => {
    expect(defaultSettingsDir({ XDG_CONFIG_HOME: 'rel' }, '/home/u')).toBe(join('/home/u', '.config', 'labelore'));
    expect(defaultSettingsDir({}, '/home/u')).toBe(join('/home/u', '.config', 'labelore'));
  });

  it('is given a throwaway directory by the vitest setup file', () => {
    expect(process.env.LABELORE_CONFIG_DIR).toMatch(/labelore-config-/);
    expect(defaultSettingsDir()).toBe(process.env.LABELORE_CONFIG_DIR);
  });
});
