// The pause files (Phase 11, 11-07, VIEW-17, D-05): `.planning/HANDOFF.json` and every `.continue-here.md`.
// PauseHandler wraps JsonConfigHandler for HANDOFF.json so its title, frontmatter, body and warning stay
// exactly what they were (test/config-masking.test.ts pins them) and adds `structured.pause` beside them.
// ContinueHereHandler claims the `continue-here` refs that used to fall to the generic handler; it keeps the
// generic title, frontmatter and warning, hands the renderer a body with the seven tag-only lines blanked
// (they would swallow the heading after them), and adds `structured.pause` read from the untouched body.
// Each lift is guarded by its own try/catch: a throw, or a file that did not parse, only omits the key, and
// the page then falls back to the plain document.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { JsonConfigHandler } from './json-config.ts';
import { blankPauseTagLines, extractContinueHere, extractHandoff, isRecord } from './pause-lift.ts';
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

export const ContinueHereHandler: ArtifactHandler = {
  kind: 'continue-here',
  match: (ref) => ref.kind === 'continue-here',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let body: string;
    try {
      body = blankPauseTagLines(fm.body);
    } catch {
      body = fm.body;
    }
    let pause: PauseBody | undefined;
    try {
      pause = { source: 'continue-here', ...extractContinueHere(fm.data, fm.body) };
    } catch {
      pause = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body,
      warning: fm.warning,
      structured: pause === undefined ? {} : { pause },
    };
  },
};
