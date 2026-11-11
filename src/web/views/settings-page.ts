// The settings page's composer (Phase 12, 12-03, SET-01, D-08, D-10, D-11, sketch 063 variant A): a pure function from the parsed,
// already-masked config.json to four counts and the panels of read-only rows the page draws. It reads the handler's masked
// frontmatter only (D-08) and never the file, so a secret that reached this function is already in its masked form; the Masked count
// is read from the one masking list (SECRET_CONFIG_KEYS), never re-spelled here.
//
// How the walk goes (sketch 063's flatten, tightened): descend into a plain object only when some catalogue key starts with that
// path plus a dot; otherwise the whole value is one entry. A catalogue key is Set (null counts as set), an absent one is Not set, and
// every leftover entry is Not recognised by its full path with its value as written. An absent key carries no value at all: the
// unset row type has no value field, so no default, guess or documented default can reach the page.
//
// Pure: no DOM, no filesystem, no clock, no module-level mutable state, and nothing sorted except by the catalogue's own order, so
// equal inputs give identical output. 12-09 renders it.
import { SECRET_CONFIG_KEYS } from '../../planning-repo/secret-mask.ts';
import { SETTINGS_CATALOGUE, SETTINGS_GROUPS, SETTINGS_PATTERNS } from '../../presentation/settings-catalogue.ts';
import type { CatalogueKey, SettingsGroupId } from '../../presentation/settings-catalogue.ts';

/** A value in the shape it arrives in. */
export type SettingsValue =
  | { kind: 'boolean'; on: boolean }
  | { kind: 'enum'; options: ReadonlyArray<string | number>; chosen: string | number }
  | { kind: 'null' }
  | { kind: 'masked'; text: string }
  | { kind: 'number'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'list'; value: unknown[] }
  | { kind: 'object'; value: Record<string, unknown> };

export interface SettingsRow {
  /** The full dotted path as written in the file. */
  key: string;
  label: string;
  value: SettingsValue;
  /** True for objects and lists of objects, which take the full panel width. */
  wide: boolean;
}

/** A catalogue key the file does not set. Deliberately no value field: an absent key shows nothing but "not set". */
export interface UnsetRow {
  key: string;
  label: string;
}

export interface SettingsPanel {
  /** The group id, or 'not-recognised'. */
  id: string;
  name: string;
  kind: 'group' | 'not-recognised';
  setCount: number;
  total: number;
  rows: SettingsRow[];
  unset: UnsetRow[];
  /** True when the "not set" fold opens on its own: a group with nothing set. */
  openUnset: boolean;
  /** True for a group with nothing set: the header text reads muted. */
  muted: boolean;
}

export interface SettingsCounts {
  set: number;
  notSet: number;
  notRecognised: number;
  masked: number;
}

export type ComposedSettings = { state: 'ready'; counts: SettingsCounts; panels: SettingsPanel[] } | { state: 'unreadable' };

export interface ComposeSettingsOptions {
  /** The workstream scope; anything but null means this is a workstream's own config.json, a plain file (D-11). */
  scope: string | null;
  /** True when the config.json did not parse (D-11). */
  unreadable: boolean;
}

interface Entry {
  path: string;
  /** The top-level key the entry sits under, for the masking rule. */
  top: string;
  value: unknown;
}

const CATALOGUE_BY_KEY: ReadonlyMap<string, CatalogueKey> = new Map(SETTINGS_CATALOGUE.map((entry) => [entry.key, entry]));

/** Every path that has something below it in the catalogue or a pattern: the only objects the walk opens. */
const DESCEND_PATHS: ReadonlySet<string> = new Set(
  [...SETTINGS_CATALOGUE.map((entry) => entry.key), ...SETTINGS_PATTERNS.map((pattern) => `${pattern.prefix}x`)].flatMap((path) => {
    const parts = path.split('.');
    return parts.slice(0, -1).map((_part, index) => parts.slice(0, index + 1).join('.'));
  }),
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function holdsString(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) return value.some(holdsString);
  if (isPlainObject(value)) return Object.values(value).some(holdsString);
  return false;
}

function flatten(root: Record<string, unknown>): Entry[] {
  const out: Entry[] = [];
  const walk = (object: Record<string, unknown>, prefix: string, top: string | null): void => {
    for (const name of Object.keys(object)) {
      if (!Object.hasOwn(object, name)) continue;
      const value = object[name];
      const path = prefix + name;
      const topKey = top ?? name;
      if (CATALOGUE_BY_KEY.has(path)) out.push({ path, top: topKey, value });
      else if (isPlainObject(value) && DESCEND_PATHS.has(path)) walk(value, `${path}.`, topKey);
      else out.push({ path, top: topKey, value });
    }
  };
  walk(root, '', null);
  return out;
}

