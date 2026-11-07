// The onboarding page's React surface (Phase 11, 11-26, VIEW-18, sketch 061 winner A "Desk"): the header override (crumbs, the
// eyebrow "Onboarding", the file's own title as the h1 and the file name as meta; the header keeps its own Copy path button) and
// the page body, which leads with "Recommended next step": the summary's command in the shared copy-command row and, once under
// it, the sentence that Labelore does not run commands. The page makes no request and touches no storage: the only action is
// copying a command's text to the clipboard (T-11-39). Every string is author text rendered as plain React text - never React's
// raw-HTML injection prop (T-11-58). Nothing here is destructive or warning: an absent file is an absence, not a failed read.
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { CopyCommand } from '../components/copy-command.tsx';
import { FROM_SUMMARY, NEVER_RUNS, NEXT_LABEL, NO_COMMAND } from './onboarding-page.ts';
import type { ComposedOnboarding, ComposedOnboardingNext } from './onboarding-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type OnboardingHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The file name without its folder: the header only lays its meta row out when it has a meta item. */
function fileNameOf(path: string | undefined): string | null {
  if (path === undefined) return null;
  const name = path.split('/').pop() ?? '';
  return name === '' ? null : name;
}

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the file's title as the h1 and its name as meta.
 * The header keeps its own Copy path button for the one file; the sketch draws no lead line. */
export function onboardingHeaderProps(model: ComposedOnboarding, artifactTitle: string, artifactPath?: string): OnboardingHeaderProps {
  const name = fileNameOf(artifactPath);
  return {
    eyebrow: model.head.eyebrow,
    title: artifactTitle,
    lead: null,
    meta: name === null ? null : <span className="view-onboarding-meta">{name}</span>,
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
      { label: name ?? artifactTitle },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------------------

/** The summary's command. The quiet "From the onboarding summary" line is drawn only when the first screen suggests another. */
function NextStep({ next }: { next: ComposedOnboardingNext }): React.JSX.Element {
  return (
    <section className="view-onboarding-section" aria-labelledby="view-onboarding-next">
      <h2 className="view-onboarding-heading" id="view-onboarding-next">
        {NEXT_LABEL}
      </h2>
      <div className="view-onboarding-next">
        {next.labelled ? <p className="view-onboarding-meta">{FROM_SUMMARY}</p> : null}
        {next.command === null ? (
          <div className="view-onboarding-dashbox">
            <span>{NO_COMMAND}</span>
          </div>
        ) : (
          <>
            <CopyCommand command={next.command} />
            <p className="view-onboarding-quiet">{NEVER_RUNS}</p>
          </>
        )}
      </div>
    </section>
  );
}

export function OnboardingView({ model }: { model: ComposedOnboarding }): React.JSX.Element {
  return (
    <div className="view-onboarding-root" data-view="onboarding">
      <NextStep next={model.next} />
    </div>
  );
}
