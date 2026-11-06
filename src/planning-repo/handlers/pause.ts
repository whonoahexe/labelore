// The pause files (Phase 11, 11-07, VIEW-17, D-05): `.planning/HANDOFF.json` and every `.continue-here.md`.
// PauseHandler wraps JsonConfigHandler for HANDOFF.json so its title, frontmatter, body and warning stay
// exactly what they were (test/config-masking.test.ts pins them) and adds `structured.pause` beside them.
// The lift is guarded by its own try/catch: a throw, or a file that did not parse, only omits the key, and
// the page then falls back to the plain document.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { JsonConfigHandler } from './json-config.ts';
import { extractHandoff, isRecord } from './pause-lift.ts';
import type { PauseBody } from './pause-lift.ts';

export type { PauseBody } from './pause-lift.ts';

export const PauseHandler: ArtifactHandler = {
  kind: 'pause',
  match: (ref) => ref.kind === 'handoff',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const base = JsonConfigHandler.parse(raw, ref);
    // A file that did not parse carries JsonConfigHandler's warning and an empty object: nothing to lift.
    if (base.warning !== undefined || !isRecord(base.frontmatter)) return base;
    let pause: PauseBody | undefined;
    try {
      pause = { source: 'handoff', ...extractHandoff(base.frontmatter) };
    } catch {
      pause = undefined;
    }
    if (pause === undefined) return base;
    return { ...base, structured: { ...(base.structured ?? {}), pause } };
  },
};
