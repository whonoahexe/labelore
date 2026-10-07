// SUMMARY.md — lifts its documented frontmatter (including the nested coverage array) as an open
// map, and keeps the body verbatim. An absent `coverage` key and an empty `coverage: []` array are
// both preserved as gray-matter parsed them — the distinction (legacy prose-only summary vs. a
// summary that deliberately classified zero deliverables) is never collapsed here.
// quick-261006-iz7 (sketch 020 D): it also claims the quick-task twins — a live quick summary
// (`quick/<id>/<id>-SUMMARY.md`) and an archived one (`milestones/vX.Y-quick/<id>/<id>-SUMMARY.md`,
// location 'milestone-root') — and adds `structured.summary`: the tolerant SUMMARY body projection
// `composeSummaryRun` reads client-side, plus `pathPhase` (the phase number and directory slug from
// the file's own location) and `quickId` (the quick-task id from the filename), neither of which the
// client can see. The extraction is guarded by a try/catch so a throw only omits `summary` — the
// page then falls back to the pre-existing promoted-block view and the title, body and frontmatter
// survive (T-iz7-04). `.planning/research/SUMMARY.md` is location 'other' and stays unclaimed.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parsePlanFileName, parseQuickArtifactName } from '../naming.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractSummaryRun } from './summary-run.ts';

export const SummaryHandler: ArtifactHandler = {
  kind: 'summary',
  match: (ref) => {
    if (ref.location === 'quick' || ref.location === 'milestone-root') {
      return artifactTokenOf(ref) === 'SUMMARY';
    }
    if (ref.location !== 'phase' && ref.location !== 'archived-phase') return false;
    const parsed = parsePlanFileName(basename(ref.path));
    return parsed.matched && parsed.kind === 'summary';
  },
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let run;
    try {
      run = extractSummaryRun(fm.body);
    } catch {
      run = undefined;
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
      structured: run === undefined ? {} : { summary: { ...run, pathPhase, quickId } },
    };
  },
};
