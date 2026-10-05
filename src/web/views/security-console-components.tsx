// The SECURITY console's React surface (quick-261003-527, sketch 017 winner D): a sticky left rail
// (identity, status chip and facts, the threats-open gauge, nav with counts, the sign-off stamp, the
// audit-trail switch, copy-path and View/Source) beside a content column — the lead Summary, the
// severity x STRIDE threat board with its legend and detail panel, the waiver ledger, the trust
// boundaries as destination blocks, the residual-observations toggle, the folded extras, the sign-off checklist, the audit trail when
// switched on and the "In the source only" strip. Every string derived from the document renders
// only through `ResearchInline` / `ResearchBlocks` (tokenizeInline output mapped to React nodes) or
// as plain React text — never React's raw-HTML injection prop (T-527-02), and no href is built from
// document text (T-527-03). Colour comes only from the tone a composed model carries (the maps in
// `security-console.ts`) and the theme tokens; severity is neutral pips, never a hue, and the
// parse-degradation tones never appear on document content.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import { STATUS_TONE } from './security-console.ts';
import type {
  ComposedSecurityConsole,
  ComposedSecurityCrossing,
  ComposedSecurityDestination,
  ComposedSecurityResiduals,
  ComposedSecurityThreat,
  ComposedSecurityWaiver,
} from './security-console.ts';

const PIP_SCALE = [1, 2, 3, 4];

/** The legend's tones, read from the composer's map once, outside the markup. */
const KEY_TONES = {
  closed: STATUS_TONE.closed,
  open: STATUS_TONE.open,
  low: STATUS_TONE['open-low'],
};

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

function Pips({ count, label }: { count: number; label: string }): React.JSX.Element {
  return (
    <span className="view-security-pips" role="img" aria-label={`Severity ${label}`}>
      {PIP_SCALE.map((n) => (
        <i key={n} data-on={n <= count ? 'true' : 'false'} />
      ))}
    </span>
  );
}

function SevLine({ threat }: { threat: ComposedSecurityThreat }): React.JSX.Element {
  return (
    <span className="view-security-sevline">
      <Pips count={threat.severity.pips} label={threat.severity.level} />
      {threat.severity.display}
    </span>
  );
}

