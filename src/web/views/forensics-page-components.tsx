// The forensics page's React surface (Phase 11, 11-25, VIEW-18, sketch 060 winner B "Evidence rail"): the header override
// (crumbs, the eyebrow "Forensics", the report's own title as the h1 and "Generated {stamp}" as meta; the header keeps its own
// Copy path button) and the page body: the Problem sentence as a quiet note, then on the left, in the report's own order, the
// root cause hypothesis (a heavy left rule), the numbered recommended actions and the anomaly cards, and on a sticky right rail
// the artifact grid as a heat map over the evidence summary. The rail stacks last on a narrow screen. Every string is author
// text rendered as plain React text through ResearchInline - never React's raw-HTML injection prop - and the page makes no
// request and touches no storage (T-11-40). Confidence has no good or bad polarity, so its chip is untoned and the card's rule
// weight repeats it; an absent artifact is a `missing` square with the word "Absent", a present one `complete`. Nothing is
// destructive or warning: a high-confidence anomaly and an absent artifact are the report's content, not a read failure.
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { ResearchInline } from '../pages/research-atoms.tsx';
import {
  ABSENT_WORD,
  ACTIONS_LABEL,
  ANOMALIES_LABEL,
  EVIDENCE_LABEL,
  EVIDENCE_SUMMARY_LABEL,
  GENERATED_LABEL,
  GRID_LABEL,
  HYPOTHESIS_LABEL,
  INTERPRETATION_LABEL,
  LAST_COMMIT_LABEL,
  NOT_STATED_WORD,
  NO_ANOMALIES,
  PRESENT_WORD,
  PROBLEM_LABEL,
  RULE_NOTE,
  TIME_SPAN_LABEL,
} from './forensics-page.ts';
import type {
  ComposedForensics,
  ComposedForensicsGrid,
  ForensicsAnomalyCard,
  ForensicsAxis,
  ForensicsCellState,
  ForensicsEvidenceBlock,
} from './forensics-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type ForensicsHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
  path: string | null;
  crumbs: { label: string; to?: string }[];
}>;

/** The file name without its folder and its `.md` ending: the header only lays its meta row out when it has a meta item. */
function fileStemOf(path: string | undefined): string | null {
  if (path === undefined) return null;
  const name = path.split('/').pop() ?? '';
  const stem = name.endsWith('.md') ? name.slice(0, -3) : name;
  return stem === '' ? null : stem;
}

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the report's title as the h1 and the stamp as
 * meta. The header keeps its own Copy path button for the one file; the sketch draws no lead line. */
