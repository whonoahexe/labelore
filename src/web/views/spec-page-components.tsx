// The Spec page's React surface (Phase 10, 10-16, VIEW-11, sketch 047 winner B "Lock matrix"): the header override
// (eyebrow "Phase N · Spec", the phase name as the h1, "Created {date}" and "{n} requirements locked" in the meta
// row) and the page body. The first screen is a picture: a strip of five column gauges (the verdict and the
// ambiguity column against the gate, then one column per dimension against its minimum) over the requirements
// matrix (Current, Target and Acceptance as neutral squares, a missing Acceptance as the quiet "No acceptance
// stated" chip; a row opens in place to the statement and the labelled fields). Prose opens on demand and the
// sections stay below. Every string is author text rendered as plain React text through ResearchInline - never
// React's raw-HTML injection prop - and no href is built from document text. Colour comes only from the tone a
// composed model carries and the theme tokens; nothing here is destructive, a warning or drawn missing: above the
// gate is waiting (`in-flight`), not failure.
import { useId, useState } from 'react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { splitPhaseTitle } from '../pages/document-title.ts';
import { NOT_SCORED_LABEL, NO_ACCEPTANCE_LABEL, UNSCORED_COLUMNS } from './spec-page.ts';
import type {
  ComposedSpec,
  ComposedSpecColumn,
  ComposedSpecField,
  ComposedSpecRequirement,
} from './spec-page.ts';

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props, and a Partial keeps
 * TypeScript from flagging the intentional override. The breadcrumb row stays, and the manifest lead is dropped. */
export type SpecHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  meta: React.ReactNode;
}>;

function SpecMeta({ model }: { model: ComposedSpec }): React.JSX.Element | null {
  if (model.created === null && model.countLine === null) return null;
  return (
    <>
      {model.created !== null ? (
        <span className="view-spec-meta">Created {model.created}</span>
      ) : null}
      {model.countLine !== null ? <span className="view-spec-meta">{model.countLine}</span> : null}
    </>
  );
}

/** The ArtifactHeader override View mode spreads over its props: "Phase N · Spec", the phase name as the h1 (the
 * file's " — Specification" suffix dropped), no lead, and the created date and requirement count as meta. */
export function specHeaderProps(model: ComposedSpec, artifactTitle: string): SpecHeaderProps {
  const split = splitPhaseTitle(artifactTitle, 'Specification');
  return {
    eyebrow: split.phase === null ? 'Spec' : `${split.phase} · Spec`,
    title: split.title,
    lead: null,
    meta: <SpecMeta model={model} />,
  };
}

function Gauge({ column }: { column: ComposedSpecColumn }): React.JSX.Element {
  return (
    <div className="view-spec-col" role="img" aria-label={column.ariaLabel}>
      {column.lowerIsBetter && column.mark !== null ? (
        <span className="view-spec-col-zone" style={{ height: `${column.mark}%` }} />
      ) : null}
      {column.empty || column.fill === null ? (
        <span className="view-spec-col-empty" />
      ) : (
        <span
          className="view-spec-col-fill"
          data-tone={column.fillTone}
          style={{ height: `${column.fill}%` }}
        />
      )}
      {column.mark !== null ? (
        <span className="view-spec-col-line" style={{ bottom: `${column.mark}%` }} />
      ) : null}
    </div>
  );
}

function VerdictCell({ model }: { model: ComposedSpec }): React.JSX.Element {
  const { verdict } = model;
  return (
    <div className="view-spec-cell view-spec-lead">
      <span className="status-chip view-spec-verdict" data-tone={verdict.tone}>
        <i className="status-square" data-tone={verdict.tone} aria-hidden="true" />
        {verdict.label}
      </span>
      {verdict.numbers !== null ? (
        <p className="view-spec-numbers">
          <b>{verdict.scoreText}</b> against a gate of <b>{verdict.gateText}</b>
        </p>
      ) : (
        <p className="view-spec-numbers view-spec-numbers-none source-note">{verdict.note}</p>
      )}
      <div className="view-spec-lead-foot">
        {verdict.numbers !== null && verdict.note !== null ? (
          <span className="view-spec-meta">{verdict.note}</span>
        ) : null}
        <p className="view-spec-key">Ambiguity · lower is better</p>
      </div>
      <Gauge column={model.ambiguity} />
    </div>
  );
}

function DimensionCell({ column }: { column: ComposedSpecColumn }): React.JSX.Element {
  return (
    <div className="view-spec-cell" title={column.title ?? undefined}>
      <p className="view-spec-key">{column.label}</p>
      <Gauge column={column} />
      <div className="view-spec-val">
        {column.valueText !== null ? (
          <span className="view-spec-num">{column.valueText}</span>
        ) : null}
        {column.markerText !== null ? (
          <span className="view-spec-meta">{column.markerText}</span>
        ) : null}
        {column.statusLabel !== null ? (
          <span className="view-spec-status" data-tone={column.statusTone ?? undefined}>
            <i
              className="status-square"
              data-tone={column.statusTone ?? undefined}
              role="img"
              aria-label={column.statusLabel}
            />
            <span aria-hidden="true">{column.statusLabel}</span>
          </span>
        ) : null}
        {column.valueText === null ? (
          <span className="view-spec-meta">{NOT_SCORED_LABEL}</span>
        ) : null}
      </div>
    </div>
  );
}

function UnscoredCell({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="view-spec-cell">
      <p className="view-spec-key">{label}</p>
      <div className="view-spec-col">
        <span className="view-spec-col-empty" />
      </div>
      <div className="view-spec-val">
        <span className="view-spec-meta">{NOT_SCORED_LABEL}</span>
      </div>
    </div>
  );
}