function Prose({ blocks }: { blocks: Block[] }): React.JSX.Element {
  return (
    <div className="view-security-md">
      <ResearchBlocks blocks={blocks} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rail
// ---------------------------------------------------------------------------

function Gauge({ gauge }: { gauge: ComposedSecurityConsole['gauge'] }): React.JSX.Element {
  return (
    <div className="view-security-gauge" data-alarm={gauge.alarm ? 'true' : 'false'}>
      <span className="view-security-vbar" role="img" aria-label={gauge.closedLine}>
        {gauge.segments.map((segment) => (
          <i key={segment.status} data-tone={segment.tone} style={{ flexGrow: segment.count }} />
        ))}
      </span>
      <div className="view-security-gauge-read">
        <span className="view-security-gauge-n">{gauge.open}</span>
        <span className="view-security-gauge-t">
          <b>threats open</b>
          <span>{gauge.verdict}</span>
          <span>{gauge.closedLine}</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

function Square({
  threat,
  pressed,
  onPick,
}: {
  threat: ComposedSecurityThreat;
  pressed: boolean;
  onPick: (index: number) => void;
}): React.JSX.Element {
  const title = `${threat.ref} · ${threat.title.replace(/[*`]/g, '')} — ${threat.statusLabel}`;
  return (
    <button
      type="button"
      className="view-security-square"
      data-tone={threat.tone}
      data-accepted={threat.accepted ? 'true' : 'false'}
      data-threat={threat.ref}
      aria-pressed={pressed}
      aria-label={title}
      title={title}
      onClick={() => onPick(threat.index)}
    />
  );
}

function Board({
  model,
  pick,
  onPick,
}: {
  model: ComposedSecurityConsole;
  pick: number | null;
  onPick: (index: number) => void;
}): React.JSX.Element {
  const { board, threats } = model;
  return (
    <div className="view-security-board-wrap">
      <div className="view-security-board" data-cols={board.columns.length}>
        <span className="view-security-bh">Severity</span>
        {board.columns.map((column) => (
          <span key={column.key} className="view-security-bh">
            <span className="view-security-bh-letter">{column.letter}</span>
            {column.label}
          </span>
        ))}
        {board.rows.map((row) => (
          <div key={row.level} className="view-security-board-row" data-level={row.level}>
            <span className="view-security-br">
              <Pips count={row.pips} label={row.label} />
              <span className="view-security-disp">{row.label}</span>
            </span>
            {row.cells.map((cell) => (
              <span key={cell.key} className="view-security-cell" data-empty={cell.empty ? 'true' : 'false'}>
                {cell.threatIndexes.map((index) => (
                  <Square key={index} threat={threats[index]} pressed={pick === index} onPick={onPick} />
                ))}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend(): React.JSX.Element {
  return (
    <p className="view-security-legend" aria-label="Square key">
      <span>
        <i className="view-security-key-sq" data-tone={KEY_TONES.closed} data-accepted="false" />
        closed · mitigated
      </span>
      <span>
        <i className="view-security-key-sq" data-tone={KEY_TONES.closed} data-accepted="true" />
        closed · accepted
      </span>
      <span>
        <i className="view-security-key-sq" data-tone={KEY_TONES.open} data-accepted="false" />
        open
      </span>
      <span>
        <i className="view-security-key-sq" data-tone={KEY_TONES.low} data-accepted="false" />
        open · non-blocking
      </span>
    </p>
  );
}

function Detail({
  model,
  pick,
  onJump,
  onResidual,
}: {
  model: ComposedSecurityConsole;
  pick: number | null;
  onJump: (anchorId: string) => void;
  onResidual: (anchorId: string) => void;
}): React.JSX.Element {
  const threat = pick === null ? undefined : model.threats[pick];
  if (!threat) {
    return (
      <div id="security-detail" className="view-security-detail" data-empty="true" aria-live="polite">
        <span className="view-security-muted">
          Pick a square for the threat, its mitigation and, if it was accepted, why.
        </span>
      </div>
    );
  }
  const risks = threat.riskIndexes.map((i) => model.waivers.rows[i]).filter((r) => r !== undefined);
  const residualItems = threat.residualIndexes
    .map((i) => model.residuals?.items[i])
    .filter((item) => item !== undefined);
  return (
    <div id="security-detail" className="view-security-detail" aria-live="polite">
      <div className="view-security-detail-head">
        <div className="view-security-detail-meta">
          <span className="view-security-ref">{threat.ref}</span>
          <SevLine threat={threat} />
          <span className="status-chip" data-tone={threat.tone}>
            {threat.statusLabel}
          </span>
          <span className="view-security-disp">{threat.disposition}</span>
        </div>
        <h3>
          <ResearchInline text={threat.title} />
        </h3>
        {threat.category !== '' && !threat.titleFromCategory ? (
          <span className="view-security-key">{threat.category}</span>
        ) : null}
      </div>
      <div className="view-security-detail-body">
        {threat.mitigation !== '' ? (
          <p>
            <span className="view-security-key">{threat.mitigationLabel} · </span>
            <ResearchInline text={threat.mitigation} />
          </p>
        ) : null}
        {threat.grouped ? (
          <p className="view-security-muted">
            <span className="view-security-key">Threats · </span>
            <ResearchInline text={threat.idsText} />
          </p>
        ) : null}
        {risks.map((risk) => (
          <p key={risk.anchorId} className="view-security-quote">
            <span className="view-security-key">{risk.id} · </span>
            <ResearchInline text={risk.rationale} />
            {risk.by !== '' || risk.date !== '' ? (
              <em>{` — ${[risk.by, risk.date].filter((part) => part !== '').join(', ')}`}</em>
            ) : null}{' '}
            <button type="button" className="view-security-ref" onClick={() => onJump(risk.anchorId)}>
              {risk.id} ↓
            </button>
          </p>
        ))}
        {residualItems.length > 0 ? (
          <p>
            <button
              type="button"
              className="view-security-link"
              onClick={() => onResidual(residualItems[0].anchorId)}
            >
              {residualItems.length === 1 ? '1 residual observation' : `${residualItems.length} residual observations`}
            </button>
            {' ↓'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waivers
// ---------------------------------------------------------------------------

function Waiver({
  waiver,
  flashed,
  expanded,
  onToggle,
  onPickRef,
}: {
  waiver: ComposedSecurityWaiver;
  flashed: boolean;
  expanded: boolean;
  onToggle: (key: string) => void;
  onPickRef: (threatIndex: number) => void;
}): React.JSX.Element {
  const clamped = waiver.long && !expanded;
  return (
    <div id={waiver.anchorId} className="view-security-waiver" data-flash={flashed ? 'true' : 'false'}>
      <span className="view-security-rid">{waiver.id}</span>
      <span className="view-security-waiver-refs">
        {waiver.refs.map((ref) =>
          ref.threatIndex === null ? (
            <span key={ref.text} className="view-security-ref" data-plain="true">
              {ref.text}
            </span>
          ) : (
            <button
              key={ref.text}
              type="button"
              className="view-security-ref"
              onClick={() => onPickRef(ref.threatIndex as number)}
            >
              {ref.text}
            </button>
          ),
        )}
      </span>
      <span className="view-security-waiver-text">
        {waiver.title !== '' ? (
          <b>
            <ResearchInline text={waiver.title} />
          </b>
        ) : null}
        <span className="view-security-why" data-clamp={clamped ? 'true' : 'false'}>
          <ResearchInline text={waiver.rationale} />
        </span>
        {waiver.long ? (
          <button
            type="button"
            className="view-security-link"
            aria-expanded={expanded}
            onClick={() => onToggle(`why-${waiver.anchorId}`)}
          >
            {expanded ? 'less' : 'more'}
          </button>
        ) : null}
      </span>
      <span className="view-security-who">
        <i>{waiver.by}</i>
        {waiver.date}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust boundaries
// ---------------------------------------------------------------------------

function Crossing({
  crossing,
  showDestination,
}: {
  crossing: ComposedSecurityCrossing;
  showDestination: boolean;
}): React.JSX.Element {
  return (
    <li className="view-security-crossing">
      <div className="view-security-crossing-line">
        <span className="view-security-from" data-tone={crossing.tone}>
          <ResearchInline text={crossing.source} />
        </span>
        {showDestination ? (
          <>
            <span className="view-security-to-arrow" aria-hidden="true">
              →
            </span>
            <span className="view-security-to">
              <ResearchInline text={crossing.destination} />
            </span>
          </>
        ) : null}
        {crossing.qualifier !== null ? (
          <span className="view-security-muted">
            (<ResearchInline text={crossing.qualifier} />)
          </span>
        ) : null}
        {crossing.data.trim() !== '' ? (
          <span className="view-security-carries" data-tone={crossing.dataTone}>
            <ResearchInline text={crossing.data} />
          </span>
        ) : null}
      </div>
      {crossing.description.trim() !== '' ? (
        <p className="view-security-crossing-desc">
          <ResearchInline text={crossing.description} />
        </p>
      ) : null}
    </li>
  );
}

function Destination({ dest }: { dest: ComposedSecurityDestination }): React.JSX.Element {
  return (
    <div id={dest.anchorId} className="view-security-dest" data-kind={dest.kind} data-at-rest={dest.kind === 'at-rest' ? 'true' : 'false'}>
      <h3 className="view-security-dest-head">
        <ResearchInline text={dest.label} />
        <span className="view-security-muted">{` · ${dest.countText}`}</span>
      </h3>
      <ul className="view-security-crossings">
        {dest.crossings.map((crossing) => (
          <Crossing key={crossing.index} crossing={crossing} showDestination={dest.kind === 'single'} />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Residual observations
// ---------------------------------------------------------------------------

function Residuals({
  residuals,
  expanded,
  flashed,
  onToggle,
  onPickRef,
}: {
  residuals: ComposedSecurityResiduals;
  expanded: boolean;
  flashed: string | null;
  onToggle: (key: string) => void;
  onPickRef: (threatIndex: number) => void;
}): React.JSX.Element {
  return (
    <section id="security-residuals" className="view-security-block view-security-residuals">
      <button
        type="button"
        className="view-security-residuals-toggle"
        aria-expanded={expanded}
        aria-controls={expanded ? 'security-residuals-list' : undefined}
        data-open={expanded ? 'true' : 'false'}
        onClick={() => onToggle('residuals')}
      >
        {residuals.label}
      </button>
      {residuals.lead.length > 0 ? (
        <div className="view-security-residuals-lead">
          <ResearchBlocks blocks={residuals.lead} />
        </div>
      ) : null}
      {expanded ? (
        <ol id="security-residuals-list" className="view-security-residual-list">
          {residuals.items.map((item) => (
            <li
              key={item.anchorId}
              id={item.anchorId}
              className="view-security-residual"
              data-flash={flashed === item.anchorId ? 'true' : 'false'}
            >
              <div className="view-security-residual-head">
                <h3>
                  <ResearchInline text={item.title} />
                </h3>
                {item.refs.map((ref) =>
                  ref.threatIndex === null ? (
                    <span key={ref.text} className="view-security-ref" data-plain="true">
                      {ref.text}
                    </span>
                  ) : (
                    <button
                      key={ref.text}
                      type="button"
                      className="view-security-ref"
                      onClick={() => onPickRef(ref.threatIndex as number)}
                    >
                      {ref.text}
                    </button>
                  ),
                )}
              </div>
              {item.blocks.length > 0 ? <Prose blocks={item.blocks} /> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function SecurityConsoleView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  chip,
  initialPick = null,
  initialAudit = false,
  initialOpen = [],
}: {
  model: ComposedSecurityConsole;
  fallbackTitle: string;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  /** The parse-warning chip, when the artifact carries one. */
  chip?: React.ReactNode;
  /** Initial state, for the static-markup tests only. */
  initialPick?: number | null;
  initialAudit?: boolean;
  initialOpen?: readonly string[];
}): React.JSX.Element {
  const [pick, setPick] = useState<number | null>(initialPick);
  const [audit, setAudit] = useState(initialAudit);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(initialOpen));
  const [flashed, setFlashed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const toggle = useCallback((key: string): void => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const jump = useCallback((anchorId: string): void => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    setFlashed(anchorId);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashed(null), 900);
  }, []);

  const onPickSquare = useCallback((index: number): void => {
    setPick((current) => (current === index ? null : index));
  }, []);

  const onPickRef = useCallback(
    (index: number): void => {
      setPick(index);
      jump('security-detail');
    },
    [jump],
  );

  // The items mount only while the toggle is open: open it (never close it), then scroll to the
  // item once it has mounted.
  const openResidual = useCallback(
    (anchorId: string): void => {
      setOpen((current) => (current.has('residuals') ? current : new Set(current).add('residuals')));
      window.requestAnimationFrame(() => jump(anchorId));
    },
    [jump],
  );

  const onAuditSwitch = useCallback((): void => {
    const next = !audit;
    setAudit(next);
    // The trail appears at the bottom while the switch sits in the sticky rail: once it has
    // mounted, scroll to it.
    if (next) window.requestAnimationFrame(() => jump('security-audit'));
  }, [audit, jump]);

  const { intro, gauge, stamp } = model;
  const unitLabel = model.board.unit;

  return (
    <div className="view-security-console">
      <header className="view-security-rail">
        <div className="view-security-identity">
          <p className="eyebrow">{intro.eyebrow}</p>
          {chip}
          <h1>{intro.title ?? fallbackTitle}</h1>
        </div>
        <div className="view-security-facts">
          <span className="status-chip" data-tone={intro.status.tone}>
            {intro.status.label}
          </span>
          {intro.created ? (
            <span>
              Created<b>{intro.created}</b>
            </span>
          ) : null}
          {intro.asvs ? (
            <span>
              ASVS<b>{intro.asvs}</b>
            </span>
          ) : null}
          <span>
            Blocks at<b>{intro.blocksAt}</b>
          </span>
        </div>
        <Gauge gauge={gauge} />
        <nav className="view-security-nav" aria-label="Security sections">
          {model.nav.map((entry) => (
            <button key={entry.id} type="button" onClick={() => jump(entry.id)}>
              <span>{entry.label}</span>
              <span>{entry.count}</span>
            </button>
          ))}
        </nav>
        <div className="view-security-stamp" data-tone={stamp.tone}>
          <span className="view-security-stamp-glyph" aria-hidden="true">
            {stamp.signed ? '✓' : '○'}
          </span>
          <span>
            <b>{stamp.signed ? 'Signed off' : 'Not signed off'}</b>
            <br />
            <span className="view-security-muted">
              {stamp.approval ? <ResearchInline text={stamp.approval} /> : '—'}
            </span>
          </span>
        </div>
        {model.audit ? (
          <button
            type="button"
            role="switch"
            aria-checked={audit}
            className="view-security-audit-switch"
            onClick={onAuditSwitch}
          >
            <span className="view-security-switch" data-on={audit ? 'true' : 'false'} aria-hidden="true" />
            <span className="view-security-key">Audit trail · {model.audit.runs.length}</span>
          </button>
        ) : null}
        <div className="view-security-tools">
          <CopyPathButton path={path} />
          <DocumentViewToggle mode={mode} onChange={onModeChange} />
        </div>
      </header>

      <div className="view-security-content">
        {model.summary ? (
          <section id="security-summary" className="view-security-block" aria-label="Summary">
            <div className="view-security-lead">
              <ResearchBlocks blocks={model.summary} />
            </div>
          </section>
        ) : null}

        <section id="security-board" className="view-security-block">
          <h2 className="view-security-title">
            Threat board
            <span className="view-security-muted">
              {model.threats.length} {unitLabel} · severity × STRIDE
            </span>
          </h2>
          {model.board.note.length > 0 ? (
            <div className="view-security-note">
              <ResearchBlocks blocks={model.board.note} />
            </div>
          ) : null}
          {model.threats.length > 0 ? (
            <>
              <Board model={model} pick={pick} onPick={onPickSquare} />
              <Legend />
              <Detail model={model} pick={pick} onJump={jump} onResidual={openResidual} />
            </>
          ) : model.board.prose ? (
            <Prose blocks={model.board.prose} />
          ) : null}
        </section>

        <section id="security-waivers" className="view-security-block">
          <h2 className="view-security-title">
            Accepted risks
            <span className="view-security-muted">{model.waivers.rows.length}</span>
          </h2>
          {model.waivers.rows.length > 0 ? (
            <div className="view-security-waivers">
              {model.waivers.rows.map((waiver) => (
                <Waiver
                  key={waiver.anchorId}
                  waiver={waiver}
                  flashed={flashed === waiver.anchorId}
                  expanded={open.has(`why-${waiver.anchorId}`)}
                  onToggle={toggle}
                  onPickRef={onPickRef}
                />
              ))}
            </div>
          ) : (
            <div className="notice view-security-notice">
              {model.waivers.prose.length > 0 ? (
                <Prose blocks={model.waivers.prose} />
              ) : (
                <p>No accepted risks.</p>
              )}
            </div>
          )}
          {model.waivers.note.length > 0 ? (
            <div className="view-security-note">
              <ResearchBlocks blocks={model.waivers.note} />
            </div>
          ) : null}
        </section>

        {model.boundaries ? (
          <section id="security-boundaries" className="view-security-block">
            <h2 className="view-security-title">
              Trust boundaries
              <span className="view-security-muted">what crosses where</span>
            </h2>
            <div className="view-security-dests">
              {model.boundaries.destinations.map((dest) => (
                <Destination key={dest.anchorId} dest={dest} />
              ))}
            </div>
            {model.boundaries.note.length > 0 ? (
              <div className="view-security-note">
                <ResearchBlocks blocks={model.boundaries.note} />
              </div>
            ) : null}
          </section>
        ) : null}

        {model.residuals ? (
          <Residuals
            residuals={model.residuals}
            expanded={open.has('residuals')}
            flashed={flashed}
            onToggle={toggle}
            onPickRef={onPickRef}
          />
        ) : null}

        {model.extras.length > 0 ? (
          <section id="security-extras" className="view-security-block view-security-extras">
            {model.extras.map((extra) => (
              <details key={extra.id}>
                <summary>{extra.heading}</summary>
                <div className="view-security-md">
                  <ResearchBlocks blocks={extra.blocks} />
                </div>
              </details>
            ))}
          </section>
        ) : null}

        {model.signoff ? (
          <section id="security-signoff" className="view-security-block">
            <h2 className="view-security-title">
              Sign-off
              <span className="view-security-muted">
                {model.signoff.done} of {model.signoff.total}
              </span>
            </h2>
            <ul className="view-security-checks">
              {model.signoff.items.map((item, index) => (
                <li key={index} data-done={item.checked ? 'true' : 'false'}>
                  <span className="view-security-ck" aria-hidden="true">
                    {item.checked ? '✓' : '○'}
                  </span>
                  <span>
                    <ResearchInline text={item.text} />
                  </span>
                </li>
              ))}
            </ul>
            {model.signoff.note.length > 0 ? (
              <div className="view-security-note">
                <ResearchBlocks blocks={model.signoff.note} />
              </div>
            ) : null}
          </section>
        ) : null}

        {audit && model.audit ? (
          <section id="security-audit" className="view-security-block" data-flash={flashed === 'security-audit' ? 'true' : 'false'}>
            <h2 className="view-security-title">
              Audit trail
              <span className="view-security-muted">
                {model.audit.runs.length} run{model.audit.runs.length === 1 ? '' : 's'}
              </span>
            </h2>
            <div className="view-security-runs">
              {model.audit.runs.map((run, index) => {
                const total = run.total ?? 0;
                const closed = run.closed ?? 0;
                const openCount = run.openCount ?? 0;
                return (
                  <div key={index} className="view-security-run">
                    <span className="view-security-run-date">{run.date}</span>
                    <span className="view-security-dist" role="img" aria-label={`${closed} of ${total} closed`}>
                      <i data-tone={STATUS_TONE.closed} style={{ flexGrow: closed }} />
                      <i data-tone={run.tone} style={{ flexGrow: openCount }} />
                      <i data-rest="true" style={{ flexGrow: Math.max(0, total - closed - openCount) }} />
                    </span>
                    <span className="view-security-run-n">
                      {closed} / {total} closed
                      {openCount > 0 ? ` · ${run.openText} open` : ''}
                    </span>
                    <span className="view-security-run-by">
                      <ResearchInline text={run.by} />
                    </span>
                  </div>
                );
              })}
            </div>
            {model.audit.note.length > 0 ? (
              <div className="view-security-note">
                <ResearchBlocks blocks={model.audit.note} />
              </div>
            ) : null}
          </section>
        ) : null}

        <nav id="security-source-only" className="view-security-source-only" aria-label="In the source only">
          <span className="view-security-key">In the source only</span>
          <ul>
            {model.sourceOnly.map((entry) => (
              <li key={entry.label}>
                <button type="button" className="status-chip" onClick={() => onShowSource(entry.targetId)}>
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
