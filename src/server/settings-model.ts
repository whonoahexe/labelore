// The pure half of Labelore's own settings file (PLAT-06, D-19): the schema, the tolerant parse, the
// serialiser and the small updates the project registry applies (add, forget, stamp, name hint).
// Nothing here touches the filesystem or the clock; src/server/settings-store.ts reads and writes the
// bytes and callers pass `now`. parseSettings never throws: a hand-edited, corrupt or newer file
// degrades to a state plus notices (D-12), and what the model does not know survives a rewrite.
import { RESERVED_SLUGS } from '../presentation/reserved.ts';
import { SLUG_PATTERN, allocateSlug } from '../presentation/project-slug.ts';

export const SETTINGS_VERSION = 1;

const MAX_TARGET_LENGTH = 1024;
const EPOCH_ISO = new Date(0).toISOString();

export interface SettingsEntry {
  /** The project target as the user gave it: a folder path or an ssh target. */
  target: string;
  /** The persisted URL segment (D-11); validated on every read. */
  slug: string;
  /** ISO-8601 UTC with milliseconds (Date.prototype.toISOString). */
  addedAt: string;
  /** ISO-8601 UTC with milliseconds, or null when never opened. */
  lastOpened: string | null;
  /** Optional title hint read from the project's PROJECT.md (D-21). */
  name?: string;
  /** Keys this version does not know; written back unchanged. */
  extra: Record<string, unknown>;
}

export interface SettingsState {
  version: number;
  projects: SettingsEntry[];
  lastActive: string | null;
  /** Top-level keys this version does not know; written back unchanged. */
  extra: Record<string, unknown>;
}

export type SettingsCondition = 'missing' | 'ok' | 'corrupt' | 'too-new';

export interface ParsedSettings {
  state: SettingsState;
  notices: string[];
  condition: SettingsCondition;
}

export const NOTICE_UNREADABLE =
  "Labelore's settings could not be read, so the list started empty. The old file was kept as settings.json.bak.";
export const NOTICE_TOO_NEW =
  "Labelore's settings were written by a newer version of Labelore, so changes made here are not saved.";

export function saveFailedNotice(reason: string): string {
  return `Could not save the project list: ${reason}. The change lasts only until Labelore restarts.`;
}

export function skippedNotice(reason: string): string {
  return `A saved project was skipped: ${reason}.`;
}

export function emptySettings(): SettingsState {
  return { version: SETTINGS_VERSION, projects: [], lastActive: null, extra: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTarget(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TARGET_LENGTH && !value.includes('\0');
}

/** Names a non-string slug for a skip notice; a value whose conversion throws is named by its type (T-08-12). */
function slugLabel(value: unknown): string {
  try {
    return String(value);
  } catch {
    return Array.isArray(value) ? 'a list' : `a value of type ${typeof value}`;
  }
}

/** Reads one saved entry; returns the entry, or the reason it is skipped. */
function readEntry(
  raw: unknown,
  seenSlugs: ReadonlySet<string>,
  seenIdentities: ReadonlySet<string>,
  identityOf: (target: string) => string,
): { entry: SettingsEntry } | { reason: string } {
  if (!isRecord(raw)) return { reason: 'it has no location' };
  if (!validTarget(raw.target)) return { reason: 'it has no location' };
  const slug = typeof raw.slug === 'string' ? raw.slug : slugLabel(raw.slug);
  if (typeof raw.slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return { reason: `its slug "${slug}" is not a valid project name` };
  }
  if (RESERVED_SLUGS.has(slug)) return { reason: `its slug "${slug}" is reserved` };
  if (seenSlugs.has(slug)) return { reason: `its slug "${slug}" is used twice` };
  let identity: string;
  try {
    identity = identityOf(raw.target);
  } catch {
    identity = raw.target;
  }
  if (seenIdentities.has(identity)) return { reason: 'it repeats another saved project' };
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'target' || key === 'slug' || key === 'addedAt' || key === 'lastOpened' || key === 'name') continue;
    extra[key] = value;
  }
  const entry: SettingsEntry = {
    target: raw.target,
    slug,
    addedAt: typeof raw.addedAt === 'string' ? raw.addedAt : EPOCH_ISO,
    lastOpened: typeof raw.lastOpened === 'string' ? raw.lastOpened : null,
    extra,
  };
  if (typeof raw.name === 'string') entry.name = raw.name;
  return { entry };
}

