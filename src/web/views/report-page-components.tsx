// The report page's React surface (Phase 11, 11-24, VIEW-18, sketch 059 winner A "Time ruler"): the header override
// (crumbs, the eyebrow "Session report" or "Milestone summary", the file's own title as the h1, "Generated {stamp}" and the
// context as meta; the header keeps its own Copy path button) and the page body, one frame for both report kinds:
//   - a card of headline numerals (Duration, Commits and Plans, or the milestone's Stats), each shown exactly as the report
//     wrote it, over a ruler (a 24 hour axis with a bar from the first to the last commit, a dashed empty axis carrying the
//     Duration text, or the milestone's calendar with a numbered mark where each phase was delivered) and, for a session
//     report, the phase strip and the report's progress sentence;
//   - two columns below: Key outcomes, Phases touched and Decisions against Blockers and open items over the folds, or for
//     a milestone Phases delivered and Tech debt against Requirements coverage and Key decisions;
//   - every section the page does not compose is a plain section or a closed bar through the document's own sanitised HTML.
// Every string is author text rendered as plain React text through ResearchInline - never React's raw-HTML injection prop -
// and the page makes no request and touches no storage (T-11-38). Headline numerals are untoned; colour comes only from the
// tone a mark carries and the theme tokens: blockers `in-flight`, a delivered phase and a covered requirement `complete`, a
// requirement not covered `quiet`. Nothing is `missing` or destructive.
import { ChevronRight } from 'lucide-react';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { StatusMeter } from '../components/status-meter.tsx';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { stripLeadingHeading } from './document-sections.ts';
import {
  BLOCKERS_LABEL,
  DECISIONS_LABEL,
  FILES_CHANGED_LABEL,
  KEY_DECISIONS_LABEL,
  KEY_OUTCOMES_LABEL,
  PHASES_DELIVERED_LABEL,
  PHASES_TOUCHED_LABEL,
  PHASE_PROGRESS_LABEL,
  REQUIREMENTS_LABEL,
  RESOURCE_USAGE_LABEL,
  TECH_DEBT_LABEL,
} from './report-page.ts';
import type {
  ComposedFiles,
  ComposedMilestoneReport,
  ComposedProgress,
  ComposedReport,
  ComposedRuler,
  ComposedSessionReport,
  ComposedUsage,
  ReportNumeral,
  ReportRawSection,
} from './report-page.ts';

