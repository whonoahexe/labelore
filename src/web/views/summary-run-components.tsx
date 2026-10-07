// The SUMMARY page's React surface (quick-261006-iz7, sketch 020 winner D): the B head — meta row,
// title, one-liner, the Tasks / Files / Requirements modal triggers and the metrics box with the
// Type and Self-check chips — then the C body: Outcome (a count line and one row per accomplishment,
// with proof pills that jump to the matching Proof row), How the run went (a timeline with every
// deviation hanging off its task, then the full deviation cards), Proof, Decisions | Patterns,
// Also in this summary, Waiting on a human, Where it sits, Next and the "In the source only" strip.
// Every string derived from the document renders only through `ResearchInline` / `ResearchBlocks`
// (tokenizeInline output mapped to React nodes) or as plain React text — never React's raw-HTML
// injection prop (T-iz7-02), and no link target is built from document text (T-iz7-03): a `Link`
// goes only where `requirementPreviews` / `lineageLinks` (server-generated route builders over the
// presentation) point. Hashes and paths are copy buttons or mono text. Colour comes only from the
// tone a composed model carries (the maps in `summary-run.ts`) and the theme tokens; the
// parse-degradation tones never appear on document content.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PreviewCard } from '@base-ui/react/preview-card';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { CopyPathButton, copyText } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.tsx';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import {
  DEPENDENCY_TONE,
  DEVIATION_TONE,
  HUMAN_TONE,
  KIND_TONE,
  NEW_FILE_TONE,
  REQ_STATE,
  SETUP_TONE,
  TYPE_TONE,
  WAIT_TONE,
  lineageLinks,
  requirementPreviews,
} from './summary-run.ts';
import type {
  ComposedDeviationCard,
  ComposedFileRow,
  ComposedLooseSection,
  ComposedOutcome,
  ComposedProofRow,
  ComposedRequirementRef,
  ComposedRun,
  ComposedStop,
  ComposedSummaryRun,
  ComposedTaskRow,
  RequirementPreview,
  SummaryPresentation,
} from './summary-run.ts';

type ModalKey = 'tasks' | 'files' | 'reqs';

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

/** A commit hash as a copy button: "Copy {hash}" until it has been copied, then "Copied". */
function HashButton({
  hash,
  copied,
  onCopy,
}: {
  hash: string;
  copied: boolean;
  onCopy: (hash: string) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="view-summary-hash"
      aria-label={`Copy ${hash}`}
      title={`Copy ${hash}`}
      data-copied={copied ? 'true' : 'false'}
      onClick={() => onCopy(hash)}
    >
      {copied ? 'Copied' : hash}
    </button>
  );
}

function Heading({ id, title, aside }: { id?: string; title: string; aside?: string | null }): React.JSX.Element {
  return (
    <header className="view-summary-heading" id={id}>
      <h2>{title}</h2>
      {aside ? <span className="view-summary-aside">{aside}</span> : null}
    </header>
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// ---------------------------------------------------------------------------
// Requirement preview — a hover / focus card in the app's reference-preview look
// ---------------------------------------------------------------------------

export function RequirementPreviewCard({ preview }: { preview: RequirementPreview }): React.JSX.Element {
  return (
    <>
      <div className="reference-preview-heading">
        <div>
          <p className="eyebrow">Requirement</p>
          <h2>{preview.id}</h2>
        </div>
      </div>
      <p className="view-summary-preview-text">
        {preview.found && preview.text !== null ? <ResearchInline text={preview.text} /> : preview.notFound}
      </p>
      <dl className="reference-preview-facts">
        <div>
          <dt>Status</dt>
          <dd>{preview.status}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{preview.location}</dd>
        </div>
        <div>
          <dt>Phase</dt>
          <dd>{preview.phase}</dd>
        </div>
      </dl>
      {preview.url !== null ? (
        <Link className="reference-preview-open" to={preview.url}>
          Open
          <ArrowUpRight aria-hidden="true" />
        </Link>
      ) : null}
    </>
  );
}

/** A requirement ID that opens its preview on hover (after ~200 ms) and on keyboard focus, and
 * closes on leave, blur or Escape. The card never takes focus. */
function RequirementRef({
  id,
  state,
  preview,
}: {
  id: string;
  state: ComposedRequirementRef['state'];
  preview: RequirementPreview;
}): React.JSX.Element {
  // Controlled: Base UI opens the card on hover; keyboard focus opens it from the handler below
  // (only a keyboard-modality focus, so the dialog's own initial focus does not pop a card). The
  // card never takes focus; blur closes it unless focus is moving into the card itself.
  const [open, setOpen] = useState(false);
  return (
    <PreviewCard.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <PreviewCard.Trigger
        delay={200}
        closeDelay={150}
        render={
          <button
            type="button"
            className="view-summary-req"
            data-state={state}
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible')) setOpen(true);
            }}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (next instanceof Element && next.closest('.reference-preview') !== null) return;
              setOpen(false);
            }}
          />
        }
      >
        {id}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner className="reference-preview-positioner" sideOffset={8} align="start">
          <PreviewCard.Popup className="reference-preview">
            <RequirementPreviewCard preview={preview} />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

