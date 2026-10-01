// UAT.md — the {NN}-UAT.md phase artifact and its quick-task twin. Lifts frontmatter exactly like
// the frontmatter-only handler it replaces for this token, and adds `structured.uat`
// (quick-261001-qk7, sketch 015 B): the tolerant UAT session projection `composeUatSession` reads
// client-side. The extraction is guarded by a try/catch so a throw only omits `uat` — the page then
// falls back to the pre-existing promoted-block view and the title, body and frontmatter survive
// (T-qk7-04).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractUatSession } from './uat-session.ts';

export const UatHandler: ArtifactHandler = {
  kind: 'uat',
  match: (ref) => artifactTokenOf(ref) === 'UAT',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let uat;
    try {
      uat = extractUatSession(fm.body);
    } catch {
      uat = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: uat === undefined ? {} : { uat },
    };
  },
};
