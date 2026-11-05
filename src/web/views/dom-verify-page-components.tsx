// The Browser check page's React surface (Phase 10, 10-21, VIEW-12, sketch 051 winner A "Browser window"): the header
// override (eyebrow "Phase N · Browser check", the phase name as the h1, "Wave {n}" and any stated time as meta) and the
// page body. The check is drawn as the browser window it looked through: the bar holds the outcome chip (large, an icon
// and a word, the accessible name carrying the reason) and an address field with the target the body states as mono
// text that end-ellipsises; inside, on a file with criteria, the criteria as tiles grouped Failed, Needs review, Passed
// (each showing what was seen as boxed mono values and, when the line quotes one, "Contract “…”"; a tile opens the full
// observation in a dock under the window); a Could not look file is a shut view (hatched, eye-off, the reason) and a
// Nothing to report file a blank one (a dashed frame, minus-circle, the reason); the status bar holds the counts and
// "{n} checked", or "No criteria were checked." Below, "What the check wrote" is a closed bar. Every string is author
// text rendered as plain React text through ResearchInline - never React's raw-HTML injection prop - and no href is built
// from document text: a target is text, never a link (T-10-39, T-10-40). Colour comes only from the tone a composed model
// carries and the theme tokens; Could not look is `in-flight` and Nothing to report `quiet`, neither ever `complete`.
import { useState } from 'react';
import { ChevronRight, CircleCheck, CircleMinus, CircleQuestionMark, EyeOff } from 'lucide-react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { NO_CRITERIA_IN_FILE_LABEL, NO_CRITERIA_LABEL } from './dom-verify-page.ts';
import type { SpecHeaderProps } from './spec-page-components.tsx';
import type {
  ComposedDomCount,
  ComposedDomCriterion,
  ComposedDomOutcome,
  ComposedDomVerify,
  DomVerifyIcon,
  DomVerifyTone,
} from './dom-verify-page.ts';

/** "Phase 3" read from a title like "DOM verification: Phase 3, wave 2", or null. */
export function phaseOfTitle(title: string): string | null {
  const lower = title.toLowerCase();
  const at = lower.indexOf('phase');
  if (at < 0) return null;
  let i = at + 5;
  while (i < lower.length && lower.charCodeAt(i) === 32) i += 1;
  const start = i;
  while (i < lower.length && ((lower.charCodeAt(i) >= 48 && lower.charCodeAt(i) <= 57) || lower.charCodeAt(i) === 46)) i += 1;
  let end = i;
  while (end > start && lower.charCodeAt(end - 1) === 46) end -= 1;
  return end > start ? `Phase ${lower.slice(start, end)}` : null;
}

function DomVerifyMeta({ model }: { model: ComposedDomVerify }): React.JSX.Element | null {
  if (model.wave === null && model.checkedAt === null) return null;
  return (
    <>
      {model.wave !== null ? <span className="view-dom-verify-meta">Wave {model.wave}</span> : null}
      {model.checkedAt !== null ? <span className="view-dom-verify-meta">Checked {model.checkedAt}</span> : null}
    </>
  );
}

/** The ArtifactHeader override View mode spreads over its props: "Phase N · Browser check", the phase name as the h1 (the
 * file's own title when the page could not resolve one), no lead, and "Wave {n}" as meta. */
export function domVerifyHeaderProps(model: ComposedDomVerify, artifactTitle: string): SpecHeaderProps {
  const phase = model.phase ?? phaseOfTitle(artifactTitle);
  return {
    eyebrow: phase === null ? 'Browser check' : `${phase} · Browser check`,
    title: model.phaseName ?? artifactTitle,
    lead: null,
    meta: <DomVerifyMeta model={model} />,
  };
}

function Square({ tone }: { tone: DomVerifyTone }): React.JSX.Element {
  return <i className="status-square view-dom-verify-sq" data-tone={tone} aria-hidden="true" />;
}

