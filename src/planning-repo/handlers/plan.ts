// PLAN.md — lifts its documented frontmatter (including the nested must_haves object) as an open
// map with no schema validation, and keeps the body verbatim with its pseudo-XML task tags
// untouched — the renderer needs them intact, not pre-parsed here. Beside the verbatim body it adds
// `structured.plan` (quick-261006-iz6, sketch 019 B): the tolerant PLAN projection `composePlanNavigator`
// reads client-side, plus the ref facts the client cannot see (plan id, phase number and slug, quick
// id). The handler owns every PLAN file wherever it lives — a phase, an archived phase, a live quick
// task and an archived quick task — identified by its file token, not by its phase location. The
// extraction is guarded by a try/catch so a throw only omits `plan`: the title, body and frontmatter
// survive and the page keeps its previous layout (T-iz6-05).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { parsePlanFileName, parseQuickArtifactName } from '../naming.ts';
import { extractPlanStructure } from './plan-structure.ts';

export interface PlanRefFacts {
  /** `05-01` for a phase plan, the quick id for a quick plan. */
  planId: string | null;
  phaseNumber: string | null;
  phaseSlug: string | null;
  quickId: string | null;
}

function refFacts(ref: ArtifactRef): PlanRefFacts {
  const name = basename(ref.path);
  const parsed = parsePlanFileName(name);
  // A quick id made of digits only ("261003-528-PLAN.md") also fits the phase-plan file grammar, so the
  // location decides which reading applies.
  const phaseScoped = ref.location === 'phase' || ref.location === 'archived-phase';
  if (phaseScoped && parsed.matched && parsed.kind === 'plan') {
    return {
      planId: `${parsed.phase}-${parsed.plan}`,
      phaseNumber: ref.phaseIdentity?.number ?? parsed.phase,
      phaseSlug: ref.phaseIdentity?.slug ?? null,
      quickId: null,
    };
  }
  const quick = parseQuickArtifactName(name);
  const quickId = ref.quickTaskId ?? (quick.matched ? quick.quickId : null);
  return { planId: quickId, phaseNumber: null, phaseSlug: null, quickId };
}

export const PlanHandler: ArtifactHandler = {
  kind: 'plan',
  match: (ref) => {
    if (artifactTokenOf(ref) === 'PLAN') return true;
    if (ref.location !== 'phase' && ref.location !== 'archived-phase') return false;
    const parsed = parsePlanFileName(basename(ref.path));
    return parsed.matched && parsed.kind === 'plan';
  },
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let plan;
    try {
      plan = extractPlanStructure(fm.body);
    } catch {
      plan = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: plan === undefined ? {} : { plan: { ...plan, ref: refFacts(ref) } },
    };
  },
};
