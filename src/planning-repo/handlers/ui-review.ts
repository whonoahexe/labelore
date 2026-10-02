// UI-REVIEW.md — the {NN}-UI-REVIEW.md phase artifact and its quick-task twin. Until now it fell
// through to the generic markdown handler; this one lifts frontmatter the same way and adds
// `structured.uiReview` (quick-261003-528, sketch 018 B): the tolerant UI-REVIEW audit projection
// `composeUiReview` reads client-side, plus `pathPhase` — the phase number and directory slug from
// the artifact's own location, which the client cannot see (a UI-REVIEW from studio-portal carries
// no frontmatter). The extraction is guarded by a try/catch so a throw only omits `uiReview` — the
// page then falls back to the pre-existing promoted-block view and the title, body and frontmatter
// survive (T-528-04).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractUiReview } from './ui-review-audit.ts';

export const UiReviewHandler: ArtifactHandler = {
  kind: 'ui-review',
  match: (ref) => artifactTokenOf(ref) === 'UI-REVIEW',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let audit;
    try {
      audit = extractUiReview(fm.body);
    } catch {
      audit = undefined;
    }
    const identity = ref.phaseIdentity;
    const pathPhase = identity ? { number: identity.number, slug: identity.slug } : null;
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: audit === undefined ? {} : { uiReview: { ...audit, pathPhase } },
    };
  },
};
