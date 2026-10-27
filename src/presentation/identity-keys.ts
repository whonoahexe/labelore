// The opaque join keys of the presentation model, moved verbatim out of routes.ts (07-04). `phase.key`,
// `artifact.phaseKey`, the reference registry's scoped keys and the search index join on the output of
// these encoders; none of them is navigation. They keep their `m~` / `p~` / `a~` shapes unchanged so those
// joins and the dense golden do not churn when the readable URL grammar replaces the encoded URLs.
// routes.ts re-exports the three key functions, so every importer keeps working. The decoders for the same
// shapes live in the legacy module, which is deleted at v2.1 close (D-14); this module stays.
import type { PhaseIdentity } from '../domain/model.ts';

export const MILESTONE_PREFIX = 'm~';
export const ARTIFACT_PREFIX = 'a~';

export function encodePart(value: string): string {
  return encodeURIComponent(value).replaceAll('~', '%7E');
}

function nullablePart(value: string | null): string {
  return value === null ? 'n' : `v${encodePart(value)}`;
}

export function assertNonEmpty(value: string, label: string): void {
  if (value.length === 0) throw new TypeError(`${label} must not be empty`);
}

export function milestoneKeyOf(version: string | null): string {
  if (version === null) return 'current';
  assertNonEmpty(version, 'Milestone version');
  return `${MILESTONE_PREFIX}${encodePart(version)}`;
}

export function phaseKeyOf(identity: PhaseIdentity): string {
  assertNonEmpty(identity.number, 'Phase number');
  return [
    'p',
    nullablePart(identity.milestoneVersion),
    nullablePart(identity.projectCode),
    `v${encodePart(identity.number)}`,
    `v${encodePart(identity.slug)}`,
  ].join('~');
}

export function artifactTokenOf(path: string): string {
  assertNonEmpty(path, 'Artifact path');
  return `${ARTIFACT_PREFIX}${encodePart(path)}`;
}
