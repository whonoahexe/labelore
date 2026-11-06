// The spike documents (Phase 11, 11-12, VIEW-14, D-01): `spikes/MANIFEST.md`, each `spikes/<NNN-name>/README.md`,
// `WRAP-UP-SUMMARY.md` and `CONVENTIONS.md`. Each handler claims one kind from folders.ts, keeps the generic
// title, frontmatter, body and warning, and adds `structured.spikes.<part>` read by spikes-lift.ts. Every lift is
// guarded by its own try/catch: a throw only omits the key, and the page then falls back to the plain document.
// Spike scripts and outputs are never read (class `listed`, folders.ts); only these four kinds reach a handler.
import type { ArtifactHandler, RawArtifact, ArtifactRef, HandlerParseResult } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractConventions, extractManifest, extractSpikeReadme, extractWrapUp } from './spikes-lift.ts';

export type {
  SpikeIdea,
  SpikeManifestRow,
  SpikeReadmeBody,
  SpikesConventionsBody,
  SpikesManifestBody,
  SpikesWrapUpBody,
} from './spikes-lift.ts';

type Part = 'manifest' | 'readme' | 'wrapUp' | 'conventions';

/** The generic parse plus `structured.spikes.<part>` from `lift`; `{}` when the lift throws. */
function parseWith(
  raw: RawArtifact,
  ref: ArtifactRef,
  part: Part,
  lift: (fm: ReturnType<typeof tryParseFrontmatter>, content: string) => unknown,
): HandlerParseResult {
  const fm = tryParseFrontmatter(raw.content);
  const title = deriveTitle(fm.data, fm.body, ref.path);
  let lifted: unknown;
  try {
    lifted = lift(fm, raw.content);
  } catch {
    lifted = undefined;
  }
  return {
    title,
    frontmatter: fm.data,
    body: fm.body,
    warning: fm.warning,
    structured: lifted === undefined ? {} : { spikes: { [part]: lifted } },
  };
}

export const SpikesManifestHandler: ArtifactHandler = {
  kind: 'spikes-manifest',
  match: (ref) => ref.kind === 'spikes-manifest',
  parse: (raw, ref) => parseWith(raw, ref, 'manifest', (fm) => extractManifest(fm.body)),
};

export const SpikeReadmeHandler: ArtifactHandler = {
  kind: 'spike',
  match: (ref) => ref.kind === 'spike',
  parse: (raw, ref) =>
    parseWith(raw, ref, 'readme', (fm, content) =>
      extractSpikeReadme(ref.path, fm.data, fm.body, fm.warning !== undefined, content),
    ),
};

export const SpikesWrapUpHandler: ArtifactHandler = {
  kind: 'spikes-wrap-up',
  match: (ref) => ref.kind === 'spikes-wrap-up',
  parse: (raw, ref) => parseWith(raw, ref, 'wrapUp', (fm) => extractWrapUp(fm.data, fm.body)),
};

export const SpikesConventionsHandler: ArtifactHandler = {
  kind: 'spikes-conventions',
  match: (ref) => ref.kind === 'spikes-conventions',
  parse: (raw, ref) => parseWith(raw, ref, 'conventions', (fm) => extractConventions(fm.data, fm.body)),
};