/** Parses the text of settings.json (null when the file does not exist). Never throws. */
export function parseSettings(
  text: string | null,
  identityOf: (target: string) => string = (target) => target,
): ParsedSettings {
  if (text === null) return { state: emptySettings(), notices: [], condition: 'missing' };
  const corrupt: ParsedSettings = { state: emptySettings(), notices: [NOTICE_UNREADABLE], condition: 'corrupt' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return corrupt;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.projects)) return corrupt;

  let version = SETTINGS_VERSION;
  if (parsed.version !== undefined) {
    if (typeof parsed.version !== 'number' || !Number.isInteger(parsed.version) || parsed.version < 1) return corrupt;
    version = parsed.version;
  }

  const notices: string[] = [];
  const projects: SettingsEntry[] = [];
  const seenSlugs = new Set<string>();
  const seenIdentities = new Set<string>();
  for (const raw of parsed.projects) {
    const result = readEntry(raw, seenSlugs, seenIdentities, identityOf);
    if ('reason' in result) {
      notices.push(skippedNotice(result.reason));
      continue;
    }
    const { entry } = result;
    seenSlugs.add(entry.slug);
    let identity: string;
    try {
      identity = identityOf(entry.target);
    } catch {
      identity = entry.target;
    }
    seenIdentities.add(identity);
    projects.push(entry);
  }

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'version' || key === 'projects' || key === 'lastActive') continue;
    extra[key] = value;
  }
  const lastActive =
    typeof parsed.lastActive === 'string' && seenSlugs.has(parsed.lastActive) ? parsed.lastActive : null;

  const tooNew = version > SETTINGS_VERSION;
  if (tooNew) notices.unshift(NOTICE_TOO_NEW);
  return {
    state: { version, projects, lastActive, extra },
    notices,
    condition: tooNew ? 'too-new' : 'ok',
  };
}

/** Two-space JSON with a trailing newline; entries in state order, unknown keys restored. */
export function serializeSettings(state: SettingsState): string {
  const projects = state.projects.map((entry) => {
    const out: Record<string, unknown> = {
      target: entry.target,
      slug: entry.slug,
      addedAt: entry.addedAt,
      lastOpened: entry.lastOpened,
    };
    if (entry.name !== undefined) out.name = entry.name;
    for (const [key, value] of Object.entries(entry.extra)) out[key] = value;
    return out;
  });
  const out: Record<string, unknown> = { version: state.version, projects, lastActive: state.lastActive };
  for (const [key, value] of Object.entries(state.extra)) out[key] = value;
  return `${JSON.stringify(out, null, 2)}\n`;
}

export interface AddEntryInput {
  target: string;
  /** The canonical identity of the target (what makes two targets the same project). */
  identity: string;
  /** The first slug candidate, normally slugOf(target). */
  slugBase: string;
  identityOf: (target: string) => string;
  /** ISO-8601 UTC timestamp for addedAt. */
  now: string;
}

/** Adds a project, or returns the existing entry's slug (duplicate true) for a repeated identity. */
export function addEntry(
  state: SettingsState,
  input: AddEntryInput,
): { state: SettingsState; slug: string; duplicate: boolean } {
  for (const entry of state.projects) {
    let identity: string;
    try {
      identity = input.identityOf(entry.target);
    } catch {
      identity = entry.target;
    }
    if (identity === input.identity) return { state, slug: entry.slug, duplicate: true };
  }
  const slug = allocateSlug(input.slugBase, new Set(state.projects.map((entry) => entry.slug)));
  const entry: SettingsEntry = {
    target: input.target,
    slug,
    addedAt: input.now,
    lastOpened: null,
    extra: {},
  };
  return { state: { ...state, projects: [...state.projects, entry] }, slug, duplicate: false };
}

/** Removes a project; lastActive is cleared when it named that project. */
export function forgetEntry(state: SettingsState, slug: string): SettingsState {
  if (!state.projects.some((entry) => entry.slug === slug)) return state;
  return {
    ...state,
    projects: state.projects.filter((entry) => entry.slug !== slug),
    lastActive: state.lastActive === slug ? null : state.lastActive,
  };
}

/** Records that a project was opened: its lastOpened, and lastActive. */
export function stampOpened(state: SettingsState, slug: string, nowIso: string): SettingsState {
  if (!state.projects.some((entry) => entry.slug === slug)) return state;
  return {
    ...state,
    projects: state.projects.map((entry) => (entry.slug === slug ? { ...entry, lastOpened: nowIso } : entry)),
    lastActive: slug,
  };
}

/** Stores a title hint for a project. */
export function setNameHint(state: SettingsState, slug: string, name: string): SettingsState {
  if (!state.projects.some((entry) => entry.slug === slug)) return state;
  return {
    ...state,
    projects: state.projects.map((entry) => (entry.slug === slug ? { ...entry, name } : entry)),
  };
}
