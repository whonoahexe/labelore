// The API coverage page's React surface (Phase 9, 09-15): the header override (eyebrow "API coverage", the
// file's H1 or "API coverage" as the h1, no lead) and the page body. The common file is one line, so the body
// is one quiet card - a lucide Unplug icon, "No external API in this phase" and the file's reason in Meta
// beneath it. Every string is author text rendered as plain React text through ResearchInline - never React's
// raw-HTML injection prop - and no href is built from document text. Colour comes only from the tone a composed
// model carries and the theme tokens; the parse-degradation tones never appear on document content.
import { Unplug } from 'lucide-react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import type { ComposedCoverage, ComposedCoverageCard } from './coverage-matrix.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props, and a Partial
 * keeps TypeScript from flagging the intentional override. The breadcrumb row stays, and the manifest lead
 * is dropped. */
export type CoverageHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
}>;

/** The ArtifactHeader override View mode spreads over its props. */
export function coverageHeaderProps(model: ComposedCoverage): CoverageHeaderProps {
  return { eyebrow: model.intro.eyebrow, title: model.intro.title, lead: null };
}

function NoApiCard({ card }: { card: ComposedCoverageCard }): React.JSX.Element {
  return (
    <section className="quiet-state view-coverage-card" data-tone="quiet" aria-label={card.heading}>
      <Unplug aria-hidden="true" />
      <div className="view-coverage-card-body">
        <h2 className="view-coverage-card-heading">{card.heading}</h2>
        {card.reason !== null ? (
          <p className="view-coverage-reason">
            <ResearchInline text={card.reason} />
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function CoverageView({ model }: { model: ComposedCoverage }): React.JSX.Element {
  return <div className="view-coverage-page">{model.card !== null ? <NoApiCard card={model.card} /> : null}</div>;
}
