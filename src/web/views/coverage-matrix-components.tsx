// The API coverage page's React surface (Phase 9, 09-15): the header override (eyebrow "API coverage", the
// file's H1 or "API coverage" as the h1, no lead) and the page body. The common file is one line, so the body
// is one quiet card - a lucide Unplug icon, "No external API in this phase" and the file's reason in Meta
// beneath it. A file with a capability matrix shows the summary ("3 integrated, 2 opted out") in the lead number
// style with a two-segment bar, the file's lead lines as a caption, then the Integrated and Opted out groups
// (and a final Other group for any other decision value): a row is a status-square, the capability in mono, a
// decision chip and the reason in Meta, an opt-out with no reason saying so on a dashed quiet line. Every string
// is author text rendered as plain React text through ResearchInline - never React's raw-HTML injection prop -
// and no href is built from document text. Colour comes only from the tone a composed model carries and the
// theme tokens; nothing here is drawn missing or in a parse-degradation tone.
import { Unplug } from 'lucide-react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { NO_REASON } from './coverage-matrix.ts';
import type {
  ComposedCoverage,
  ComposedCoverageCard,
  ComposedCoverageGroup,
  ComposedCoverageMatrix,
  ComposedCoverageRow,
} from './coverage-matrix.ts';

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

function MatrixHead({ matrix }: { matrix: ComposedCoverageMatrix }): React.JSX.Element {
  const total = matrix.integrated + matrix.optedOut;
  return (
    <header className="view-coverage-head">
      <p className="view-coverage-summary">{matrix.summary}</p>
      {total > 0 ? (
        <span className="view-coverage-bar" role="img" aria-label={matrix.summary}>
          {matrix.integrated > 0 ? <i data-tone="complete" style={{ flexGrow: matrix.integrated }} /> : null}
          {matrix.optedOut > 0 ? <i data-tone="quiet" style={{ flexGrow: matrix.optedOut }} /> : null}
        </span>
      ) : null}
      {matrix.lead.length > 0 ? (
        <div className="view-coverage-lead">
          {matrix.lead.map((line, index) => (
            <p key={index} className="view-coverage-lead-line">
              <ResearchInline text={line} />
            </p>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function Row({ row }: { row: ComposedCoverageRow }): React.JSX.Element {
  return (
    <li className="view-coverage-row" data-tone={row.tone}>
      <i className="status-square" data-tone={row.tone} aria-hidden="true" />
      <span className="view-coverage-capability">{row.capability}</span>
      <span className="status-chip view-coverage-chip" data-tone={row.tone}>
        {row.chip}
      </span>
      {row.reason !== null ? (
        <p className="view-coverage-row-reason">
          <ResearchInline text={row.reason} />
        </p>
      ) : row.noReason ? (
        <p className="view-coverage-row-reason view-coverage-no-reason">{NO_REASON}</p>
      ) : null}
    </li>
  );
}

function Group({ group }: { group: ComposedCoverageGroup }): React.JSX.Element {
  return (
    <section className="view-coverage-group" data-group={group.key}>
      <h2 className="view-coverage-group-head">
        <i className="status-square" data-tone={group.tone} aria-hidden="true" />
        <span className="view-coverage-group-label">{group.label}</span>
        <span className="view-coverage-group-count">{group.rows.length}</span>
      </h2>
      <ul className="view-coverage-rows">
        {group.rows.map((row, index) => (
          <Row key={index} row={row} />
        ))}
      </ul>
    </section>
  );
}

export function CoverageView({ model }: { model: ComposedCoverage }): React.JSX.Element {
  return (
    <div className="view-coverage-page">
      {model.card !== null ? <NoApiCard card={model.card} /> : null}
      {model.matrix !== null ? (
        <>
          <MatrixHead matrix={model.matrix} />
          {model.matrix.groups.map((group) => (
            <Group key={group.key} group={group} />
          ))}
        </>
      ) : null}
    </div>
  );
}