function numberText(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString('en') : String(value);
}

function valueOf(entry: Entry, options: ReadonlyArray<string | number> | undefined): SettingsValue {
  const { value } = entry;
  if (SECRET_CONFIG_KEYS.has(entry.top) && holdsString(value)) {
    return { kind: 'masked', text: typeof value === 'string' ? value : JSON.stringify(value) };
  }
  if (typeof value === 'boolean') return { kind: 'boolean', on: value };
  if (value === null) return { kind: 'null' };
  if (typeof value === 'number') {
    if (options?.includes(value)) return { kind: 'enum', options, chosen: value };
    return { kind: 'number', text: numberText(value) };
  }
  if (typeof value === 'string') {
    if (options?.includes(value)) return { kind: 'enum', options, chosen: value };
    return { kind: 'string', text: value };
  }
  if (Array.isArray(value)) return { kind: 'list', value };
  if (isPlainObject(value)) return { kind: 'object', value };
  return { kind: 'string', text: String(value) };
}

function isWide(value: SettingsValue): boolean {
  if (value.kind === 'object') return true;
  return value.kind === 'list' && value.value.some(isPlainObject);
}

function rowOf(entry: Entry, label: string, options: ReadonlyArray<string | number> | undefined): SettingsRow {
  const value = valueOf(entry, options);
  return { key: entry.path, label, value, wide: isWide(value) };
}

/**
 * Composes a parsed, masked config.json into the settings model. Returns `{ state: 'unreadable' }` for a file that did not
 * parse, `null` when this is not the project's root config (a workstream scope) or the data is not a plain object, so the
 * caller keeps the plain-file view.
 */
export function composeSettings(frontmatter: unknown, options: ComposeSettingsOptions): ComposedSettings | null {
  if (options.unreadable) return { state: 'unreadable' };
  if (options.scope !== null) return null;
  if (!isPlainObject(frontmatter)) return null;

  const entries = flatten(frontmatter);
  const known = new Map<string, Entry>();
  const unknown: Entry[] = [];
  for (const entry of entries) {
    if (CATALOGUE_BY_KEY.has(entry.path)) known.set(entry.path, entry);
    else unknown.push(entry);
  }

  const groupPanels: SettingsPanel[] = SETTINGS_GROUPS.map((group) => {
    const keys = SETTINGS_CATALOGUE.filter((entry) => entry.group === group.id);
    const rows: SettingsRow[] = [];
    const unset: UnsetRow[] = [];
    for (const catalogueKey of keys) {
      const entry = known.get(catalogueKey.key);
      if (entry === undefined) unset.push({ key: catalogueKey.key, label: catalogueKey.label });
      else rows.push(rowOf(entry, catalogueKey.label, catalogueKey.options));
    }
    const nothingSet = rows.length === 0;
    return {
      id: group.id satisfies SettingsGroupId,
      name: group.name,
      kind: 'group',
      setCount: rows.length,
      total: keys.length,
      rows,
      unset,
      openUnset: nothingSet,
      muted: nothingSet,
    };
  });

  const unrecognisedPanel: SettingsPanel | null =
    unknown.length === 0
      ? null
      : {
          id: 'not-recognised',
          name: 'Not recognised',
          kind: 'not-recognised',
          setCount: unknown.length,
          total: unknown.length,
          rows: unknown.map((entry) => rowOf(entry, entry.path, undefined)),
          unset: [],
          openUnset: false,
          muted: false,
        };

  const withSomething = groupPanels.filter((panel) => panel.setCount > 0);
  const withNothing = groupPanels.filter((panel) => panel.setCount === 0);
  const panels = [...withSomething, ...(unrecognisedPanel === null ? [] : [unrecognisedPanel]), ...withNothing];

  const set = groupPanels.reduce((sum, panel) => sum + panel.setCount, 0);
  const notSet = groupPanels.reduce((sum, panel) => sum + panel.unset.length, 0);
  const masked = entries.filter((entry) => SECRET_CONFIG_KEYS.has(entry.top) && holdsString(entry.value)).length;

  return { state: 'ready', counts: { set, notSet, notRecognised: unknown.length, masked }, panels };
}
