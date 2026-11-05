// EVAL-REVIEW.md (Phase 10, 10-20, VIEW-12). The handler claims `{NN}-EVAL-REVIEW.md` by its artifact token and carries
// `structured.evalReview`, the tolerant reading `extractEvalReview` makes of what GSD's `gsd-eval-auditor` writes: the
// score and verdict as the file states them, the dimension and infrastructure tables, the remediation groups and the
// critical gaps. Nothing is recomputed. The extraction is guarded by its own try/catch so a throw only omits the key: the
// page then falls back to the promoted-section view and the title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractEvalReview } from './eval-review-body.ts';
import type { EvalReviewBody } from './eval-review-body.ts';

export { extractEvalReview } from './eval-review-body.ts';
export type { EvalReviewBody } from './eval-review-body.ts';

export const EvalReviewHandler: ArtifactHandler = {
  kind: 'eval-review',
  match: (ref) => artifactTokenOf(ref) === 'EVAL-REVIEW',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let evalReview: EvalReviewBody | undefined;
    try {
      evalReview = extractEvalReview(fm.body);
    } catch {
      evalReview = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: evalReview === undefined ? {} : { evalReview },
    };
  },
};
