// VERIFICATION.md - lifts its documented frontmatter as an open map and keeps the body verbatim,
// like the frontmatter-only handler it replaces for this one token (the quick-261003-526 precedent
// left that handler's now-unreachable token in place). quick-261017-18a (sketch 021 E) adds
// `structured.verification`: the tolerant VERIFICATION body projection `composeVerificationBoard`
// reads client-side, plus `pathPhase` (the phase number and directory slug from the file's own
// location) and `quickId` (the quick-task id from the filename), neither of which the client can
// see. It claims every location `artifactTokenOf` reports as VERIFICATION: a phase, an archived
// phase, a live quick task and an archived quick task. The extraction is guarded by a try/catch so
// a throw only omits `verification` - the page then falls back to the sketch-004 B3 layout and the
// title, body and frontmatter survive (T-18a-04).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parseQuickArtifactName } from '../naming.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractVerificationReport } from './verification-report.ts';

export const VerificationHandler: ArtifactHandler = {
  kind: 'verification',
  match: (ref) => artifactTokenOf(ref) === 'VERIFICATION',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let report;
    try {
      report = extractVerificationReport(fm.body);
    } catch {
      report = undefined;
    }
    const identity = ref.phaseIdentity;
    const pathPhase = identity ? { number: identity.number, slug: identity.slug } : null;
    let quickId: string | null = ref.quickTaskId;
    if (quickId === null) {
      const quick = parseQuickArtifactName(basename(ref.path));
      quickId = quick.matched ? quick.quickId : null;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: report === undefined ? {} : { verification: { ...report, pathPhase, quickId } },
    };
  },
};