function OutcomeIcon({ icon, className }: { icon: DomVerifyIcon; className: string }): React.JSX.Element {
  switch (icon) {
    case 'check':
      return <CircleCheck className={className} aria-hidden="true" />;
    case 'minus':
      return <CircleMinus className={className} aria-hidden="true" />;
    case 'eye-off':
      return <EyeOff className={className} aria-hidden="true" />;
    default:
      return <CircleQuestionMark className={className} aria-hidden="true" />;
  }
}

/** The outcome chip: shape, icon and word differ per outcome, never colour alone. The chip is one image to a screen
 * reader whose name carries the reason. */
function OutcomeChip({ outcome }: { outcome: ComposedDomOutcome }): React.JSX.Element {
  return (
    <span
      className="status-chip view-dom-verify-outcome"
      data-tone={outcome.tone}
      data-outcome={outcome.raw ?? 'not-stated'}
      role="img"
      aria-label={outcome.ariaLabel}
    >
      <OutcomeIcon icon={outcome.icon} className="view-dom-verify-icon" />
      <span className={outcome.mono ? 'view-dom-verify-mono' : undefined}>{outcome.word}</span>
    </span>
  );
}

function Address({ targets }: { targets: readonly string[] }): React.JSX.Element {
  if (targets.length === 0) return <span className="view-dom-verify-addr" data-empty="true" aria-hidden="true" />;
  return (
    <span className="view-dom-verify-addr" aria-label="Target">
      {targets.map((target) => (
        <code key={target} className="view-dom-verify-path" title={target}>
          {target}
        </code>
      ))}
    </span>
  );
}

function Tile({
  criterion,
  total,
  selected,
  onSelect,
}: {
  criterion: ComposedDomCriterion;
  total: number;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="view-dom-verify-tile"
      data-tone={criterion.tone}
      data-criterion={criterion.index}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="sr-only">
        Criterion {criterion.no} of {total}, {criterion.label}:{' '}
      </span>
      {criterion.seen.length > 0 ? (
        <span className="view-dom-verify-el">
          {criterion.seen.map((value, index) => (
            <span key={index} className="view-dom-verify-box">
              {value}
            </span>
          ))}
        </span>
      ) : (
        <span className="view-dom-verify-el" data-text="true">
          <ResearchInline text={criterion.text} />
        </span>
      )}
      {criterion.contract !== null ? (
        <span className="view-dom-verify-asks">Contract “{criterion.contract}”</span>
      ) : null}
    </button>
  );
}

function Dock({
  criterion,
  total,
  onClose,
}: {
  criterion: ComposedDomCriterion;
  total: number;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div className="view-dom-verify-dock">
      <div className="view-dom-verify-dock-head">
        <span className="view-dom-verify-key">
          Criterion {criterion.no} of {total}
        </span>
        <span className="status-chip" data-tone={criterion.tone}>
          <Square tone={criterion.tone} />
          {criterion.label}
        </span>
        <button type="button" className="view-dom-verify-close" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="view-dom-verify-prose">
        <ResearchInline text={criterion.text} />
      </p>
    </div>
  );
}

function Counts({ counts, rowCounts }: { counts: readonly ComposedDomCount[]; rowCounts: ComposedDomVerify['rowCounts'] }): React.JSX.Element {
  return (
    <span className="view-dom-verify-counts-wrap">
      <span className="view-dom-verify-counts">
        {counts.map((count) => (
          <span key={count.key} className="view-dom-verify-cnt">
            <Square tone={count.tone} />
            <span className="view-dom-verify-num">{count.value}</span>
            <span className="view-dom-verify-key">{count.label}</span>
          </span>
        ))}
      </span>
      {rowCounts !== null ? (
        <span className="view-dom-verify-note">
          Lines in the file: {rowCounts.passed} passed, {rowCounts.failed} failed, {rowCounts.needsReview} needs review.
        </span>
      ) : null}
    </span>
  );
}

/** The reason card: the copy table's sentence (when the reason has one) and the raw value in mono. */
function Why({ reason }: { reason: NonNullable<ComposedDomVerify['reason']> }): React.JSX.Element {
  return (
    <div className="view-dom-verify-why">
      {reason.sentence !== null ? <p className="view-dom-verify-why-sentence">{reason.sentence}</p> : null}
      <code className="view-dom-verify-raw">reason: {reason.raw}</code>
    </div>
  );
}

