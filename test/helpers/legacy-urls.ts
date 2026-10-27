// The pre-v2.1 encoded URLs, rebuilt from identity keys exactly as the old builders wrote them, for the redirect
// property test. routes.ts now emits the readable grammar, so these live in the test tree and leave with
// legacy-routes.ts at v2.1 close.
import type { PhaseIdentity } from '../../src/domain/model.ts';
import {
  artifactTokenOf,
  encodePart,
  milestoneKeyOf,
  phaseKeyOf,
} from '../../src/presentation/identity-keys.ts';

/** `/milestones/<m~...|current>` */
export function legacyMilestoneUrl(version: string | null): string {
  return `/milestones/${milestoneKeyOf(version)}`;
}

/** `/milestones/<m>/phases/<p~...>` */
export function legacyPhaseUrl(identity: PhaseIdentity): string {
  return `${legacyMilestoneUrl(identity.milestoneVersion)}/phases/${phaseKeyOf(identity)}`;
}

/** `/milestones/<m>/phases/<p>/plans/<id>` */
export function legacyPlanUrl(identity: PhaseIdentity, planId: string): string {
  return `${legacyPhaseUrl(identity)}/plans/${encodePart(planId)}`;
}

/** `/artifacts/<a~...>`, or the phase-scoped `/milestones/<m>/phases/<p>/artifacts/<a~...>` when an identity is given. */
export function legacyArtifactUrl(path: string, identity: PhaseIdentity | null = null): string {
  const token = artifactTokenOf(path);
  return identity === null ? `/artifacts/${token}` : `${legacyPhaseUrl(identity)}/artifacts/${token}`;
}