type RenderHtml = ((html: string) => React.ReactNode) | undefined;

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props. */
export type ReportHeaderProps = Partial<{
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

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the report's title as the h1 and the stamp and
 * context as meta. The header keeps its own Copy path button for the one file; the sketch draws no lead line. */
export function reportHeaderProps(model: ComposedReport, artifactTitle: string, artifactPath?: string): ReportHeaderProps {
  const stem = fileStemOf(artifactPath);
  const parts = [model.head.generated === null ? null : `Generated ${model.head.generated}`, model.head.context].filter(
    (part): part is string => part !== null,
  );
  const meta = parts.length > 0 ? parts : stem === null ? [] : [stem];
  return {
    eyebrow: model.head.eyebrow,
    title: model.head.title ?? artifactTitle,
    lead: null,
    meta:
      meta.length === 0 ? null : (
        <span className="view-report-metas">
          {meta.map((part) => (
            <span key={part} className="view-report-meta">
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
// Atoms
// ---------------------------------------------------------------------------------------------------------

function percent(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

function Square({ tone }: { tone: 'complete' | 'in-flight' | 'quiet' }): React.JSX.Element {
  return <i className="status-square view-report-sq" data-tone={tone} aria-hidden="true" />;
}

function Numeral({ numeral }: { numeral: ReportNumeral }): React.JSX.Element {
  return (
    <div className="view-report-num" data-numeral={numeral.key}>
      {numeral.label === '' ? null : <span className="view-report-micro">{numeral.label}</span>}
      <span className="view-report-numeral" data-long={numeral.long ? 'true' : 'false'}>
        {numeral.main}
      </span>
      {numeral.note === null ? null : <span className="view-report-meta">{numeral.note}</span>}
      {numeral.chips.length === 0 ? null : (
        <span className="view-report-chips">
          {numeral.chips.map((chip) => (
            <span key={chip} className="status-chip">
              {chip}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function Numerals({ numerals }: { numerals: ReportNumeral[] }): React.JSX.Element | null {
  if (numerals.length === 0) return null;
  return (
    <section className="view-report-band">
      <div className="view-report-nums" style={{ '--view-report-cols': Math.min(numerals.length, 5) } as React.CSSProperties}>
        {numerals.map((numeral) => (
          <Numeral key={numeral.key} numeral={numeral} />
        ))}
      </div>
    </section>
  );
}

/** The axis: the 24 hour clock of a session, or the calendar of a milestone. Positions are fractions of the axis. */
function Ruler({ ruler }: { ruler: ComposedRuler }): React.JSX.Element {
  if (ruler.kind === 'calendar') {
    return (
      <div className="view-report-axis" role="img" aria-label={`Timeline ${ruler.from} to ${ruler.to}`}>
        <i className="view-report-base" />
        {ruler.months.map((month) => (
          <span key={month.key}>
            <i className="view-report-tick" data-major="true" style={{ left: percent(month.at) }} />
            <span className="view-report-tl" data-up="true" style={{ left: percent(month.at) }}>
              {month.name}
            </span>
          </span>
        ))}
        <span className="view-report-tl" data-edge="start" style={{ left: 0 }}>
          {ruler.from}
        </span>
        <span className="view-report-tl" data-edge="end" style={{ left: '100%' }}>
          {ruler.to}
        </span>
        {ruler.marks.map((mark) => (
          <span key={mark.key}>
            <span className="view-report-mark" data-edge={mark.edge ?? undefined} style={{ left: percent(mark.at) }}>
              {mark.number}
            </span>
            {mark.edge === null ? (
              <span className="view-report-md" style={{ left: percent(mark.at) }}>
                {mark.date}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    );
  }
  const hours = [0, 6, 12, 18, 24];
  const minor = Array.from({ length: 23 }, (_, at) => at + 1).filter((hour) => hour % 6 !== 0);
  const ticks = (
    <>
      {minor.map((hour) => (
        <i key={hour} className="view-report-tick" style={{ left: percent(hour / 24) }} />
      ))}
      {hours.map((hour) => (
        <span key={hour}>
          <i className="view-report-tick" data-major="true" style={{ left: percent(hour / 24) }} />
          <span
            className="view-report-tl"
            data-edge={hour === 0 ? 'start' : hour === 24 ? 'end' : undefined}
            style={{ left: percent(hour / 24) }}
          >
            {String(hour).padStart(2, '0')}:00
          </span>
        </span>
      ))}
    </>
  );
  if (ruler.kind === 'none') {
    return (
      <div className="view-report-axis" role="img" aria-label="No first and last commit stamps in the file">
        <i className="view-report-base" data-ghost="true" />
        {ticks}
        <span className="view-report-none status-chip" data-tone="quiet">
          {ruler.text}
        </span>
      </div>
    );
  }
  return (
    <div className="view-report-axis" role="img" aria-label={`First commit ${ruler.from}, last commit ${ruler.to}`}>
      <i className="view-report-base" />
      {ticks}
      <i className="view-report-span" style={{ left: percent(ruler.fromAt), width: percent(ruler.toAt - ruler.fromAt) }} />
      <span className="view-report-sl" data-end="start" data-flip={ruler.fromAt < 0.1 ? 'true' : 'false'} style={{ left: percent(ruler.fromAt) }}>
        {ruler.from}
      </span>
      <span className="view-report-sl" data-end="end" data-flip={ruler.toAt > 0.9 ? 'true' : 'false'} style={{ left: percent(ruler.toAt) }}>
        {ruler.to}
      </span>
    </div>
  );
}

function PhaseProgress({ progress }: { progress: ComposedProgress }): React.JSX.Element {
  const { cells, done, total } = progress;
  return (
    <section className="view-report-band">
      <span className="view-report-micro">{PHASE_PROGRESS_LABEL}</span>
      {cells !== null ? (
        <div
          className="view-report-phases"
          style={{ '--view-report-np': cells.length } as React.CSSProperties}
          role="img"
          aria-label={`${done ?? 0} of ${total ?? cells.length} phases done`}
        >
          {cells.map((cell) => (
            <div key={cell.key} className="view-report-ph" data-tone={cell.done ? 'complete' : 'quiet'} data-touched={cell.touched ? 'true' : 'false'}>
              <span className="view-report-micro">{cell.label}</span>
              <span className="view-report-ph-word">
                {cell.done ? 'done' : 'not done'}
                {cell.touched ? ' · touched' : ''}
              </span>
            </div>
          ))}
        </div>
      ) : done !== null && total !== null ? (
        <StatusMeter filled={done} total={total} label={`${done} of ${total} phases done`} />
      ) : null}
      <p className="view-report-prose view-report-quiet">
        <ResearchInline text={progress.sentence} />
      </p>
    </section>
  );
}

function Plain({ section, renderHtml, title }: { section: ReportRawSection; renderHtml: RenderHtml; title?: string }): React.JSX.Element {
  return (
    <section className="view-report-section" id={section.id}>
      <h2 className="view-report-heading">{title ?? section.title}</h2>
      <div className="view-report-plain">{renderHtml ? renderHtml(stripLeadingHeading(section.html)) : null}</div>
    </section>
  );
}

function Bar({
  id,
  title,
  count,
  children,
}: {
  id?: string;
  title: string;
  count?: string | null;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <details className="view-report-bar" id={id}>
      <summary>
        <ChevronRight className="view-report-chev" aria-hidden="true" />
        <span>{title}</span>
        {count === undefined || count === null ? null : <span className="view-report-count">{count}</span>}
      </summary>
      <div className="view-report-bar-body">{children}</div>
    </details>
  );
}

function RawBar({ section, renderHtml, title }: { section: ReportRawSection; renderHtml: RenderHtml; title?: string }): React.JSX.Element {
  return (
    <Bar id={section.id} title={title ?? section.title}>
      <div className="view-report-plain">{renderHtml ? renderHtml(stripLeadingHeading(section.html)) : null}</div>
    </Bar>
  );
}

/** Opens the section's closed bar when it is one, then scrolls to it. A click handler only: nothing runs on render. */
function jumpTo(id: string): void {
  const target = document.getElementById(id);
  if (target === null) return;
  if (target instanceof HTMLDetailsElement) target.open = true;
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
}

// ---------------------------------------------------------------------------------------------------------
// Session report
// ---------------------------------------------------------------------------------------------------------

function FilesBar({ files }: { files: ComposedFiles }): React.JSX.Element {
  const total = (files.insertions ?? 0) + (files.deletions ?? 0);
  return (
    <Bar title={FILES_CHANGED_LABEL} count={files.count}>
      {files.insertions !== null && files.deletions !== null && total > 0 ? (
        <div className="view-report-insdel">
          <div className="view-report-insdel-bar" role="img" aria-label={`${files.insertions} insertions, ${files.deletions} deletions`}>
            <i data-kind="ins" style={{ width: percent(files.insertions / total) }} />
            <i data-kind="del" style={{ width: percent(files.deletions / total) }} />
          </div>
        </div>
      ) : null}
      {files.summary === null ? null : (
        <span className="view-report-meta">
          <ResearchInline text={files.summary} />
        </span>
      )}
      {files.dirs.length === 0 ? null : (
        <ul className="view-report-dirs">
          {files.dirs.map((dir) => (
            <li key={dir.key}>
              {dir.path === null ? null : <code>{dir.path}</code>}
              <span className="view-report-quiet">
                <ResearchInline text={dir.text} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bar>
  );
}

function UsageBar({ usage }: { usage: ComposedUsage }): React.JSX.Element {
  return (
    <Bar title={RESOURCE_USAGE_LABEL} count={`${usage.rows.length} ${usage.rows.length === 1 ? 'metric' : 'metrics'}`}>
      <table className="view-report-tbl">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Estimate</th>
          </tr>
        </thead>
        <tbody>
          {usage.rows.map((row) => (
            <tr key={row.key}>
              <td>{row.metric}</td>
              <td className="view-report-mono">{row.estimate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Bar>
  );
}

function Outcomes({ model }: { model: ComposedSessionReport }): React.JSX.Element | null {
  if (model.outcomes.length === 0) return null;
  return (
    <section className="view-report-section">
      <h2 className="view-report-heading">{KEY_OUTCOMES_LABEL}</h2>
      <ol className="view-report-outcomes">
        {model.outcomes.map((item) => (
          <li key={item.key}>
            <span>
              <ResearchInline text={item.text} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Dots({ items }: { items: { key: string; text: string }[] }): React.JSX.Element {
  return (
    <ul className="view-report-dots">
      {items.map((item) => (
        <li key={item.key}>
          <span>
            <ResearchInline text={item.text} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Blockers({ model }: { model: ComposedSessionReport }): React.JSX.Element | null {
  if (model.blockers.length === 0) return null;
  return (
    <section className="view-report-section">
      <h2 className="view-report-heading">{BLOCKERS_LABEL}</h2>
      <div className="view-report-flag">
        <ul>
          {model.blockers.map((blocker) => (
            <li key={blocker.key}>
              <Square tone="in-flight" />
              <span>
                {blocker.tag === null ? null : (
                  <>
                    <span className="status-chip" data-tone="in-flight">
                      {blocker.tag}
                    </span>{' '}
                  </>
                )}
                <ResearchInline text={blocker.text} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SessionBody({ model, renderHtml }: { model: ComposedSessionReport; renderHtml: RenderHtml }): React.JSX.Element {
  const hasDecisions = model.decisions.items.length > 0 || model.decisions.note !== null;
  const left = model.outcomes.length > 0 || model.touched.length > 0 || hasDecisions;
  const right = model.blockers.length > 0 || model.files !== null || model.usage !== null;
  const hasCard = model.numerals.length > 0 || model.ruler !== null || model.progress !== null;
  return (
    <div className="view-report-root">
      {hasCard ? (
        <div className="view-report-card">
          <Numerals numerals={model.numerals} />
          {model.ruler === null ? null : (
            <section className="view-report-band">
              <span className="view-report-micro">{model.ruler.label}</span>
              <Ruler ruler={model.ruler} />
            </section>
          )}
          {model.progress === null ? null : <PhaseProgress progress={model.progress} />}
        </div>
      ) : null}
      {left || right ? (
        <div className="view-report-cols" data-single={left && right ? 'false' : 'true'}>
          {left ? (
            <div className="view-report-col">
              <Outcomes model={model} />
              {model.touched.length === 0 ? null : (
                <section className="view-report-section">
                  <h2 className="view-report-heading">{PHASES_TOUCHED_LABEL}</h2>
                  <Dots items={model.touched} />
                </section>
              )}
              {hasDecisions ? (
                <section className="view-report-section">
                  <h2 className="view-report-heading">{DECISIONS_LABEL}</h2>
                  {model.decisions.items.length > 0 ? (
                    <Dots items={model.decisions.items} />
                  ) : (
                    <p className="view-report-prose view-report-quiet">
                      <ResearchInline text={model.decisions.note ?? ''} />
                    </p>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}
          {right ? (
            <div className="view-report-col">
              <Blockers model={model} />
              {model.files === null && model.usage === null ? null : (
                <div className="view-report-bars">
                  {model.files === null ? null : <FilesBar files={model.files} />}
                  {model.usage === null ? null : <UsageBar usage={model.usage} />}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {model.more.length === 0 ? null : (
        <div className="view-report-bars">
          {model.more.map((section) => (
            <RawBar key={section.key} section={section} renderHtml={renderHtml} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Milestone summary
// ---------------------------------------------------------------------------------------------------------

function PhasesDelivered({ model, id }: { model: ComposedMilestoneReport; id: string | null }): React.JSX.Element | null {
  if (model.phases.length === 0) return null;
  return (
    <section className="view-report-section" id={id ?? undefined}>
      <h2 className="view-report-heading">{PHASES_DELIVERED_LABEL}</h2>
      <div className="view-report-rows">
        {model.phases.map((phase) => (
          <div key={phase.key} className="view-report-drow">
            <Square tone={phase.tone} />
            <div>
              <div className="view-report-drow-title">
                {phase.number === '' ? null : <span className="view-report-mono">{phase.number}</span>}
                <span>{phase.name}</span>
                <span className="status-chip" data-tone={phase.tone}>
                  {phase.status}
                </span>
                {phase.date === null ? null : <span className="view-report-meta">{phase.date}</span>}
              </div>
              {phase.oneLiner === '' ? null : (
                <p className="view-report-quiet">
                  <ResearchInline text={phase.oneLiner} />
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Requirements({ model, id }: { model: ComposedMilestoneReport; id: string | null }): React.JSX.Element | null {
  const { rows, verdict } = model.requirements;
  if (rows.length === 0) return null;
  return (
    <section className="view-report-section" id={id ?? undefined}>
      <h2 className="view-report-heading">{REQUIREMENTS_LABEL}</h2>
      <div className="view-report-reqs">
        {rows.map((row) => (
          <div key={row.key} className="view-report-req">
            <Square tone={row.tone} />
            <div>
              <div className="view-report-req-name">
                {row.name === '' ? null : <span>{row.name}</span>}
                {row.word === null ? null : (
                  <span className="status-chip" data-tone={row.tone}>
                    {row.word}
                  </span>
                )}
                {row.phase === null ? null : <span className="view-report-meta">{row.phase}</span>}
              </div>
              {row.ids.length === 0 ? null : (
                <div className="view-report-ids">
                  {row.ids.map((idText, at) => (
                    <span key={`${at}-${idText}`}>
                      <Square tone={row.tone} />
                      {idText}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {verdict === null ? null : (
        <p className="view-report-verdict">
          <strong>Audit verdict:</strong> <ResearchInline text={verdict} />
        </p>
      )}
    </section>
  );
}

function KeyDecisions({ model, id }: { model: ComposedMilestoneReport; id: string | null }): React.JSX.Element | null {
  const { bars, rows } = model.decisions;
  if (rows.length === 0) return null;
  return (
    <section className="view-report-section" id={id ?? undefined}>
      <h2 className="view-report-heading">{KEY_DECISIONS_LABEL}</h2>
      <ul className="view-report-pbars" aria-label="Decisions per phase">
        {bars.map((bar) => (
          <li key={bar.key}>
            <span>{bar.label}</span>
            <i style={{ width: percent(bar.fill) }} />
            <span className="view-report-pn">{bar.count}</span>
          </li>
        ))}
      </ul>
      <Bar title="Every decision, in the file's order" count={`${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}>
        <div className="view-report-scroll">
          <table className="view-report-tbl">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Phase</th>
                <th scope="col">Decision</th>
                <th scope="col">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="view-report-id">{row.id}</td>
                  <td className="view-report-id">{row.phase}</td>
                  <td>
                    <ResearchInline text={row.decision} />
                  </td>
                  <td className="view-report-quiet">
                    <ResearchInline text={row.rationale} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bar>
    </section>
  );
}

function MilestoneBody({ model, renderHtml }: { model: ComposedMilestoneReport; renderHtml: RenderHtml }): React.JSX.Element {
  const left = model.phases.length > 0 || model.debt !== null;
  const right = model.requirements.rows.length > 0 || model.decisions.rows.length > 0;
  const hasCard = model.numerals.length > 0 || model.ruler !== null;
  return (
    <div className="view-report-root">
      {model.index.length === 0 ? null : (
        <nav className="view-report-idx" aria-label="Sections in order">
          {model.index.map((chip) => (
            <button key={chip.key} type="button" onClick={() => jumpTo(chip.target)}>
              <b>{chip.number}</b>
              {chip.label}
            </button>
          ))}
        </nav>
      )}
      {hasCard ? (
        <div className="view-report-card" id={model.statsId}>
          <Numerals numerals={model.numerals} />
          {model.ruler === null ? null : (
            <section className="view-report-band">
              <span className="view-report-micro">{model.ruler.label}</span>
              <Ruler ruler={model.ruler} />
            </section>
          )}
        </div>
      ) : null}
      {left || right ? (
        <div className="view-report-cols" data-single={left && right ? 'false' : 'true'}>
          {left ? (
            <div className="view-report-col">
              <PhasesDelivered model={model} id={model.anchors.phases} />
              {model.debt === null ? null : <Plain section={model.debt} renderHtml={renderHtml} title={TECH_DEBT_LABEL} />}
            </div>
          ) : null}
          {right ? (
            <div className="view-report-col">
              <Requirements model={model} id={model.anchors.requirements} />
              <KeyDecisions model={model} id={model.anchors.decisions} />
            </div>
          ) : null}
        </div>
      ) : null}
      {model.plain.map((section) => (
        <Plain key={section.key} section={section} renderHtml={renderHtml} />
      ))}
      {model.bars.length === 0 ? null : (
        <div className="view-report-bars">
          {model.bars.map((section) => (
            <RawBar
              key={section.key}
              section={section}
              renderHtml={renderHtml}
              title={section.number === '' ? section.title : `${section.number} · ${section.title}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** The report page: a card of headline numerals over a ruler, then two columns, for a session report or a milestone summary. */
export function ReportView({ model, renderHtml }: { model: ComposedReport; renderHtml?: RenderHtml }): React.JSX.Element {
  return model.variant === 'session' ? (
    <SessionBody model={model} renderHtml={renderHtml} />
  ) : (
    <MilestoneBody model={model} renderHtml={renderHtml} />
  );
}
