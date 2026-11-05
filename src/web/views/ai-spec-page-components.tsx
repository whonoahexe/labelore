// The AI spec page's React surface (Phase 10, 10-18, VIEW-11, sketch 048 winner C "Datasheet + eval matrix"): the
// header override (eyebrow "Phase N · AI spec", the phase name as the h1) and the page body. The first screen is a
// picture: a ruled datasheet of four field cells (System type, Framework and its version, Stakes level, Vendor
// lock-in; a cell with no value is hatched and says "Template slot"), the lead "{n} of {m} sections are still
// template slots" over a strip of one square per numbered section beside the checklist meter, and the evaluation
// dimensions placed by Priority and Measurement. Prose opens on demand: a dimension chip opens its rubric, a written
// section's square opens its bar. An unfilled template slot is a dashed row with its heading, the quiet chip and a
// Source link; nothing opens and its text is never drawn. Every string is author text rendered as plain React text
// through ResearchInline - never React's raw-HTML injection prop - and no href is built from document text. Colour
// comes only from the tone a composed model carries and the theme tokens; nothing here is destructive, a warning or
// drawn missing: an unfilled slot is `quiet`, never a failure.
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { splitPhaseTitle } from '../pages/document-title.ts';
import { StatusMeter } from '../components/status-meter.tsx';
import { stripLeadingHeading } from './document-sections.ts';
import { MEASUREMENT_COLUMNS, PRIORITY_ROWS, TEMPLATE_SLOT_LABEL } from './ai-spec-page.ts';
import type { SpecHeaderProps } from './spec-page-components.tsx';
import type {
  ComposedAiSpec,
  ComposedAiSpecBar,
  ComposedAiSpecCell,
  ComposedAiSpecDimension,
  ComposedAiSpecMatrix,
  ComposedAiSpecSlotRow,
} from './ai-spec-page.ts';

/** "AI-SPEC — Phase 4: Bulk Loan Export" as the eyebrow and the h1 it names: the document kind and the dash are
 * dropped, then the phase moves up as `splitPhaseTitle` does for every phase document. A title that does not read
 * that way stays whole under the plain eyebrow "AI spec". */
export function splitAiSpecTitle(title: string): { phase: string | null; title: string } {
  let rest = title.trim();
  if (rest.toLowerCase().startsWith('ai-spec')) {
    rest = rest.slice(7).trim();
    const dash = rest.charAt(0);
    if (dash === '—' || dash === '–' || dash === '-') rest = rest.slice(1).trim();
  }
  const split = splitPhaseTitle(rest, 'AI spec');
  return split.phase === null ? { phase: null, title } : split;
}

/** The ArtifactHeader override View mode spreads over its props: "Phase N · AI spec", the phase name as the h1, no
 * lead and no meta (the datasheet below carries what the header would repeat). */
export function aiSpecHeaderProps(_model: ComposedAiSpec, artifactTitle: string): SpecHeaderProps {
  const split = splitAiSpecTitle(artifactTitle);
  return {
    eyebrow: split.phase === null ? 'AI spec' : `${split.phase} · AI spec`,
    title: split.title,
    lead: null,
    meta: null,
  };
}

function SlotChip(): React.JSX.Element {
  return (
    <span className="status-chip view-ai-spec-slot-chip" data-tone="quiet">
      <i className="status-square view-ai-spec-sq-s" data-tone="quiet" aria-hidden="true" />
      {TEMPLATE_SLOT_LABEL}
    </span>
  );
}

