// REVIEWS.md (Phase 10, 10-22, VIEW-12). The handler claims `{NN}-REVIEWS.md` by its whole artifact token (so the code-review
// `REVIEW` token is not claimed, and `REVIEWS` is not claimed by the REVIEW handler) and carries `structured.reviews`, the
// tolerant reading `extractReviews` makes of what GSD's `/gsd-review` writes: each reviewer's section with its model, status,
// concerns and stated risk and verdicts, and the file's own consensus. Nothing is compared or merged here. The extraction is
// guarded by its own try/catch so a throw only omits the key: the page then falls back to the promoted-section view and the
// title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractReviews } from './reviews-body.ts';
import type { ReviewsBody } from './reviews-body.ts';

export { extractReviews } from './reviews-body.ts';
export type { ReviewsBody } from './reviews-body.ts';

export const ReviewsHandler: ArtifactHandler = {
  kind: 'reviews',
  match: (ref) => artifactTokenOf(ref) === 'REVIEWS',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let reviews: ReviewsBody | undefined;
    try {
      reviews = extractReviews(fm.data, fm.body);
    } catch {
      reviews = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: reviews === undefined ? {} : { reviews },
    };
  },
};
