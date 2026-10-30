// The settings store (PLAT-06, D-19): the tracer is one store writing settings.json and another reading
// it back unchanged, on a throwaway directory.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync, rmSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addEntry } from '../../src/server/settings-model.ts';
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
