// The seed and thread handlers (Phase 11, 11-20, VIEW-15, VIEW-16, D-02): `seeds/SEED-*.md` and
// `threads/<slug>.md`. Each claims one kind from folders.ts, keeps the generic title, frontmatter, body and
// warning, and adds `structured.seed` or `structured.thread` read by seed-thread-lift.ts. The lift is guarded by
// its own try/catch: a throw only omits the key, and the page then falls back to the plain document. The title, the
// frontmatter and the lift pass through the shared mask in prose mode (`maskProse` / `maskData`, WR-01) so a value written beside a variable
// name never reaches the payload (11-37, L3-WR-01, T-11-70); the body stays as written, as Source mode shows the file.
import type { ArtifactHandler, ArtifactRef, HandlerParseResult, RawArtifact } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractSeed, extractThread } from './seed-thread-lift.ts';
import { maskData, maskProse } from './withhold-values.ts';

export type { SeedLift, ThreadLift } from './seed-thread-lift.ts';

type Key = 'seed' | 'thread';

/** Seeds and threads are free-form prose: the mask's prose mode keeps `NOTE: revisit later` as written (WR-01). */
const PROSE = { prose: true } as const;

/** The generic parse plus `structured.<key>` from `lift`; `{}` when the lift throws. */
function parseWith(
  raw: RawArtifact,
  ref: ArtifactRef,
  key: Key,
  lift: (fm: ReturnType<typeof tryParseFrontmatter>) => unknown,
): HandlerParseResult {
  const fm = tryParseFrontmatter(raw.content);
  const title = maskProse(deriveTitle(fm.data, fm.body, ref.path));
  let lifted: unknown;
  try {
    // 11-37 (L3-WR-01, T-11-70): the lift, title and frontmatter pass through the shared mask, as User setup does, so a
    // value written beside a variable name never reaches the payload. The body stays as written (Source mode).
    lifted = maskData(lift(fm), 0, PROSE);
  } catch {
    lifted = undefined;
  }
  return {
    title,
    frontmatter: maskData(fm.data, 0, PROSE) as Record<string, unknown>,
    body: fm.body,
    warning: fm.warning,
    structured: lifted === undefined || lifted === null ? {} : { [key]: lifted },
  };
}

export const SeedHandler: ArtifactHandler = {
  kind: 'seed',
  match: (ref) => ref.kind === 'seed',
  parse: (raw, ref) => parseWith(raw, ref, 'seed', (fm) => extractSeed(ref.path, fm.data, fm.body)),
};

export const ThreadHandler: ArtifactHandler = {
  kind: 'thread',
  match: (ref) => ref.kind === 'thread',
  parse: (raw, ref) => parseWith(raw, ref, 'thread', (fm) => extractThread(fm.data, fm.body)),
};
