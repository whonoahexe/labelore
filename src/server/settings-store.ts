// The SECOND and last permitted node:fs importer under src/ (D-19); src/planning-fs/local-fs.ts is the
// first. This file writes exactly one file, Labelore's own settings.json, whose path is fixed when the
// store is constructed and never changes. It never imports PlanningFilesystem or anything under
// src/planning-fs or src/planning-repo: the read-only planning boundary and this one write path stay
// apart, and test/portability.test.ts holds the importer list to exactly these two files.
import { mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { NOTICE_UNREADABLE, parseSettings, serializeSettings } from './settings-model.ts';
import type { ParsedSettings, SettingsState } from './settings-model.ts';

export type MutateResult = { ok: true; state: SettingsState } | { ok: false; state: SettingsState; reason: string };

export interface SettingsStore {
  /** Where the settings file lives (null for the in-memory store). */
  location(): string | null;
  /** The current settings; never throws. */
  read(): ParsedSettings;
  /** Re-reads the settings, applies a pure update and saves the result. */
  mutate(update: (state: SettingsState) => SettingsState): MutateResult;
}

const SETTINGS_FILE = 'settings.json';
const BACKUP_FILE = 'settings.json.bak';

/**
 * The directory that directly holds settings.json: LABELORE_CONFIG_DIR when set, else
 * $XDG_CONFIG_HOME/labelore when XDG_CONFIG_HOME is absolute, else ~/.config/labelore. Under vitest
 * the variable is mandatory so a test run can never reach the user's real file (D-09).
 */
export function defaultSettingsDir(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
  const explicit = env.LABELORE_CONFIG_DIR;
  if (explicit !== undefined && explicit !== '') return explicit;
  if (env.VITEST) throw new Error('LABELORE_CONFIG_DIR must be set when Labelore runs under vitest');
  const xdg = env.XDG_CONFIG_HOME;
  if (xdg !== undefined && xdg !== '' && isAbsolute(xdg)) return join(xdg, 'labelore');
  return join(home, '.config', 'labelore');
}

function errorReason(err: unknown): string {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (typeof code === 'string') return code;
  return err instanceof Error ? err.message : String(err);
}

type Loaded = ParsedSettings & { unreadable?: string };

export class FileSettingsStore implements SettingsStore {
  private readonly dir: string;
  private readonly file: string;
  private readonly identityOf: (target: string) => string;

  constructor(dirArg: string, identityOf: (target: string) => string = (target) => target) {
    this.dir = resolve(dirArg);
    this.file = join(this.dir, SETTINGS_FILE);
    this.identityOf = identityOf;
  }

  location(): string | null {
    // The real path of the nearest existing ancestor, joined with the part that does not exist yet,
    // so a symlinked config directory is compared by where it really is.
    let existing = this.dir;
    for (;;) {
      try {
        const real = realpathSync(existing);
        return join(real, relative(existing, this.file));
      } catch {
        const parent = dirname(existing);
        if (parent === existing) return this.file;
        existing = parent;
      }
    }
  }

  read(): ParsedSettings {
    const { state, notices, condition } = this.load();
    return { state, notices, condition };
  }

  mutate(update: (state: SettingsState) => SettingsState): MutateResult {
    const loaded = this.load();
    if (loaded.unreadable !== undefined) {
      return { ok: false, state: loaded.state, reason: `the settings file could not be read (${loaded.unreadable})` };
    }
    let next: SettingsState;
    try {
      next = update(loaded.state);
    } catch (err) {
      return { ok: false, state: loaded.state, reason: errorReason(err) };
    }
    if (loaded.condition === 'too-new') {
      return { ok: false, state: next, reason: 'the settings file is from a newer version of Labelore' };
    }
    const tmp = join(this.dir, `${SETTINGS_FILE}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`);
    try {
      mkdirSync(this.dir, { recursive: true, mode: 0o700 });
      writeFileSync(tmp, serializeSettings(next), { mode: 0o600, flag: 'wx' });
      renameSync(tmp, this.file);
      return { ok: true, state: next };
    } catch (err) {
      try {
        rmSync(tmp, { force: true });
      } catch {
        // Nothing more can be done; the previous settings file is untouched either way.
      }
      return { ok: false, state: next, reason: errorReason(err) };
    }
  }

  /** Reads and parses the file from disk; a corrupt file is moved aside as settings.json.bak. */
  private load(): Loaded {
    let text: string;
    try {
      text = readFileSync(this.file, 'utf8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') return parseSettings(null, this.identityOf);
      const reason = errorReason(err);
      return {
        ...parseSettings(null, this.identityOf),
        notices: [`Labelore's settings could not be read (${reason}), so the list started empty.`],
        condition: 'corrupt',
        unreadable: reason,
      };
    }
    const parsed = parseSettings(text, this.identityOf);
    if (parsed.condition === 'corrupt') {
      try {
        renameSync(this.file, join(this.dir, BACKUP_FILE));
      } catch {
        // The notice still reports the empty list; a failed rename is retried on the next read.
      }
      return { ...parsed, notices: [NOTICE_UNREADABLE] };
    }
    return parsed;
  }
}

/** In-memory store for --smoke and tests: same interface, nothing on disk. */
export class MemorySettingsStore implements SettingsStore {
  private current: SettingsState;

  constructor(initial?: SettingsState) {
    this.current = initial ?? parseSettings(null).state;
  }

  location(): string | null {
    return null;
  }

  read(): ParsedSettings {
    return { state: this.current, notices: [], condition: this.current.projects.length > 0 ? 'ok' : 'missing' };
  }

  mutate(update: (state: SettingsState) => SettingsState): MutateResult {
    try {
      this.current = update(this.current);
    } catch (err) {
      return { ok: false, state: this.current, reason: errorReason(err) };
    }
    return { ok: true, state: this.current };
  }
}
