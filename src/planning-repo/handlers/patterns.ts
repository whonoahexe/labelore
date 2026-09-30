// PATTERNS.md — the {NN}-PATTERNS.md phase artifact and its quick-task twin. Parses like the
// generic markdown handler (frontmatter-free body, `structured` from `projectSections`) and adds
// `structured.map` (quick-260930-wfs, sketch 013 B): the tolerant pattern-map projection
// `composePatternMap` reads client-side. The extraction is guarded by a try/catch so a throw only
// omits `map` — the page then falls back to the pre-existing promoted-block view and every other
// `structured` field survives (T-wfs-04).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { projectSections } from './section-projection.ts';
import { extractPatternMap } from './pattern-map.ts';

export const PatternsHandler: ArtifactHandler = {
  kind: 'patterns',
  match: (ref) => artifactTokenOf(ref) === 'PATTERNS',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let map;
    try {
      map = extractPatternMap(fm.body);
    } catch {
      map = undefined;
    }
    const structured = projectSections(ref.kind, fm.body);
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: map === undefined ? structured : { ...structured, map },
    };
  },
};
