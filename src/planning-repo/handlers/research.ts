// RESEARCH.md — the {NN}-RESEARCH.md phase artifact and its quick-task twin. Parses like the
// generic markdown handler (frontmatter-free body, `structured` from `projectSections`) and adds
// `structured.briefing` (quick-260929-3x3, sketches 008-A / 009 / 010-B): the tolerant RESEARCH
// projection `composeResearchBriefing` reads client-side. The extraction is guarded by a try/catch
// so a throw only omits `briefing` — the page then falls back to the pre-existing promoted-block
// view and every other `structured` field survives (T-3x3-04).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { projectSections } from './section-projection.ts';
import { extractResearchBriefing } from './research-briefing.ts';

export const ResearchHandler: ArtifactHandler = {
  kind: 'research',
  match: (ref) => artifactTokenOf(ref) === 'RESEARCH',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let briefing;
    try {
      briefing = extractResearchBriefing(fm.body);
    } catch {
      briefing = undefined;
    }
    const structured = projectSections(ref.kind, fm.body);
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: briefing === undefined ? structured : { ...structured, briefing },
    };
  },
};