export function forensicsHeaderProps(model: ComposedForensics, artifactTitle: string, artifactPath?: string): ForensicsHeaderProps {
  const stem = fileStemOf(artifactPath);
  const parts = [model.head.generated === null ? null : `Generated ${model.head.generated}`].filter(
    (part): part is string => part !== null,
  );
  const meta = parts.length > 0 ? parts : stem === null ? [] : [stem];
  return {
    eyebrow: model.head.eyebrow,
    title: model.head.title ?? artifactTitle,
    lead: null,
    meta:
      meta.length === 0 ? null : (
        <span className="view-forensics-metas">
          {meta.map((part) => (
            <span key={part} className="view-forensics-meta">
              {part}
            </span>
          ))}
        </span>
      ),
    crumbs: [
      { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
      { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
      { label: stem ?? model.head.title ?? artifactTitle },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------------------

function Problem({ problem }: { problem: string | null }): React.JSX.Element | null {
  if (problem === null) return null;
  return (
    <p className="view-forensics-problem">
      <span className="view-forensics-micro">{PROBLEM_LABEL}</span>
      <span className="view-forensics-quiet">
        <ResearchInline text={problem} />
      </span>
    </p>
  );
}

function Hypothesis({ paragraphs }: { paragraphs: string[] }): React.JSX.Element | null {
  if (paragraphs.length === 0) return null;
  return (
    <section className="view-forensics-section" aria-labelledby="view-forensics-hypothesis">
      <h2 className="view-forensics-heading" id="view-forensics-hypothesis">
        {HYPOTHESIS_LABEL}
      </h2>
      <div className="view-forensics-hyp">
        {paragraphs.map((paragraph, at) => (
          <p key={at} className={at === 0 ? 'view-forensics-sentence' : 'view-forensics-text'}>
            <ResearchInline text={paragraph} />
          </p>
        ))}
      </div>
    </section>
  );
}

function Actions({ actions }: { actions: string[] }): React.JSX.Element | null {
  if (actions.length === 0) return null;
  return (
    <section className="view-forensics-section" aria-labelledby="view-forensics-actions">
      <h2 className="view-forensics-heading" id="view-forensics-actions">
        {ACTIONS_LABEL}
      </h2>
      <ol className="view-forensics-actions">
        {actions.map((action, at) => (
          <li key={at}>
            <span>
              <ResearchInline text={action} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function percent(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

function Paragraphs({ paragraphs }: { paragraphs: string[] }): React.JSX.Element {
  return (
    <>
      {paragraphs.map((paragraph, at) => (
        <p key={at} className="view-forensics-text">
          <ResearchInline text={paragraph} />
        </p>
      ))}
    </>
  );
}

function AnomalyCard({ card }: { card: ForensicsAnomalyCard }): React.JSX.Element {
  return (
    <div className="view-forensics-card" data-conf={card.kind}>
      <details className="view-forensics-an" id={`view-forensics-${card.key}`} open={card.open}>
        <summary>
          <span className="view-forensics-no">{card.number}</span>
          <span>
            <ResearchInline text={card.type} />
          </span>
          {card.chip === null ? null : (
            <span className="status-chip view-forensics-chip" data-conf={card.kind}>
              {card.chip}
            </span>
          )}
        </summary>
        <div className="view-forensics-an-body">
          {card.evidence.length === 0 ? null : (
            <div>
              <span className="view-forensics-micro">{EVIDENCE_LABEL}</span>
              <Paragraphs paragraphs={card.evidence} />
            </div>
          )}
          {card.interpretation.length === 0 ? null : (
            <div>
              <span className="view-forensics-micro">{INTERPRETATION_LABEL}</span>
              <Paragraphs paragraphs={card.interpretation} />
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function Anomalies({ model }: { model: ComposedForensics }): React.JSX.Element | null {
  if (model.anomalies.length === 0 && !model.noAnomalies) return null;
  return (
    <section className="view-forensics-section" aria-labelledby="view-forensics-anomalies">
      <h2 className="view-forensics-heading" id="view-forensics-anomalies">
        {ANOMALIES_LABEL}
      </h2>
      {model.anomalies.length === 0 ? (
        <>
          <div className="view-forensics-nothing">
            <i className="status-square view-forensics-sq" data-tone="quiet" aria-hidden="true" />
            <span>{NO_ANOMALIES}</span>
          </div>
          {model.anomaliesNote === null ? null : (
            <p className="view-forensics-quiet view-forensics-text">
              <ResearchInline text={model.anomaliesNote} />
            </p>
          )}
        </>
      ) : (
        <>
          <div className="view-forensics-cards">
            {model.anomalies.map((card) => (
              <AnomalyCard key={card.key} card={card} />
            ))}
          </div>
          <p className="view-forensics-meta">{RULE_NOTE}</p>
        </>
      )}
    </section>
  );
}

const CELL_TONE: Record<ForensicsCellState, 'complete' | 'missing' | 'quiet'> = {
  present: 'complete',
  absent: 'missing',
  unstated: 'quiet',
};

function Heat({ grid }: { grid: ComposedForensicsGrid }): React.JSX.Element {
  return (
    <>
      <div className="view-forensics-scroll">
        <div className="view-forensics-heat" role="table" aria-label={GRID_LABEL} style={{ '--view-forensics-np': grid.phases.length } as React.CSSProperties}>
          <div role="row" className="view-forensics-row">
            <span role="columnheader" className="view-forensics-hh view-forensics-top">
              <span className="view-forensics-sr">Artifact</span>
            </span>
            {grid.phases.map((phase) => (
              <span key={phase.key} role="columnheader" className="view-forensics-hh view-forensics-top" title={phase.name === '' ? undefined : phase.name}>
                {phase.number}
              </span>
            ))}
          </div>
          {grid.rows.map((row) => (
            <div key={row.key} role="row" className="view-forensics-row">
              <span role="rowheader" className="view-forensics-hh">
                {row.artifact}
              </span>
              {row.cells.map((cell) => (
                <span key={cell.key} role="cell" className="view-forensics-hc" data-state={cell.state}>
                  <i className="status-square view-forensics-sq view-forensics-big" data-tone={CELL_TONE[cell.state]} aria-hidden="true" />
                  {cell.state === 'absent' ? (
                    <>
                      <span>{ABSENT_WORD}</span>
                      {cell.note === '' ? null : <span className="view-forensics-nt">{cell.note}</span>}
                    </>
                  ) : cell.note !== '' ? (
                    <span className="view-forensics-nt">{cell.note}</span>
                  ) : cell.state === 'present' ? (
                    <span className="view-forensics-sr">{PRESENT_WORD}</span>
                  ) : (
                    <span className="view-forensics-nt">{NOT_STATED_WORD}</span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <ul className="view-forensics-legend">
        {grid.phases.map((phase) => (
          <li key={phase.key}>
            <b>{phase.number}</b> {phase.name}
          </li>
        ))}
      </ul>
      <p className="view-forensics-meta">{grid.summary}</p>
    </>
  );
}

function GitAxis({ axis }: { axis: ForensicsAxis }): React.JSX.Element {
  return (
    <>
      <div className="view-forensics-axis" role="img" aria-label={axis.words}>
        <i className="view-forensics-base" />
        <i className="view-forensics-sp" style={{ left: 0, width: percent(axis.lastAt) }} />
        <span className="view-forensics-pt" style={{ left: percent(axis.lastAt) }} />
        <span className="view-forensics-pt view-forensics-gen" data-edge="end" style={{ left: percent(axis.generatedAt) }} />
        <span className="view-forensics-lt">{TIME_SPAN_LABEL}</span>
        <span className="view-forensics-lb" data-edge="start" style={{ left: 0 }}>
          {axis.fromLabel}
        </span>
        {axis.showLastLabel ? (
          <span className="view-forensics-lb" style={{ left: percent(axis.lastAt) }}>
            {axis.lastLabel}
          </span>
        ) : null}
        <span className="view-forensics-lb" data-edge="end" style={{ left: percent(axis.generatedAt) }}>
          {axis.generatedLabel}
        </span>
      </div>
      <div className="view-forensics-chips">
        <span className="status-chip">{LAST_COMMIT_LABEL}</span>
        <span className="status-chip view-forensics-chip" data-conf="other">
          {GENERATED_LABEL}
        </span>
      </div>
    </>
  );
}

function EvidenceBlock({ block }: { block: ForensicsEvidenceBlock }): React.JSX.Element {
  return (
    <>
      <span className="view-forensics-micro">{block.heading}</span>
      {block.axis === null ? null : <GitAxis axis={block.axis} />}
      <dl className="view-forensics-kv">
        {block.rows.map((row) => (
          <div key={row.key} data-labelled={row.label === null ? 'false' : 'true'}>
            {row.label === null ? null : <dt>{row.label}</dt>}
            <dd>
              <ResearchInline text={row.value} />
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Rail({ model }: { model: ComposedForensics }): React.JSX.Element | null {
  if (model.grid === null && model.evidence.length === 0) return null;
  return (
    <aside className="view-forensics-rail" aria-label="Evidence">
      {model.grid === null ? null : (
        <section className="view-forensics-panel" aria-labelledby="view-forensics-grid">
          <h2 className="view-forensics-heading" id="view-forensics-grid">
            {GRID_LABEL}
          </h2>
          <Heat grid={model.grid} />
        </section>
      )}
      {model.evidence.length === 0 ? null : (
        <section className="view-forensics-panel" aria-labelledby="view-forensics-evidence">
          <h2 className="view-forensics-heading" id="view-forensics-evidence">
            {EVIDENCE_SUMMARY_LABEL}
          </h2>
          {model.evidence.map((block) => (
            <EvidenceBlock key={block.key} block={block} />
          ))}
        </section>
      )}
    </aside>
  );
}

/** The forensics page body. `model` is composed and pure; the view makes no request and holds no state. */
export function ForensicsView({ model }: { model: ComposedForensics }): React.JSX.Element {
  return (
    <div className="view-forensics-root" data-view="forensics">
      <Problem problem={model.head.problem} />
      <div className="view-forensics-grid">
        <div className="view-forensics-main">
          <Hypothesis paragraphs={model.hypothesis} />
          <Actions actions={model.actions} />
          <Anomalies model={model} />
        </div>
        <Rail model={model} />
      </div>
    </div>
  );
}
