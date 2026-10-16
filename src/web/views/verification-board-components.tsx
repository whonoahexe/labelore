// The VERIFICATION page's React surface (quick-261017-18a, sketch 021 winner E): the console rail
// (eyebrow, title, status, verified stamp, the big-number frame, the stat rows that jump to their
// section, the human-check slips, copy-path and the View/Source toggle) beside the main column - the
// phase goal, the Gap -> fix ledger, the Truth board and Requirement board with their inspectors, the
// numbered human steps, the anti-patterns, the "Also in this report" chip row and the verifier footer.
// Every string derived from the document renders only through `ResearchInline` (tokenizeInline output
// mapped to React nodes) or as plain React text - never React's raw-HTML injection prop (T-18a-01),
// and no link target is built from document text (T-18a-06): the only navigation is a jump to an id
// this file wrote itself, or `onShowSource` with a heading id the composer resolved (or null).
// Colour comes only from the tone a composed model carries (the maps in `verification-board.ts`) and
// the theme tokens; the parse-degradation tones never appear on document content. There is no
// entrance or hover motion: the jump highlight (`data-flash`) is the only animation-free emphasis.
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.tsx';
import { ResearchInline } from './research-briefing-components.tsx';
import { HUMAN_TONE, QUIET_TONE } from './verification-board.ts';
import type {
  ComposedAlso,
  ComposedAnti,
  ComposedAntiRow,
  ComposedGapColumns,
  ComposedGapRow,
  ComposedHuman,
  ComposedLedger,
  ComposedRequirementBoard,
  ComposedScope,
  ComposedSpotChecks,
  ComposedStat,
  ComposedTicket,
  ComposedTruthBoard,
  ComposedVerificationBoard,
} from './verification-board.ts';

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

function Inline({ text }: { text: string }): React.JSX.Element {
  return <ResearchInline text={text} />;
}

function Heading({
  id,
  title,
  aside,
  sourceId,
  onShowSource,
  hasSource = false,
}: {
  id?: string;
  title: string;
  aside?: string | null;
  sourceId?: string | null;
  hasSource?: boolean;
  onShowSource?: (id: string | null) => void;
}): React.JSX.Element {
  return (
    <header className="view-verification-heading" id={id}>
      <h2>{title}</h2>
      <span className="view-verification-aside">
        {aside ?? null}
        {hasSource && onShowSource ? (
          <button type="button" className="view-verification-link" onClick={() => onShowSource(sourceId ?? null)}>
            Source ↗
          </button>
        ) : null}
      </span>
    </header>
  );
}

