// The read-only reader of GSD's installed configuration reference (quick-261114-42r, sketch 065), kept behind the server boundary.
// Labelore has no dependency on gsd-core, but the user's machine has it installed, and its `references/planning-config.md` and
// `bin/shared/*.manifest.json` files are the authority on what every config.json key means. This module finds that install,
// reads the three files through LocalFsPlanningFilesystem's read-only, contained `readHead` (so no third Node filesystem importer
// appears and the portability guard holds), and hands the texts to the pure parser in src/presentation. Every failure maps to a
// closed reason; nothing here throws, and nothing about the install's location reaches the response (T-42r-04).
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { LocalFsPlanningFilesystem, canonicalizePath } from '../planning-fs/local-fs.ts';
import { parseGsdConfigReference } from '../presentation/gsd-config-reference.ts';
import type { GsdConfigReference } from '../presentation/gsd-config-reference.ts';

/** Each file is read at most this many bytes; a file that fills the cap is treated as unreadable, never as a truncated reference. */
export const REFERENCE_READ_CAP = 1_048_576;

const PLANNING_CONFIG = 'references/planning-config.md';
const SCHEMA_MANIFEST = 'bin/shared/config-schema.manifest.json';
const DEFAULTS_MANIFEST = 'bin/shared/config-defaults.manifest.json';

/**
 * Where gsd-core is installed: LABELORE_GSD_CORE_DIR when set, else `<CLAUDE_CONFIG_DIR>/gsd-core` when CLAUDE_CONFIG_DIR is
 * absolute, else `<home>/.claude/gsd-core` (the probe GSD's own resolver uses). Under vitest with no override it is null, so a test
 * run never reads the machine's real install.
 */
export function gsdCoreDir(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string | null {
  const explicit = env.LABELORE_GSD_CORE_DIR;
  if (explicit !== undefined && explicit !== '') return explicit;
  if (env.VITEST) return null;
  const claude = env.CLAUDE_CONFIG_DIR;
  if (claude !== undefined && claude !== '' && isAbsolute(claude)) return join(claude, 'gsd-core');
  return join(home, '.claude', 'gsd-core');
}

function errorCode(error: unknown): string | null {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === 'string' ? code : null;
}

type ReadOutcome = { ok: true; text: string } | { ok: false; reason: 'not-found' | 'unreadable' };

async function readText(files: LocalFsPlanningFilesystem, rel: string): Promise<ReadOutcome> {
  try {
    const bytes = await files.readHead(rel, REFERENCE_READ_CAP);
    if (bytes.length >= REFERENCE_READ_CAP) return { ok: false, reason: 'unreadable' };
    return { ok: true, text: new TextDecoder('utf-8', { fatal: false }).decode(bytes) };
  } catch (error) {
    return { ok: false, reason: errorCode(error) === 'ENOENT' ? 'not-found' : 'unreadable' };
  }
}

/** The installed reference, or the closed reason it could not be had. Never throws. */
export async function loadGsdConfigReference(dir: string | null): Promise<GsdConfigReference> {
  try {
    if (dir === null || dir === '') return { available: false, reason: 'not-found' };
    const root = canonicalizePath(dir);
    if (!root.ok) return { available: false, reason: root.code === 'ENOENT' ? 'not-found' : 'unreadable' };
    const files = new LocalFsPlanningFilesystem(root.resolved);
    const planningConfig = await readText(files, PLANNING_CONFIG);
    if (!planningConfig.ok) return { available: false, reason: planningConfig.reason };
    const schema = await readText(files, SCHEMA_MANIFEST);
    if (!schema.ok) return { available: false, reason: schema.reason };
    const defaults = await readText(files, DEFAULTS_MANIFEST);
    return parseGsdConfigReference({
      planningConfig: planningConfig.text,
      schema: schema.text,
      defaults: defaults.ok ? defaults.text : null,
    });
  } catch {
    return { available: false, reason: 'unreadable' };
  }
}
