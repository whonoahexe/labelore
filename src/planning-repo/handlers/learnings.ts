// LEARNINGS.md - lifts its documented frontmatter as an open map and keeps the body verbatim, like the
// frontmatter-only handler (phase and quick files) and the generic handler (the project-root file) it
// replaces for this one token. quick-261017-k45 (sketch 024 E) adds `structured.learnings`: the
// tolerant LEARNINGS body projection `composeLearningsRetro` reads client-side, plus `pathPhase` (the
// phase number and directory slug from the file's own location), `quickId` (the quick-task id from the
// filename) and `scope`, none of which the client can see. It claims every location `artifactTokenOf`
// reports as LEARNINGS (a phase, an archived phase, a live quick task and an archived quick task) and
// the project-root `.planning/LEARNINGS.md`, which GSD writes in the same shape. The extraction is
// guarded by a try/catch so a throw only omits `learnings` - the page then falls back to the
// promoted-section view and the title, body and frontmatter survive (T-k45-04).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parseQuickArtifactName } from '../naming.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractLearningsRetro } from './learnings-retro.ts';

export type LearningsScope = 'phase' | 'project' | 'quick' | 'other';

function isRootFile(ref: ArtifactRef): boolean {
  return ref.location === 'root' && basename(ref.path) === 'LEARNINGS.md';
}

export const LearningsHandler: ArtifactHandler = {
  kind: 'learnings',
  match: (ref) => artifactTokenOf(ref) === 'LEARNINGS' || isRootFile(ref),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let report;
    try {
      report = extractLearningsRetro(fm.body);
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
    const scope: LearningsScope = isRootFile(ref)
      ? 'project'
      : quickId !== null
        ? 'quick'
        : ref.location === 'phase' || ref.location === 'archived-phase'
          ? 'phase'
          : 'other';
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: report === undefined ? {} : { learnings: { ...report, pathPhase, quickId, scope } },
    };
  },
};