function ScopeMeter({ scope }: { scope: ComposedScope }): React.JSX.Element {
  return (
    <span className="view-verification-scope" data-stated={scope.filled > 0 ? 'true' : 'false'}>
      {[1, 2, 3].map((segment) => (
        <i key={segment} data-filled={segment <= scope.filled ? 'true' : 'false'} />
      ))}
      <b>{scope.label}</b>
    </span>
  );
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

function GapColumns({ columns }: { columns: ComposedGapColumns }): React.JSX.Element {
  return (
    <div className="view-verification-columns">
      <div>
        <span className="view-verification-key">{columns.missingLabel}</span>
        <span>{columns.missing !== null ? <Inline text={columns.missing} /> : '—'}</span>
      </div>
      <div>
        <span className="view-verification-key">{columns.whyLabel}</span>
        {columns.why === null ? (
          <span>—</span>
        ) : columns.why.kind === 'text' ? (
          <span>
            <Inline text={columns.why.text} />
          </span>
        ) : (
          <div>
            This has to hold, and doesn’t:{' '}
            <em>
              <Inline text={columns.why.truth} />
            </em>
            {columns.why.where.length > 0 ? (
              <div className="view-verification-where">
                {columns.why.where.map((place, index) => (
                  <div key={`${place.file}-${index}`}>
                    <code>{place.file}</code>
                    <span>
                      <Inline text={place.issue} />
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div>
        <span className="view-verification-key">{columns.fixLabel}</span>
        {columns.fix === null ? (
          <span>—</span>
        ) : columns.fix.kind === 'text' ? (
          <span>
            <Inline text={columns.fix.text} />
          </span>
        ) : (
          <ul>
            {columns.fix.items.map((item, index) => (
              <li key={index}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Ticket({
  gapKey,
  ticket,
  whole,
  onToggle,
}: {
  gapKey: string;
  ticket: ComposedTicket;
  whole: boolean;
  onToggle: (key: string) => void;
}): React.JSX.Element {
  const shown = whole ? ticket.tasks : ticket.tasks.filter((task) => task.hit);
  const key = `${gapKey}-${ticket.planIndex}`;
  return (
    <div className="view-verification-ticket">
      <div className="view-verification-ticket-title">
        <span className="view-verification-key">Fixed by</span>
        <span className="view-verification-ticket-name">
          {ticket.file !== null ? <span className="view-verification-file">{ticket.file}</span> : null}
          <Inline text={ticket.name} />
        </span>
      </div>
      <ScopeMeter scope={ticket.scope} />
      <div className="view-verification-ticket-tasks">
        {shown.map((task) => (
          <div key={task.n} className="view-verification-task" data-hit={task.hit ? 'true' : 'false'}>
            <span className="view-verification-task-n">{task.n}.</span>
            <span>
              <Inline text={task.text} />
            </span>
          </div>
        ))}
      </div>
      {ticket.tasks.length > ticket.hitCount ? (
        <button type="button" className="view-verification-link view-verification-more" onClick={() => onToggle(key)}>
          {whole ? 'Only the tasks for this gap' : `Whole plan · ${ticket.tasks.length} tasks`}
        </button>
      ) : null}
    </div>
  );
}

function GapRow({
  row,
  open,
  flashed,
  wholePlans,
  onToggleOpen,
  onToggleWhole,
}: {
  row: ComposedGapRow;
  open: boolean;
  flashed: boolean;
  wholePlans: ReadonlySet<string>;
  onToggleOpen: (key: string) => void;
  onToggleWhole: (key: string) => void;
}): React.JSX.Element {
  return (
    <div
      className="view-verification-gap"
      id={row.anchorId}
      data-kind={row.kind}
      data-open={open ? 'true' : 'false'}
      data-flash={flashed ? 'true' : 'false'}
    >
      <button
        type="button"
        className="view-verification-row"
        aria-expanded={open}
        onClick={() => onToggleOpen(row.key)}
      >
        <span className="view-verification-gap-number">{row.number}</span>
        <span className="view-verification-gap-name">
          <b>
            <Inline text={row.name} />
          </b>
          {!open && row.preview !== null ? (
            <span className="view-verification-preview">
              <Inline text={row.preview} />
            </span>
          ) : null}
        </span>
        <span className="view-verification-arrow" aria-hidden="true">
          →
        </span>
        <span className="view-verification-chips">
          {row.chips.length > 0 ? (
            row.chips.map((chip, index) => (
              <span key={index} className="view-verification-task-chip">
                <span className="view-verification-task-prefix">{chip.prefix}</span>
                <Inline text={chip.text} />
              </span>
            ))
          ) : (
            <span className="view-verification-nofix">
              {row.fixState === 'no-plan' ? 'Fix in the gap itself' : 'No plan task names it'}
            </span>
          )}
        </span>
        {row.scope !== null ? <ScopeMeter scope={row.scope} /> : <span />}
      </button>
      {open ? (
        <div className="view-verification-detail">
          <GapColumns columns={row.columns} />
          {row.tickets.map((ticket) => (
            <Ticket
              key={ticket.planIndex}
              gapKey={row.key}
              ticket={ticket}
              whole={wholePlans.has(`${row.key}-${ticket.planIndex}`)}
              onToggle={onToggleWhole}
            />
          ))}
          {row.fixState === 'unnamed' ? (
            <p className="view-verification-note">No recommended plan task names this gap.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Ledger({
  ledger,
  openKey,
  flashedId,
  wholePlans,
  onToggleOpen,
  onToggleWhole,
  onShowSource,
}: {
  ledger: ComposedLedger;
  openKey: string | null;
  flashedId: string | null;
  wholePlans: ReadonlySet<string>;
  onToggleOpen: (key: string) => void;
  onToggleWhole: (key: string) => void;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  return (
    <section id="verification-gaps" className="view-verification-section">
      <Heading
        title="Gap → fix ledger"
        aside={ledger.aside}
        hasSource={ledger.sourceId !== null}
        sourceId={ledger.sourceId}
        onShowSource={onShowSource}
      />
      {ledger.rows.length === 0 ? (
        <div className="view-verification-empty">
          <Inline text={ledger.empty ?? 'No gaps found.'} />
        </div>
      ) : (
        <div className="view-verification-ledger">
          {ledger.rows.map((row) => (
            <GapRow
              key={row.key}
              row={row}
              open={openKey === row.key}
              flashed={flashedId === row.anchorId}
              wholePlans={wholePlans}
              onToggleOpen={onToggleOpen}
              onToggleWhole={onToggleWhole}
            />
          ))}
        </div>
      )}
      {ledger.unmapped.length > 0 ? (
        <details className="view-verification-unmapped">
          <summary>
            {ledger.unmapped.length} plan {ledger.unmapped.length === 1 ? 'task' : 'tasks'} not tied to a listed gap
          </summary>
          <ul>
            {ledger.unmapped.map((task, index) => (
              <li key={index}>
                <Inline text={task.text} /> <span className="view-verification-muted">— {task.plan}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The boards
// ---------------------------------------------------------------------------

function TruthBoard({
  board,
  picked,
  onPick,
  onOpenGap,
  onJump,
}: {
  board: ComposedTruthBoard;
  picked: number | null;
  onPick: (index: number | null) => void;
  onOpenGap: (key: string) => void;
  onJump: (id: string) => void;
}): React.JSX.Element {
  const detail = picked === null ? null : (board.details[picked] ?? null);
  return (
    <section id="verification-truths" className="view-verification-section">
      <div className="view-verification-board-title">
        <span>Truth board</span>
        <span className="view-verification-muted">{board.aside}</span>
      </div>
      <div className="view-verification-board">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Outcome</span>
              </th>
              {board.groups.map((group) => (
                <th key={group.name} scope="col">
                  {group.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.rows.map((row) => (
              <tr key={row.key} data-row={row.key}>
                <th scope="row">
                  <div className="view-verification-meter" aria-hidden="true">
                    {[0, 1, 2, 3].map((segment) => (
                      <i key={segment} data-filled={segment < row.filled ? 'true' : 'false'} />
                    ))}
                  </div>
                  {row.label} · {row.count}
                </th>
                {row.cells.map((cells, column) => (
                  <td key={column} data-empty={cells.length === 0 ? 'true' : 'false'}>
                    <div className="view-verification-squares">
                      {cells.map((cell) => (
                        <button
                          key={cell.index}
                          type="button"
                          className="view-verification-square"
                          data-state={cell.state}
                          aria-pressed={picked === cell.index}
                          title={`${cell.label}: ${cell.title}`}
                          onClick={() => onPick(picked === cell.index ? null : cell.index)}
                        >
                          {cell.n}
                        </button>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="view-verification-pick">
        {detail === null ? (
          <div className="view-verification-empty">
            Pick a square for the truth, its evidence and, if it failed, the gap it opens.
          </div>
        ) : (
          <div className="view-verification-inspector">
            <div className="view-verification-inspector-top">
              <span className="view-verification-inline">
                <span className="status-chip" data-tone={detail.tone}>
                  {detail.stateLabel}
                </span>
                <span className="view-verification-key">
                  {detail.group} · #{detail.n}
                </span>
              </span>
              <button type="button" className="view-verification-link" onClick={() => onPick(null)}>
                Close ×
              </button>
            </div>
            <h3>
              <Inline text={detail.text} />
            </h3>
            <dl>
              {detail.raw !== null ? (
                <>
                  <dt className="view-verification-key">As written</dt>
                  <dd className="view-verification-mono">{detail.raw}</dd>
                </>
              ) : null}
              <dt className="view-verification-key">Evidence</dt>
              <dd>{detail.evidence !== null ? <Inline text={detail.evidence} /> : '—'}</dd>
              {detail.behavior !== null ? (
                <>
                  <dt className="view-verification-key">To check it</dt>
                  <dd>
                    <Inline text={detail.behavior.test} />{' '}
                    <span className="view-verification-muted">
                      — expect: <Inline text={detail.behavior.expected} />
                    </span>
                  </dd>
                </>
              ) : null}
              {detail.coincidental !== null ? (
                <>
                  <dt className="view-verification-key">Why by luck</dt>
                  <dd>
                    <span className="status-chip" data-tone={QUIET_TONE}>
                      {detail.coincidental.reason}
                    </span>{' '}
                    <Inline text={detail.coincidental.harden} />
                  </dd>
                </>
              ) : null}
            </dl>
            {detail.gapLinks.length > 0 || detail.humanLink ? (
              <div className="view-verification-links">
                {detail.gapLinks.map((link) => (
                  <button
                    key={link.key}
                    type="button"
                    className="view-verification-xlink"
                    data-tone={link.tone}
                    onClick={() => onOpenGap(link.key)}
                  >
                    → <Inline text={link.label} />
                  </button>
                ))}
                {detail.humanLink ? (
                  <button
                    type="button"
                    className="view-verification-xlink"
                    data-tone={HUMAN_TONE}
                    onClick={() => onJump('verification-human')}
                  >
                    → In the human checks
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function RequirementBoard({
  board,
  picked,
  onPick,
}: {
  board: ComposedRequirementBoard;
  picked: string | null;
  onPick: (id: string | null) => void;
}): React.JSX.Element {
  const detail = picked === null ? null : (board.details.find((d) => d.id === picked) ?? null);
  return (
    <section id="verification-requirements" className="view-verification-section">
      <div className="view-verification-board-title">
        <span>Requirement board</span>
        <span className="view-verification-muted">{board.aside}</span>
      </div>
      <div className="view-verification-board">
        <table>
          <tbody>
            {board.rows.map((row) => (
              <tr key={row.state} data-row={row.state}>
                <th scope="row">
                  {row.label} · {row.count}
                </th>
                <td>
                  <div className="view-verification-squares">
                    {row.squares.map((square) => (
                      <button
                        key={square.id}
                        type="button"
                        className="view-verification-square"
                        data-wide="true"
                        data-state={square.state}
                        aria-pressed={picked === square.id}
                        onClick={() => onPick(picked === square.id ? null : square.id)}
                      >
                        {square.id}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail !== null ? (
        <div className="view-verification-pick">
          <div className="view-verification-inspector">
            <div className="view-verification-inspector-top">
              <span className="view-verification-inline">
                <span className="status-chip" data-tone={detail.tone}>
                  {detail.label}
                </span>
                <span className="view-verification-key">{detail.id}</span>
              </span>
              <button type="button" className="view-verification-link" onClick={() => onPick(null)}>
                Close ×
              </button>
            </div>
            <dl>
              <dt className="view-verification-key">{detail.id}</dt>
              <dd>{detail.description !== null ? <Inline text={detail.description} /> : '—'}</dd>
              {detail.plans.length > 0 ? (
                <>
                  <dt className="view-verification-key">Delivered by</dt>
                  <dd className="view-verification-mono">{detail.plans.join(' · ')}</dd>
                </>
              ) : null}
              {detail.note !== null ? (
                <>
                  <dt className="view-verification-key">{detail.noteLabel}</dt>
                  <dd>
                    <Inline text={detail.note} />
                  </dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Human steps, anti-patterns, also, footer
// ---------------------------------------------------------------------------

function HumanSteps({
  human,
  onShowSource,
}: {
  human: ComposedHuman;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  const resolved = human.resolved !== null;
  return (
    <section id="verification-human" className="view-verification-section">
      <Heading
        title={human.heading}
        aside={human.aside}
        hasSource
        sourceId={human.sourceId}
        onShowSource={onShowSource}
      />
      {human.resolved !== null ? <p className="view-verification-resolved">{human.resolved}</p> : null}
      <div className="view-verification-steps" data-resolved={resolved ? 'true' : 'false'}>
        {human.steps.map((step) => (
          <article key={step.n} className="view-verification-step" id={step.anchorId}>
            <span className="view-verification-step-number">{step.n}</span>
            <div>
              <h3>
                <Inline text={step.title} />
              </h3>
              <div className="view-verification-step-columns">
                <div>
                  <span className="view-verification-key">Do this</span>
                  <span>{step.test !== null ? <Inline text={step.test} /> : '—'}</span>
                </div>
                <div>
                  <span className="view-verification-key">You should see</span>
                  <span>{step.expected !== null ? <Inline text={step.expected} /> : '—'}</span>
                </div>
                <div>
                  <span className="view-verification-key">Why a person</span>
                  <span className="view-verification-muted">{step.why !== null ? <Inline text={step.why} /> : '—'}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AntiCard({ row }: { row: ComposedAntiRow }): React.JSX.Element {
  return (
    <div className="view-verification-blocker">
      <p className="view-verification-blocker-where">{row.where}</p>
      <p className="view-verification-blocker-pattern">
        <Inline text={row.pattern} />
      </p>
      <p className="view-verification-blocker-impact">
        <Inline text={row.impact} />
      </p>
    </div>
  );
}

function AntiPatterns({
  anti,
  onShowSource,
}: {
  anti: ComposedAnti;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  return (
    <section id="verification-anti" className="view-verification-section">
      <Heading
        title="Anti-patterns"
        aside={anti.summary === '' ? 'none' : anti.summary}
        hasSource
        sourceId={anti.sourceId}
        onShowSource={onShowSource}
      />
      {anti.empty !== null ? (
        <div className="view-verification-empty">
          <Inline text={anti.empty} />
        </div>
      ) : null}
      {anti.blockers.length > 0 ? (
        <div className="view-verification-blockers">
          {anti.blockers.map((row, index) => (
            <AntiCard key={index} row={row} />
          ))}
        </div>
      ) : null}
      {anti.rows.length > 0 ? (
        <div className="view-verification-anti-rows">
          {anti.rows.map((row, index) => (
            <div key={index} className="view-verification-anti-row" data-severity={row.severity}>
              <span className="view-verification-mono">{row.where}</span>
              <span>
                <Inline text={row.pattern} />
              </span>
              <span className="view-verification-muted">
                <Inline text={row.impact} />
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {anti.note !== null ? (
        <p className="view-verification-note">
          <Inline text={anti.note} />
        </p>
      ) : null}
    </section>
  );
}

function Also({
  entries,
  onShowSource,
}: {
  entries: ComposedAlso[];
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <nav id="verification-also" className="view-verification-also" aria-label="Also in this report">
      <span className="view-verification-key">Also in this report</span>
      <ul>
        {entries.map((entry, index) => (
          <li key={`${entry.label}-${index}`}>
            <button type="button" className="status-chip" onClick={() => onShowSource(entry.targetId)}>
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SpotChecksBody({
  spot,
  onShowSource,
}: {
  spot: ComposedSpotChecks;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  return (
    <div className="view-verification-spot-list">
      {spot.rows.map((row, index) => (
        <div key={index} className="view-verification-spot">
          <i className="view-verification-dot" data-state={row.state} aria-hidden="true" />
          <span>
            <Inline text={row.behavior} />
          </span>
          <span className="view-verification-spot-result">
            <Inline text={row.result} />
          </span>
          <span className="view-verification-spot-command">
            <Inline text={row.command} />
            {row.note !== null ? ` · ${row.note}` : ''}
          </span>
        </div>
      ))}
      {spot.sourceId !== null ? (
        <button
          type="button"
          className="view-verification-link"
          onClick={() => onShowSource(spot.sourceId)}
        >
          Open in source ↗
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The rail
// ---------------------------------------------------------------------------

function StatRow({
  stat,
  onJump,
  spot,
  onShowSource,
  modalOpen,
  onModalChange,
}: {
  stat: ComposedStat;
  onJump: (id: string) => void;
  spot: ComposedSpotChecks | null;
  onShowSource: (id: string | null) => void;
  modalOpen: boolean;
  onModalChange: (open: boolean) => void;
}): React.JSX.Element {
  const value = (
    <b data-tone={stat.tone ?? undefined}>{stat.value}</b>
  );
  if (stat.target === 'spot-checks' && spot !== null) {
    return (
      <Dialog open={modalOpen} onOpenChange={onModalChange}>
        <DialogTrigger className="view-verification-stat">
          {stat.label}
          {value}
        </DialogTrigger>
        <DialogContent className="view-verification-modal">
          <DialogHeader>
            <DialogTitle>Behavioral spot-checks · {spot.rows.length}</DialogTitle>
          </DialogHeader>
          <SpotChecksBody spot={spot} onShowSource={onShowSource} />
        </DialogContent>
      </Dialog>
    );
  }
  if (stat.target !== null && stat.target !== 'spot-checks') {
    const target = stat.target;
    return (
      <button type="button" className="view-verification-stat" onClick={() => onJump(target)}>
        {stat.label}
        {value}
      </button>
    );
  }
  return (
    <div className="view-verification-stat" data-plain="true">
      {stat.label}
      {value}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export interface VerificationBoardViewProps {
  model: ComposedVerificationBoard;
  fallbackTitle: string;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  /** The parse-warning chip, when the artifact carries one. */
  chip?: React.ReactNode;
  /** Initial state, for the static-markup tests only. */
  initialGap?: string | null;
  initialTruth?: number | null;
  initialRequirement?: string | null;
  initialModal?: boolean;
  initialWhole?: readonly string[];
}

export function VerificationBoardView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  chip,
  initialGap = null,
  initialTruth = null,
  initialRequirement = null,
  initialModal = false,
  initialWhole = [],
}: VerificationBoardViewProps): React.JSX.Element {
  const [openGap, setOpenGap] = useState<string | null>(initialGap);
  const [wholePlans, setWholePlans] = useState<ReadonlySet<string>>(() => new Set(initialWhole));
  const [truth, setTruth] = useState<number | null>(initialTruth);
  const [requirement, setRequirement] = useState<string | null>(initialRequirement);
  const [modal, setModal] = useState(initialModal);
  const [flashed, setFlashed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const jump = useCallback((anchorId: string): void => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    setFlashed(anchorId);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashed(null), 900);
  }, []);

  const onToggleOpen = useCallback((key: string): void => {
    setOpenGap((current) => (current === key ? null : key));
  }, []);

  // A gap link from a truth opens that row (never closes it), then scrolls to it once it has mounted.
  const onOpenGap = useCallback(
    (key: string): void => {
      setOpenGap(key);
      window.requestAnimationFrame(() => jump(`verification-gap-${key}`));
    },
    [jump],
  );

  const onToggleWhole = useCallback((key: string): void => {
    setWholePlans((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const { rail } = model;
  return (
    <div className="view-verification-board-page">
      <header className="view-verification-rail">
        <div className="view-verification-identity">
          <p className="eyebrow">{rail.eyebrow}</p>
          {chip}
          <h1>
            <Inline text={rail.title ?? fallbackTitle} />
          </h1>
        </div>
        {rail.status !== null || rail.verified !== null ? (
          <div className="view-verification-facts">
            {rail.status !== null ? (
              <span className="status-chip" data-tone={rail.status.tone}>
                {rail.status.label}
              </span>
            ) : null}
            {rail.verified !== null ? (
              <span>
                Verified<b>{rail.verified}</b>
              </span>
            ) : null}
          </div>
        ) : null}
        {rail.big !== null ? (
          <div className="view-verification-big" data-tone={rail.big.tone}>
            <span className="view-verification-big-bar" aria-hidden="true" />
            <div>
              <div className="view-verification-big-number">{rail.big.value}</div>
              <div className="view-verification-big-label">{rail.big.label}</div>
              {rail.big.sub !== '' ? <div className="view-verification-big-sub">{rail.big.sub}</div> : null}
            </div>
          </div>
        ) : null}
        {rail.stats.length > 0 ? (
          <div className="view-verification-stats">
            {rail.stats.map((stat) => (
              <StatRow
                key={stat.key}
                stat={stat}
                onJump={jump}
                spot={model.spotChecks}
                onShowSource={onShowSource}
                modalOpen={modal}
                onModalChange={setModal}
              />
            ))}
          </div>
        ) : null}
        {rail.slips.length > 0 ? (
          <div className="view-verification-slips">
            <span className="view-verification-key">{rail.slipsLabel}</span>
            {rail.slips.map((slip) => (
              <button
                key={slip.n}
                type="button"
                className="view-verification-slip"
                onClick={() => jump(slip.anchorId)}
              >
                <span className="view-verification-slip-dot" aria-hidden="true" />
                <span>
                  <b>
                    <Inline text={slip.title} />
                  </b>
                  {slip.preview !== '' ? (
                    <span className="view-verification-muted">
                      <Inline text={slip.preview} />
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="view-verification-tools">
          <CopyPathButton path={path} />
          <DocumentViewToggle mode={mode} onChange={onModeChange} />
        </div>
      </header>

      <div className="view-verification-main">
        {model.goal !== null ? (
          <p className="view-verification-lead">
            <span className="view-verification-key">Phase goal</span>
            <Inline text={model.goal} />
          </p>
        ) : null}
        <Ledger
          ledger={model.ledger}
          openKey={openGap}
          flashedId={flashed}
          wholePlans={wholePlans}
          onToggleOpen={onToggleOpen}
          onToggleWhole={onToggleWhole}
          onShowSource={onShowSource}
        />
        {model.truths !== null ? (
          <TruthBoard board={model.truths} picked={truth} onPick={setTruth} onOpenGap={onOpenGap} onJump={jump} />
        ) : null}
        {model.requirements !== null ? (
          <RequirementBoard board={model.requirements} picked={requirement} onPick={setRequirement} />
        ) : null}
        {model.human !== null ? <HumanSteps human={model.human} onShowSource={onShowSource} /> : null}
        {model.anti !== null ? <AntiPatterns anti={model.anti} onShowSource={onShowSource} /> : null}
        <Also entries={model.also} onShowSource={onShowSource} />
        {model.footer !== null ? (
          <div className="view-verification-footer">
            <span>{model.footer.verifier !== null ? `Verifier · ${model.footer.verifier}` : ''}</span>
            <span>{model.footer.source !== null ? `Must-haves from · ${model.footer.source}` : ''}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