function Strip({ model }: { model: ComposedSpec }): React.JSX.Element {
  const columns = Math.min(Math.max(model.dimensions.length, 1), 6);
  return (
    <section
      className="view-spec-strip"
      aria-label={model.verdict.label}
      style={
        {
          '--view-spec-dims': model.dimensions.length === 0 ? UNSCORED_COLUMNS.length : columns,
        } as React.CSSProperties
      }
    >
      <VerdictCell model={model} />
      {model.dimensions.length > 0
        ? model.dimensions.map((column) => <DimensionCell key={column.key} column={column} />)
        : UNSCORED_COLUMNS.map((label) => <UnscoredCell key={label} label={label} />)}
    </section>
  );
}

/** Text that folds behind an in-place "Read more" once it is long. */
function FoldedText({ text, long }: { text: string; long: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const clamped = long && !open;
  return (
    <>
      <div className="view-spec-text" data-clamped={clamped ? 'true' : 'false'}>
        <ResearchInline text={text} />
      </div>
      {long ? (
        <button
          type="button"
          className="view-spec-more"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </>
  );
}

function NoAcceptanceChip(): React.JSX.Element {
  return (
    <span className="status-chip view-spec-no-acceptance" data-tone="quiet">
      <i className="status-square" data-tone="quiet" aria-hidden="true" />
      {NO_ACCEPTANCE_LABEL}
    </span>
  );
}

function FieldCell({ field }: { field: ComposedSpecField }): React.JSX.Element {
  return (
    <span className="view-spec-field-cell" data-label={field.label}>
      {field.value !== null ? (
        <i
          className="status-square view-spec-square"
          role="img"
          aria-label={`${field.label} stated`}
        />
      ) : field.key === 'acceptance' ? (
        <NoAcceptanceChip />
      ) : (
        <i
          className="status-square view-spec-square"
          data-tone="quiet"
          role="img"
          aria-label={`${field.label} not stated`}
        />
      )}
    </span>
  );
}

function OpenRequirement({
  requirement,
  id,
}: {
  requirement: ComposedSpecRequirement;
  id: string;
}): React.JSX.Element {
  return (
    <div
      className="view-spec-open"
      id={id}
      role="region"
      aria-label={`Requirement ${requirement.n}`}
    >
      {requirement.statement !== '' ? (
        <FoldedText text={requirement.statement} long={requirement.statementLong} />
      ) : null}
      <dl className="view-spec-fields">
        {requirement.fields.map((field) =>
          field.value !== null ? (
            <div key={field.key}>
              <dt className="view-spec-key">{field.label}</dt>
              <dd>
                <FoldedText text={field.value} long={field.long} />
              </dd>
            </div>
          ) : field.key === 'acceptance' ? (
            <div key={field.key}>
              <dt className="view-spec-key">{field.label}</dt>
              <dd>
                <NoAcceptanceChip />
              </dd>
            </div>
          ) : null,
        )}
      </dl>
      {requirement.extras.length > 0 ? (
        <ul className="view-spec-extras">
          {requirement.extras.map((extra, index) => (
            <li key={index}>
              <ResearchInline text={extra} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RequirementRow({
  requirement,
}: {
  requirement: ComposedSpecRequirement;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <li className="view-spec-item">
      <button
        type="button"
        className="view-spec-row"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="view-spec-no">{requirement.n}</span>
        <span className="view-spec-label" title={requirement.label}>
          <ResearchInline text={requirement.label} />
        </span>
        {requirement.fields.map((field) => (
          <FieldCell key={field.key} field={field} />
        ))}
      </button>
      {open ? <OpenRequirement requirement={requirement} id={panelId} /> : null}
    </li>
  );
}

function Matrix({ model }: { model: ComposedSpec }): React.JSX.Element | null {
  if (model.requirements.length === 0) return null;
  return (
    <section className="view-spec-block" aria-labelledby="view-spec-requirements-h">
      <div className="view-spec-block-head">
        <h2 className="view-spec-h" id="view-spec-requirements-h">
          Requirements
        </h2>
        {model.countLine !== null ? (
          <span className="view-spec-meta">{model.countLine}</span>
        ) : null}
      </div>
      <div className="view-spec-matrix">
        <div className="view-spec-matrix-head" aria-hidden="true">
          <span className="view-spec-key">#</span>
          <span className="view-spec-key">Requirement</span>
          <span className="view-spec-key">Current</span>
          <span className="view-spec-key">Target</span>
          <span className="view-spec-key">Acceptance</span>
        </div>
        <ol className="view-spec-items">
          {model.requirements.map((requirement, index) => (
            <RequirementRow key={`${requirement.n}-${index}`} requirement={requirement} />
          ))}
        </ol>
        <div className="view-spec-matrix-key">
          <span>
            <i className="status-square view-spec-square" aria-hidden="true" />
            field stated
          </span>
          <span>
            <i className="status-square" data-tone="quiet" aria-hidden="true" />
            not stated
          </span>
        </div>
      </div>
      {model.omittedNote !== null ? <p className="source-note">{model.omittedNote}</p> : null}
    </section>
  );
}

export function SpecView({ model }: { model: ComposedSpec }): React.JSX.Element {
  return (
    <div className="view-spec-page">
      <Strip model={model} />
      {model.goal !== null ? (
        <section className="view-spec-goal" aria-label="Goal">
          <p className="view-spec-key">Goal</p>
          <p className="view-spec-goal-text">
            <ResearchInline text={model.goal} />
          </p>
        </section>
      ) : null}
      <Matrix model={model} />
    </div>
  );
}