function Cell({ cell }: { cell: ComposedAiSpecCell }): React.JSX.Element {
  return (
    <div className="view-ai-spec-cell" data-slot={cell.value === null ? 'true' : 'false'}>
      <span className="view-ai-spec-key">{cell.label}</span>
      {cell.value === null ? (
        <SlotChip />
      ) : (
        <>
          <span className="view-ai-spec-val">
            <ResearchInline text={cell.value} />
          </span>
          {cell.note !== null && cell.noteKind === 'version' ? (
            <span className="view-ai-spec-meta">
              Version <code>{cell.note}</code>
            </span>
          ) : null}
          {cell.note !== null && cell.noteKind === 'reason' ? (
            <span className="source-note">
              <ResearchInline text={cell.note} />
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

function Datasheet({ model }: { model: ComposedAiSpec }): React.JSX.Element {
  return (
    <section className="view-ai-spec-sheet" aria-label="System">
      {model.cells.map((cell) => (
        <Cell key={cell.key} cell={cell} />
      ))}
    </section>
  );
}

function SectionStrip({
  model,
  onJump,
}: {
  model: ComposedAiSpec;
  onJump: (targetId: string, slot: boolean) => void;
}): React.JSX.Element | null {
  if (model.strip.length === 0) return null;
  const lead = model.slotLead;
  const split = lead === null ? -1 : lead.indexOf(' sections');
  return (
    <div className="view-ai-spec-sections">
      {lead !== null && split > 0 ? (
        <p className="view-ai-spec-lead">
          <b>{lead.slice(0, split)}</b>
          {lead.slice(split)}
        </p>
      ) : (
        <p className="view-ai-spec-key">Sections</p>
      )}
      <div className="view-ai-spec-strip" role="group" aria-label="Sections">
        {model.strip.map((item) => (
          <button
            key={item.number}
            type="button"
            className="view-ai-spec-strip-btn"
            title={item.slot ? `${item.heading} · ${TEMPLATE_SLOT_LABEL}` : item.heading}
            aria-label={item.slot ? `${item.heading}, ${TEMPLATE_SLOT_LABEL}` : item.heading}
            onClick={() => onJump(item.targetId, item.slot)}
          >
            <i
              className="status-square view-ai-spec-sq-l"
              data-tone={item.slot ? 'quiet' : undefined}
              aria-hidden="true"
            />
            <span className="view-ai-spec-strip-no" aria-hidden="true">
              {item.number}
            </span>
          </button>
        ))}
      </div>
      <span className="view-ai-spec-meta view-ai-spec-legend">
        <i className="status-square view-ai-spec-sq-s" aria-hidden="true" /> written{' · '}
        <i className="status-square view-ai-spec-sq-s" data-tone="quiet" aria-hidden="true" />{' '}
        {TEMPLATE_SLOT_LABEL}
      </span>
    </div>
  );
}

function ProgressRow({ model, onJump }: { model: ComposedAiSpec; onJump: (targetId: string, slot: boolean) => void }): React.JSX.Element {
  const { progress } = model;
  return (
    <section className="view-ai-spec-progress-row" aria-label="Sections and checklist">
      <SectionStrip model={model} onJump={onJump} />
      {progress !== null ? (
        <div className="view-ai-spec-checklist">
          <p className="view-ai-spec-key">Checklist</p>
          <StatusMeter
            filled={progress.done}
            total={progress.total}
            items={progress.items ?? undefined}
            label={progress.label}
            size="large"
            caption={
              <>
                <b>
                  {progress.done} of {progress.total}
                </b>{' '}
                checklist items done
              </>
            }
          />
        </div>
      ) : null}
    </section>
  );
}

function DimensionChip({
  dimension,
  selected,
  onSelect,
}: {
  dimension: ComposedAiSpecDimension;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="status-chip view-ai-spec-dim"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <ResearchInline text={dimension.name} />
    </button>
  );
}

function Matrix({
  matrix,
  dimensions,
  selected,
  onSelect,
}: {
  matrix: ComposedAiSpecMatrix;
  dimensions: ComposedAiSpecDimension[];
  selected: number | null;
  onSelect: (position: number) => void;
}): React.JSX.Element {
  return (
    <>
      <table className="view-ai-spec-matrix">
        <caption className="sr-only">Evaluation dimensions by measurement and priority</caption>
        <thead>
          <tr>
            <th scope="col" className="view-ai-spec-key">
              Priority
            </th>
            {MEASUREMENT_COLUMNS.map((measurement) => (
              <th key={measurement} scope="col" className="view-ai-spec-key">
                {measurement}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRIORITY_ROWS.map((priority) => (
            <tr key={priority}>
              <th scope="row" className="view-ai-spec-key">
                {priority}
              </th>
              {MEASUREMENT_COLUMNS.map((measurement) => {
                const cell = matrix.cells.find(
                  (c) => c.priority === priority && c.measurement === measurement,
                );
                return (
                  <td key={measurement}>
                    <div className="view-ai-spec-mc">
                      {(cell?.dimensions ?? []).map((position) => (
                        <DimensionChip
                          key={position}
                          dimension={dimensions[position]}
                          selected={selected === position}
                          onSelect={() => onSelect(position)}
                        />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {matrix.unplaced.length > 0 ? (
        <div className="view-ai-spec-unplaced">
          <span className="view-ai-spec-key">Not placed in the grid</span>
          <div className="view-ai-spec-mc">
            {matrix.unplaced.map((position) => (
              <DimensionChip
                key={position}
                dimension={dimensions[position]}
                selected={selected === position}
                onSelect={() => onSelect(position)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Dock({
  dimension,
  onClose,
}: {
  dimension: ComposedAiSpecDimension;
  onClose: () => void;
}): React.JSX.Element {
  const fields: [string, string][] = [
    ['Rubric', dimension.rubric],
    ['Measurement', dimension.measurement],
    ['Priority', dimension.priority],
  ];
  return (
    <div className="view-ai-spec-dock" role="region" aria-label={`Evaluation dimension: ${dimension.name}`}>
      <div className="view-ai-spec-dock-head">
        <span className="view-ai-spec-key">Evaluation dimension</span>
        <h3 className="view-ai-spec-dock-title">
          <ResearchInline text={dimension.name} />
        </h3>
        <button type="button" className="view-ai-spec-close" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="view-ai-spec-fields">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="view-ai-spec-key">{label}</dt>
            <dd>{value === '' ? <span className="view-ai-spec-meta">Not stated</span> : <ResearchInline text={value} />}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Evaluation({ model }: { model: ComposedAiSpec }): React.JSX.Element {
  const [selected, setSelected] = useState<number | null>(null);
  const dimension = selected === null ? null : (model.dimensions[selected] ?? null);
  return (
    <section className="view-ai-spec-block" aria-labelledby="view-ai-spec-eval-h">
      <div className="view-ai-spec-block-head">
        <h2 className="view-ai-spec-h" id="view-ai-spec-eval-h">
          Evaluation dimensions
        </h2>
        {model.dimensions.length > 0 ? (
          <span className="view-ai-spec-meta">
            {model.dimensions.length} · placed by measurement and priority
          </span>
        ) : null}
      </div>
      {model.matrix === null ? (
        <div className="view-ai-spec-matrix-slot">
          <SlotChip />
        </div>
      ) : (
        <Matrix
          matrix={model.matrix}
          dimensions={model.dimensions}
          selected={selected}
          onSelect={(position) => setSelected((current) => (current === position ? null : position))}
        />
      )}
      {dimension !== null ? <Dock dimension={dimension} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

/** A section the file has not written: a dashed row with its heading, the quiet chip and a Source link. Nothing
 * opens and none of the section's own text is drawn. */
function SlotRow({
  row,
  onShowSource,
}: {
  row: ComposedAiSpecSlotRow;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  return (
    <div className="view-ai-spec-slot" id={row.id} data-slot="true">
      <i className="status-square view-ai-spec-sq-s" data-tone="quiet" aria-hidden="true" />
      <span className="view-ai-spec-slot-name">
        <ResearchInline text={row.heading} />
      </span>
      <SlotChip />
      <button type="button" className="view-ai-spec-source" onClick={() => onShowSource(row.sourceId)}>
        Source
      </button>
    </div>
  );
}

/** A written section: a closed native bar holding the section as the document renders it. */
function Bar({
  row,
  open,
  onToggle,
  renderHtml,
}: {
  row: ComposedAiSpecBar;
  open: boolean;
  onToggle: (open: boolean) => void;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  return (
    <details
      className="view-ai-spec-bar"
      id={row.id}
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary className="view-ai-spec-bar-sum">
        <ChevronRight className="view-ai-spec-bar-chev" aria-hidden="true" />
        {row.number !== null ? <i className="status-square view-ai-spec-sq-s" aria-hidden="true" /> : null}
        <span className="view-ai-spec-bar-name">
          <ResearchInline text={row.heading} />
        </span>
        {row.count !== null ? <span className="view-ai-spec-bar-count">{row.count}</span> : null}
      </summary>
      <div className="view-ai-spec-bar-body view-ai-spec-plain-section">
        {renderHtml(stripLeadingHeading(row.html))}
      </div>
    </details>
  );
}

export function AiSpecView({
  model,
  renderHtml,
  onShowSource,
}: {
  model: ComposedAiSpec;
  renderHtml: (html: string) => React.ReactNode;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const setOpen = (id: string, open: boolean): void => {
    setOpenIds((current) => {
      if (current.has(id) === open) return current;
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const jump = (targetId: string, slot: boolean): void => {
    if (!slot) setOpen(targetId, true);
    requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'center' });
    });
  };
  return (
    <div className="view-ai-spec-page">
      <Datasheet model={model} />
      <ProgressRow model={model} onJump={jump} />
      <Evaluation model={model} />
      {model.rows.length > 0 ? (
        <div className="view-ai-spec-bars">
          {model.rows.map((row) =>
            row.kind === 'slot' ? (
              <SlotRow key={row.id} row={row} onShowSource={onShowSource} />
            ) : (
              <Bar
                key={row.id}
                row={row}
                open={openIds.has(row.id)}
                onToggle={(open) => setOpen(row.id, open)}
                renderHtml={renderHtml}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
