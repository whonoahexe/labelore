// The seed and thread handlers (Phase 11, 11-20, VIEW-15, VIEW-16, D-02): `seeds/SEED-*.md` and
// `threads/<slug>.md`. Each claims one kind from folders.ts, keeps the generic title, frontmatter, body and
// warning, and adds `structured.seed` or `structured.thread` read by seed-thread-lift.ts. The lift is guarded by
// its own try/catch: a throw only omits the key, and the page then falls back to the plain document.
import type { ArtifactHandler, ArtifactRef, HandlerParseResult, RawArtifact } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractSeed, extractThread } from './seed-thread-lift.ts';

export type { SeedLift, ThreadLift } from './seed-thread-lift.ts';

type Key = 'seed' | 'thread';

/** The generic parse plus `structured.<key>` from `lift`; `{}` when the lift throws. */
function parseWith(
  raw: RawArtifact,
  ref: ArtifactRef,
  key: Key,
  lift: (fm: ReturnType<typeof tryParseFrontmatter>) => unknown,
): HandlerParseResult {
  const fm = tryParseFrontmatter(raw.content);
  const title = deriveTitle(fm.data, fm.body, ref.path);
  let lifted: unknown;
  try {
    lifted = lift(fm);
  } catch {
    lifted = undefined;
  }
  return {
    title,
    frontmatter: fm.data,
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
