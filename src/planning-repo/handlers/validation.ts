// VALIDATION.md — the {NN}-VALIDATION.md phase artifact. Lifts frontmatter exactly like the
// frontmatter-only handler it replaces for this token, and adds `structured.validation`
// (quick-261003-526, sketch 016 winner A): the tolerant strategy projection `composeValidationStrategy`
// reads client-side. The extraction is guarded by a try/catch so a throw only omits `validation` —
// the page then falls back to the pre-existing promoted-block view and the title, body and
// frontmatter survive (T-526-05).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractValidationStrategy } from './validation-strategy.ts';

export const ValidationHandler: ArtifactHandler = {
  kind: 'validation',
  match: (ref) => artifactTokenOf(ref) === 'VALIDATION',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let validation;
    try {
      validation = extractValidationStrategy(fm.body);
    } catch {
      validation = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: validation === undefined ? {} : { validation },
    };
  },
};