/** What stands in the window when there is nothing to list: Could not look is shut (hatched, eye-off), anything else is
 * blank (a dashed frame). Either way the reason sits on a card, and neither ever takes a pass tone. */
function Empty({ model }: { model: ComposedDomVerify }): React.JSX.Element {
  return (
    <div className="view-dom-verify-view" data-view={model.view}>
      <OutcomeIcon icon={model.outcome.icon} className="view-dom-verify-bigicon" />
      {model.reason !== null ? (
        <Why reason={model.reason} />
      ) : model.noCriteria ? null : (
        <p className="view-dom-verify-na">
          <Square tone="quiet" />
          <span>{NO_CRITERIA_IN_FILE_LABEL}</span>
        </p>
      )}
    </div>
  );
}

function Tiles({
  model,
  selection,
  onSelect,
}: {
  model: ComposedDomVerify;
  selection: number | null;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  return (
    <div className="view-dom-verify-view">
      <div className="view-dom-verify-groups">
        {model.groups.map((group) => (
          <section key={group.result} className="view-dom-verify-group" aria-label={group.label}>
            <h2 className="view-dom-verify-key view-dom-verify-ghead">
              <Square tone={group.tone} />
              {group.label} · {group.items.length}
            </h2>
            <div className="view-dom-verify-tiles">
              {group.items.map((index) => (
                <Tile
                  key={index}
                  criterion={model.criteria[index]}
                  total={model.criteria.length}
                  selected={selection === index}
                  onSelect={() => onSelect(index)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Window({
  model,
  selection,
  onSelect,
}: {
  model: ComposedDomVerify;
  selection: number | null;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  const hasStatus = model.noCriteria || model.counts.length > 0 || model.checked !== null;
  return (
    <figure className="view-dom-verify-window" aria-label="The browser check">
      <div className="view-dom-verify-chrome">
        <span className="view-dom-verify-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <OutcomeChip outcome={model.outcome} />
        <Address targets={model.targets} />
      </div>
      {model.view === 'tiles' ? <Tiles model={model} selection={selection} onSelect={onSelect} /> : <Empty model={model} />}
      {hasStatus ? (
        <div className="view-dom-verify-status">
          {model.noCriteria ? (
            <p className="view-dom-verify-na">
              <Square tone="quiet" />
              <span>{NO_CRITERIA_LABEL}</span>
            </p>
          ) : (
            <Counts counts={model.counts} rowCounts={model.rowCounts} />
          )}
          {model.checked !== null ? <span className="view-dom-verify-meta">{model.checked} checked</span> : null}
        </div>
      ) : null}
    </figure>
  );
}

/** "What the check wrote": the body's paragraphs as a closed native bar. */
function Wrote({ paragraphs }: { paragraphs: readonly string[] }): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (paragraphs.length === 0) return null;
  return (
    <div className="view-dom-verify-bars">
      <details className="view-dom-verify-wrote" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="view-dom-verify-wrote-sum">
          <ChevronRight className="view-dom-verify-chev" aria-hidden="true" />
          <span className="view-dom-verify-wrote-name">What the check wrote</span>
          <span className="view-dom-verify-wrote-count">
            {paragraphs.length} {paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}
          </span>
        </summary>
        <div className="view-dom-verify-wrote-body">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="view-dom-verify-prose">
              <ResearchInline text={paragraph} />
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}

export function DomVerifyView({ model }: { model: ComposedDomVerify }): React.JSX.Element {
  const [selection, setSelection] = useState<number | null>(null);
  const toggle = (index: number): void => setSelection((current) => (current === index ? null : index));
  const selected = selection === null ? null : (model.criteria[selection] ?? null);
  return (
    <div className="view-dom-verify-page">
      <Window model={model} selection={selection} onSelect={toggle} />
      {selected !== null ? (
        <Dock criterion={selected} total={model.criteria.length} onClose={() => setSelection(null)} />
      ) : null}
      <Wrote paragraphs={model.paragraphs} />
    </div>
  );
}
