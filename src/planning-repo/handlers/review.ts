// REVIEW.md and REVIEW-FIX.md. Both were claimed by the generic markdown handler, whose
// `structured` for kind 'review' is the WR-NN warning projection the reference previews read
// (`structured.warnings`). quick-261017-k44 (sketch 022 C) keeps that projection exactly as it was
// and adds `structured.review`: the tolerant review body projection `composeReviewThreads` reads
// client-side, plus `pathPhase` (the phase number and directory slug from the file's own
// location) and `quickId` (the quick-task id from the filename), neither of which the client can
// see. REVIEW-FIX gets `structured.reviewFix`: the fixed and skipped entries and the deferred
// bullets the review page joins onto its findings. Both claim every location `artifactTokenOf`
// reports as REVIEW / REVIEW-FIX: a phase, an archived phase, a live quick task and an archived
// quick task. Each extraction is guarded by its own try/catch so a throw only omits its key - the
// page then falls back to the promoted-section view and the title, body, frontmatter and the
// warnings projection survive (T-k44-04).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parseQuickArtifactName } from '../naming.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractReviewFixReport, extractReviewReport } from './review-report.ts';
import { extractReviewWarnings } from './section-projection.ts';

function quickIdOf(ref: ArtifactRef): string | null {
  if (ref.quickTaskId !== null) return ref.quickTaskId;
  const quick = parseQuickArtifactName(basename(ref.path));
  return quick.matched ? quick.quickId : null;
}

export const ReviewHandler: ArtifactHandler = {
  kind: 'review',
  match: (ref) => artifactTokenOf(ref) === 'REVIEW',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let report;
    try {
      report = extractReviewReport(fm.body);
    } catch {
      report = undefined;
    }
    const identity = ref.phaseIdentity;
    const pathPhase = identity ? { number: identity.number, slug: identity.slug } : null;
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: {
        // Unchanged: WR-NN mentions resolve their previews from this (references.ts).
        ...extractReviewWarnings(fm.body),
        ...(report === undefined ? {} : { review: { ...report, pathPhase, quickId: quickIdOf(ref) } }),
      },
    };
  },
};

export const ReviewFixHandler: ArtifactHandler = {
  kind: 'review-fix',
  match: (ref) => artifactTokenOf(ref) === 'REVIEW-FIX',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let report;
    try {
      report = extractReviewFixReport(fm.body);
    } catch {
      report = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: report === undefined ? {} : { reviewFix: report },
    };
  },
};
