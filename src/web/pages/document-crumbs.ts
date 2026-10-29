// The breadcrumb trail every document-like page shares (the text document page today; the image and
// file-details pages in 07-09). Pure: the trail comes from the loaded payload, never from the address,
// so a longer URL changes nothing a reader sees; only the address bar is longer (D-04).
import { buildMilestoneUrl, buildPhaseUrl, presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import type { ArtifactCrumb } from '../components/artifact-header.tsx';

/**
 * Dashboard, Roadmap, then, when the file belongs to a phase of the payload, its milestone (to the
 * milestone's overview page) and the phase, then the file's title. A file outside any phase (a note, a
 * root document, a quick task) gets Dashboard and Roadmap only. A payload that has not loaded yet gives
 * the same short trail.
 */
export function documentCrumbsOf(
  presentation: ProjectPresentation | undefined,
  artifactPath: string,
  title: string,
): ArtifactCrumb[] {
  const crumbs: ArtifactCrumb[] = [
    { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
    { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
  ];
  const phaseKey = presentation?.artifacts.find((artifact) => artifact.path === artifactPath)?.phaseKey;
  const phase =
    phaseKey === null || phaseKey === undefined
      ? undefined
      : presentation?.milestones.flatMap((milestone) => milestone.phases).find((p) => p.key === phaseKey);
  if (phase) {
    const { identity } = phase;
    crumbs.push(
      {
        label: identity.milestoneVersion ?? 'Current milestone',
        to: buildMilestoneUrl(identity.milestoneVersion),
      },
      { label: `Phase ${identity.number}`, to: buildPhaseUrl(identity) },
    );
  }
  crumbs.push({ label: title });
  return crumbs;
}