// ---------------------------------------------------------------------------
// Modal bodies
// ---------------------------------------------------------------------------

export function TasksModalBody({
  tasks,
  copiedHash,
  onCopy,
}: {
  tasks: ComposedSummaryRun['modals']['tasks'];
  copiedHash: string | null;
  onCopy: (hash: string) => void;
}): React.JSX.Element {
  if (tasks.rows.length === 0) {
    return (
      <p className="view-summary-muted">
        This summary records {plural(tasks.commitCount, 'commit', 'commits')} but no per-task list.
      </p>
    );
  }
  return (
    <>
      <div className="view-summary-modal-group">
        {tasks.rows.map((task: ComposedTaskRow) => (
          <div key={task.n} className="view-summary-modal-row">
            <span>
              {task.name !== null ? <ResearchInline text={task.name} /> : <span className="view-summary-muted">Task {task.n}</span>}
            </span>
            <span className="view-summary-chips">
              {task.kinds.map((kind) => (
                <span key={kind} className="status-chip" data-tone={KIND_TONE}>
                  {kind}
                </span>
              ))}
              {task.hashes.map((hash) => (
                <HashButton key={hash} hash={hash} copied={copiedHash === hash} onCopy={onCopy} />
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="view-summary-muted view-summary-note">
        Each hash copies to the clipboard{tasks.unnamed ? ' (this summary only lists hashes)' : ''}.
      </p>
    </>
  );
}

function FileGroup({
  label,
  rows,
  isNew,
}: {
  label: string;
  rows: ComposedFileRow[];
  isNew: boolean;
}): React.JSX.Element | null {
  if (rows.length === 0) return null;
  return (
    <div className="view-summary-modal-group">
      <span className="view-summary-key">
        {label} · {rows.length}
      </span>
      {rows.map((row) => (
        <div key={row.path} className="view-summary-modal-row">
          <span className="view-summary-path">{row.path}</span>
          {isNew ? (
            <span className="status-chip" data-tone={NEW_FILE_TONE}>
              New
            </span>
          ) : null}
          {row.note !== null ? (
            <span className="view-summary-file-note">
              <ResearchInline text={row.note} />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function FilesModalBody({ files }: { files: ComposedSummaryRun['modals']['files'] }): React.JSX.Element {
  return (
    <>
      <FileGroup label="Created" rows={files.created} isNew />
      <FileGroup label="Modified" rows={files.modified} isNew={false} />
      <FileGroup label="Listed in the summary" rows={files.listed} isNew={false} />
    </>
  );
}

export function RequirementsModalBody({
  requirements,
  previews,
}: {
  requirements: ComposedRequirementRef[];
  previews: Record<string, RequirementPreview>;
}): React.JSX.Element {
  return (
    <>
      <div className="view-summary-modal-group">
        {requirements.map((req) => (
          <div key={req.id} className="view-summary-modal-row view-summary-req-row">
            <RequirementRef id={req.id} state={req.state} preview={previews[req.id]} />
            <span className="status-chip" data-tone={REQ_STATE[req.state].tone}>
              {REQ_STATE[req.state].label}
            </span>
          </div>
        ))}
      </div>
      <p className="view-summary-muted view-summary-note">
        Hover or focus an ID for its preview; Open goes to the requirement.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

function ModalTrigger({
  label,
  count,
  pending,
  disabled,
}: {
  label: string;
  count: number;
  pending: number;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <DialogTrigger className="view-summary-trigger" disabled={disabled}>
      {label} <b>{count}</b>
      {pending > 0 ? <b data-state="pending">+{pending} pending</b> : null}
    </DialogTrigger>
  );
}

// ---------------------------------------------------------------------------
// Body sections
// ---------------------------------------------------------------------------

function OutcomeSection({
  outcome,
  more,
  onToggleMore,
  onJump,
}: {
  outcome: ComposedOutcome;
  more: ReadonlySet<string>;
  onToggleMore: (key: string) => void;
  onJump: (anchorId: string) => void;
}): React.JSX.Element {
  return (
    <section className="view-summary-outcome" aria-labelledby="summary-outcome">
      <Heading id="summary-outcome" title="Outcome" />
      <p className="view-summary-count">
        <span>
          <b>{outcome.shipped}</b> {outcome.shipped === 1 ? 'thing' : 'things'} shipped
        </span>
        {outcome.proven > 0 ? <span>{plural(outcome.proven, 'deliverable', 'deliverables')} proven</span> : null}
        {outcome.human > 0 ? (
          <span data-tone={HUMAN_TONE}>{outcome.human} need a human</span>
        ) : null}
        {outcome.fixed > 0 ? <span>{outcome.fixed} fixed on the way</span> : null}
      </p>
      <ol className="view-summary-rows">
        {outcome.rows.map((row) => {
          const key = `outcome-${row.n}`;
          const expanded = more.has(key);
          return (
            <li key={row.n} className="view-summary-row">
              <span className="view-summary-row-n">{row.n}</span>
              <p className="view-summary-row-head">
                <ResearchInline text={row.head} />
              </p>
              <div className="view-summary-row-detail">
                {row.rest !== '' ? (
                  <p className="view-summary-detail" data-clamped={row.long && !expanded ? 'true' : 'false'}>
                    <ResearchInline text={row.rest} />
                  </p>
                ) : null}
                {row.long ? (
                  <button
                    type="button"
                    className="view-summary-more"
                    aria-expanded={expanded}
                    onClick={() => onToggleMore(key)}
                  >
                    {expanded ? '− Less' : '+ More'}
                  </button>
                ) : null}
              </div>
              <div className="view-summary-row-pills">
                {row.pills.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    className="view-summary-pill"
                    data-state={pill.state}
                    data-human={pill.human ? 'true' : 'false'}
                    title={pill.title}
                    onClick={() => onJump(pill.anchorId)}
                  >
                    {pill.id}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StopView({
  stop,
  copiedHash,
  onCopy,
  onJump,
}: {
  stop: ComposedStop;
  copiedHash: string | null;
  onCopy: (hash: string) => void;
  onJump: (anchorId: string) => void;
}): React.JSX.Element {
  return (
    <li className="view-summary-stop" data-kind={stop.kind}>
      <span className="view-summary-dot" aria-hidden="true">
        {stop.n !== null ? stop.n : stop.kind === 'commits' ? '·' : ''}
      </span>
      <div className="view-summary-stop-body">
        <span className="view-summary-when" data-tone={stop.kind === 'wait' ? WAIT_TONE : undefined}>
          {stop.label}
          {stop.hashes.map((hash) => (
            <span key={hash}>
              {' · '}
              <HashButton hash={hash} copied={copiedHash === hash} onCopy={onCopy} />
            </span>
          ))}
        </span>
        {stop.name !== null ? (
          <h3>
            <ResearchInline text={stop.name} />
          </h3>
        ) : stop.kind === 'task' ? (
          <h3 className="view-summary-muted">Task {stop.n}</h3>
        ) : null}
      </div>
      <div className="view-summary-margin">
        {stop.deviations.map((dev) => (
          <button key={dev.anchorId} type="button" className="view-summary-fix" onClick={() => onJump(dev.anchorId)}>
            <span className="view-summary-fix-kicker" data-tone={DEVIATION_TONE}>
              {dev.kicker}
            </span>
            <span className="view-summary-fix-title">
              <ResearchInline text={dev.title} />
            </span>
          </button>
        ))}
      </div>
    </li>
  );
}

function DeviationCardView({
  card,
  flashed,
  copiedHash,
  onCopy,
}: {
  card: ComposedDeviationCard;
  flashed: boolean;
  copiedHash: string | null;
  onCopy: (hash: string) => void;
}): React.JSX.Element {
  return (
    <article id={card.anchorId} className="view-summary-card" data-flash={flashed ? 'true' : undefined}>
      <div className="view-summary-chips">
        <span className="status-chip" data-tone={DEVIATION_TONE}>
          {card.kicker}
        </span>
        {card.commit !== null ? <HashButton hash={card.commit} copied={copiedHash === card.commit} onCopy={onCopy} /> : null}
      </div>
      <h4>
        <ResearchInline text={card.title} />
      </h4>
      {card.fields.length > 0 ? (
        <dl>
          {card.fields.map((field, index) => (
            <div key={`${field.label}-${index}`}>
              <dt className="view-summary-key">{field.label}</dt>
              <dd>
                <ResearchInline text={field.value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {card.text !== null ? (
        <p className="view-summary-muted">
          <ResearchInline text={card.text} />
        </p>
      ) : null}
    </article>
  );
}

function RunSection({
  run,
  flashed,
  copiedHash,
  onCopy,
  onJump,
}: {
  run: ComposedRun;
  flashed: string | null;
  copiedHash: string | null;
  onCopy: (hash: string) => void;
  onJump: (anchorId: string) => void;
}): React.JSX.Element {
  return (
    <section className="view-summary-run" aria-labelledby="summary-run">
      <Heading id="summary-run" title="How the run went" aside={run.aside} />
      <ol className="view-summary-timeline">
        {run.stops.map((stop, index) => (
          <StopView key={`${stop.kind}-${index}`} stop={stop} copiedHash={copiedHash} onCopy={onCopy} onJump={onJump} />
        ))}
      </ol>
      {run.cards.length > 0 ? (
        <div className="view-summary-cards">
          <span className="view-summary-key">Deviations in full</span>
          {run.cards.map((card) => (
            <DeviationCardView
              key={card.anchorId}
              card={card}
              flashed={flashed === card.anchorId}
              copiedHash={copiedHash}
              onCopy={onCopy}
            />
          ))}
        </div>
      ) : null}
      {run.went !== null ? (
        <p className="view-summary-went">
          <span>
            Went to plan.
            {run.went.note !== null ? (
              <>
                {' '}
                <span className="view-summary-muted">
                  <ResearchInline text={run.went.note} />
                </span>
              </>
            ) : null}
          </span>
        </p>
      ) : null}
      {run.prose.length > 0 ? (
        <div className="view-summary-prose">
          <ResearchBlocks blocks={run.prose} />
        </div>
      ) : null}
      {run.extras.map((extra, index) => (
        <details key={`${extra.title}-${index}`} className="view-summary-extra">
          <summary>+ {extra.title}</summary>
          <div className="view-summary-extra-body">
            <ResearchBlocks blocks={extra.blocks} />
          </div>
        </details>
      ))}
    </section>
  );
}

function ProofSection({ proof, flashed }: { proof: ComposedProofRow[]; flashed: string | null }): React.JSX.Element {
  const human = proof.filter((p) => p.human).length;
  return (
    <section className="view-summary-proof" aria-labelledby="summary-proof">
      <Heading
        id="summary-proof"
        title="Proof"
        aside={`${plural(proof.length, 'deliverable', 'deliverables')} · ${human} need a human`}
      />
      <div className="view-summary-proof-frame">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Deliverable</th>
              <th>Req</th>
              <th>Proof</th>
            </tr>
          </thead>
          <tbody>
            {proof.map((row) => (
              <tr
                key={row.anchorId}
                id={row.anchorId}
                data-human={row.human ? 'true' : 'false'}
                data-flash={flashed === row.anchorId ? 'true' : undefined}
              >
                <td className="view-summary-mono">{row.id}</td>
                <td title={row.description}>
                  <span className="view-summary-clamp">
                    <ResearchInline text={row.description} />
                  </span>
                </td>
                <td className="view-summary-mono">{row.requirement ?? '—'}</td>
                <td>
                  <div className="view-summary-chips">
                    {row.checks.map((check, index) => (
                      <span key={`${check.kind}-${index}`} className="view-summary-check" data-state={check.state} title={check.ref}>
                        {check.kind}
                      </span>
                    ))}
                    {row.human ? (
                      <span className="view-summary-check" data-human="true" title={row.rationale ?? undefined}>
                        Needs a human
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TwoColumns({ model }: { model: ComposedSummaryRun }): React.JSX.Element {
  const { decisions, patterns } = model;
  const decisionCount = decisions.items.length;
  return (
    <section className="view-summary-two">
      <div className="view-summary-column">
        <Heading title="Decisions" aside={decisionCount > 0 ? String(decisionCount) : null} />
        {decisionCount > 0 ? (
          <ol className="view-summary-decisions">
            {decisions.items.map((item, index) => (
              <li key={index}>
                <span>
                  <ResearchInline text={item} />
                </span>
              </li>
            ))}
          </ol>
        ) : decisions.body !== null ? (
          <div className="view-summary-prose">
            <ResearchBlocks blocks={decisions.body} />
          </div>
        ) : (
          <p className="view-summary-muted">No decisions recorded.</p>
        )}
      </div>
      {patterns !== null ? (
        <div className="view-summary-column">
          <Heading title="Patterns" aside={patterns.items.length > 0 ? String(patterns.items.length) : null} />
          {patterns.added.length > 0 ? (
            <div className="view-summary-added">
              <span className="view-summary-key">New dependencies · {patterns.added.length}</span>
              <div className="view-summary-chips">
                {patterns.added.map((name) => (
                  <span key={name} className="status-chip" data-tone={DEPENDENCY_TONE}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="view-summary-patterns">
            {patterns.items.map((item, index) => (
              <div key={index} className="view-summary-pattern">
                <span className="status-chip" data-tone={item.tone}>
                  {item.label}
                </span>
                <span>
                  <ResearchInline text={item.text} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LooseSections({
  title,
  sections,
  waiting,
}: {
  title: string;
  sections: ComposedLooseSection[];
  waiting: boolean;
}): React.JSX.Element | null {
  if (sections.length === 0) return null;
  return (
    <section className={waiting ? 'view-summary-waits' : 'view-summary-also'}>
      <Heading title={title} />
      <div className="view-summary-loose">
        {sections.map((section) => (
          <details
            key={section.key}
            open={waiting ? true : undefined}
            data-tone={waiting ? WAIT_TONE : undefined}
            className="view-summary-detail-box"
          >
            <summary>
              <span className="view-summary-detail-title">
                <ResearchInline text={section.title} />
              </span>
              {waiting ? (
                <span className="status-chip" data-tone={WAIT_TONE}>
                  Waits on a human
                </span>
              ) : null}
            </summary>
            <div className="view-summary-loose-body">
              <ResearchBlocks blocks={section.blocks} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function LineageSection({
  lineage,
  links,
}: {
  lineage: NonNullable<ComposedSummaryRun['lineage']>;
  links: Record<string, string | null>;
}): React.JSX.Element {
  return (
    <section className="view-summary-lineage-section">
      <Heading title="Where it sits" />
      <div className="view-summary-lineage">
        <div className="view-summary-side">
          <span className="view-summary-key">Built on</span>
          {lineage.requires.length > 0 ? (
            lineage.requires.map((req) => {
              const url = links[req.key] ?? null;
              const inner = (
                <>
                  <span className="view-summary-node-id">{req.label}</span>
                  {req.provides !== null ? (
                    <span className="view-summary-node-why">
                      <ResearchInline text={req.provides} />
                    </span>
                  ) : null}
                </>
              );
              return url !== null ? (
                <Link key={req.key} className="view-summary-node" to={url}>
                  {inner}
                </Link>
              ) : (
                <span key={req.key} className="view-summary-node" title={req.key}>
                  {inner}
                </span>
              );
            })
          ) : (
            <span className="view-summary-muted">Nothing — a starting point</span>
          )}
        </div>
        <span className="view-summary-arrow" aria-hidden="true">
          →
        </span>
        <span className="view-summary-self">{lineage.planId}</span>
        <span className="view-summary-arrow" aria-hidden="true">
          →
        </span>
        <div className="view-summary-side">
          <span className="view-summary-key">Unblocks · {lineage.affects.length}</span>
          {lineage.affects.length > 0 ? (
            lineage.affects.map((affect, index) => (
              <span key={index} className="view-summary-node" title={affect.text}>
                <span className="view-summary-node-id">{affect.short}</span>
              </span>
            ))
          ) : (
            <span className="view-summary-muted">Nothing downstream</span>
          )}
        </div>
      </div>
    </section>
  );
}

function SourceOnly({
  entries,
  onShowSource,
}: {
  entries: ComposedSummaryRun['sourceOnly'];
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <nav id="summary-source-only" className="view-summary-source-only" aria-label="In the source only">
      <span className="view-summary-key">In the source only</span>
      <ul>
        {entries.map((entry) => (
          <li key={entry.label}>
            <button type="button" className="status-chip" onClick={() => onShowSource(entry.targetId)}>
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export interface SummaryRunViewProps {
  model: ComposedSummaryRun;
  fallbackTitle: string;
  path: string;
  presentation: SummaryPresentation | null;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  chip: React.ReactNode;
}

export function SummaryRunView({
  model,
  fallbackTitle,
  path,
  presentation,
  mode,
  onModeChange,
  onShowSource,
  chip,
}: SummaryRunViewProps): React.JSX.Element {
  const [modal, setModal] = useState<ModalKey | null>(null);
  const [more, setMore] = useState<ReadonlySet<string>>(() => new Set());
  const [flashed, setFlashed] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const onToggleMore = useCallback((key: string): void => {
    setMore((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const onJump = useCallback((anchorId: string): void => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    setFlashed(anchorId);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashed(null), 1200);
  }, []);

  const onCopy = useCallback(async (hash: string): Promise<void> => {
    if (!(await copyText(hash))) return;
    setCopiedHash(hash);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedHash(null), 1500);
  }, []);

  const previews = useMemo(
    () => requirementPreviews(presentation, path, model.modals.requirements, model.quick),
    [presentation, path, model.modals.requirements, model.quick],
  );
  const links = useMemo(
    () => lineageLinks(presentation, path, model.lineage?.requires ?? []),
    [presentation, path, model.lineage],
  );

  const { head, triggers, modals } = model;
  const title = head.title ?? fallbackTitle;
  const modalOpen =
    (key: ModalKey) =>
    (open: boolean): void =>
      setModal((current) => (open ? key : current === key ? null : current));
  const reqTotal = modals.requirements.length;

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas view-summary-page" aria-label={`${title} document`}>
        <header className="view-summary-head">
          <div className="view-summary-meta">
            <div className="view-summary-meta-left">
              <p className="eyebrow">{head.eyebrow}</p>
              {head.completed !== null ? (
                <span className="view-summary-date">
                  Completed <b>{head.completed}</b>
                </span>
              ) : (
                <span className="view-summary-date">Not completed yet</span>
              )}
              {chip}
            </div>
            <div className="view-summary-tools">
              <CopyPathButton path={path} />
              <DocumentViewToggle mode={mode} onChange={onModeChange} />
            </div>
          </div>
          <div className="view-summary-head-grid">
            <div className="view-summary-identity">
              <h1>
                <ResearchInline text={title} />
              </h1>
              {head.oneLiner !== null ? (
                <p className="view-summary-oneliner">
                  <ResearchInline text={head.oneLiner} />
                </p>
              ) : null}
              <div className="view-summary-triggers">
                <Dialog open={modal === 'tasks'} onOpenChange={modalOpen('tasks')}>
                  <ModalTrigger label={triggers.tasks.label} count={triggers.tasks.count} pending={0} disabled={triggers.tasks.count === 0} />
                  <DialogContent className="view-summary-modal">
                    <DialogHeader>
                      <DialogTitle>
                        {triggers.tasks.label} · {triggers.tasks.count}
                      </DialogTitle>
                    </DialogHeader>
                    <TasksModalBody tasks={modals.tasks} copiedHash={copiedHash} onCopy={(hash) => void onCopy(hash)} />
                  </DialogContent>
                </Dialog>
                <Dialog open={modal === 'files'} onOpenChange={modalOpen('files')}>
                  <ModalTrigger label="Files" count={triggers.files.count} pending={0} disabled={triggers.files.count === 0} />
                  <DialogContent className="view-summary-modal">
                    <DialogHeader>
                      <DialogTitle>Files · {triggers.files.count}</DialogTitle>
                    </DialogHeader>
                    <FilesModalBody files={modals.files} />
                  </DialogContent>
                </Dialog>
                <Dialog open={modal === 'reqs'} onOpenChange={modalOpen('reqs')}>
                  <ModalTrigger
                    label="Requirements"
                    count={triggers.requirements.done}
                    pending={triggers.requirements.pending}
                    disabled={reqTotal === 0}
                  />
                  <DialogContent className="view-summary-modal">
                    <DialogHeader>
                      <DialogTitle>Requirements · {reqTotal}</DialogTitle>
                    </DialogHeader>
                    <RequirementsModalBody requirements={modals.requirements} previews={previews} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="view-summary-metrics">
              <div className="view-summary-stat">
                <span className="view-summary-key">Status</span>
                <b data-tone={head.status.tone}>{head.status.label}</b>
              </div>
              <div className="view-summary-stat">
                <span className="view-summary-key">Duration</span>
                <b>{head.duration ?? '—'}</b>
              </div>
              <div className="view-summary-stat">
                <span className="view-summary-key">Started</span>
                <b>{head.started ?? '—'}</b>
              </div>
              {head.type !== null || head.selfCheck !== null ? (
                <div className="view-summary-metrics-full">
                  {head.type !== null ? (
                    <span className="status-chip" data-tone={TYPE_TONE}>
                      <span className="view-summary-type-key">Type:</span> {head.type}
                    </span>
                  ) : null}
                  {head.selfCheck !== null ? (
                    <span className="status-chip" data-tone={head.selfCheck.tone}>
                      {head.selfCheck.label}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {model.setup !== null ? (
          <div className="view-summary-setup" data-tone={SETUP_TONE}>
            <span className="view-summary-setup-kicker">You need to set something up</span>
            <ResearchBlocks blocks={model.setup} />
          </div>
        ) : null}

        {model.outcome !== null ? (
          <OutcomeSection outcome={model.outcome} more={more} onToggleMore={onToggleMore} onJump={onJump} />
        ) : null}
        <RunSection run={model.run} flashed={flashed} copiedHash={copiedHash} onCopy={(hash) => void onCopy(hash)} onJump={onJump} />
        {model.proof !== null ? <ProofSection proof={model.proof} flashed={flashed} /> : null}
        <TwoColumns model={model} />
        <LooseSections title="Also in this summary" sections={model.also} waiting={false} />
        <LooseSections title="Waiting on a human" sections={model.waits} waiting />
        {model.lineage !== null ? <LineageSection lineage={model.lineage} links={links} /> : null}
        {model.next !== null ? (
          <div className="view-summary-next">
            <span className="view-summary-key">Next</span>
            <span>
              <ResearchInline text={model.next} />
            </span>
          </div>
        ) : null}
        <SourceOnly entries={model.sourceOnly} onShowSource={onShowSource} />
      </article>
    </div>
  );
}
