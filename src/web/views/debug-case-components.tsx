// The DEBUG page's React surface (quick-261018-j5h, sketch 023 A: the case file): an own head (eyebrow,
// opened / updated stamps, the Archived chip, the shared warning chip, copy path, View / Source, then the
// one h1), the hero (status badge, the reported quote and facts on the left, the status-adaptive lead on
// the right) and the dialog that shows a cut line or the whole resolution.
// Every string derived from the document renders only through `ResearchInline` / `ResearchBlocks`
// (tokenizeInline output mapped to React nodes) or as plain React text - never React's raw-HTML
// injection prop (T-j5h-01) - and no link target is built from document text (T-j5h-06). Paths,
// timestamps and file names are mono text, never links. The status badge and the lead carry the
// documented tones (complete, in-flight, quiet) on `data-tone`; verification results ride
// `data-result` and lead variants `data-variant` as identity marks, not tones, and the page never uses
// a parse-degradation tone. States are `data-*` attributes and aria attributes, never new class names.
// The trigger toggle and the dialog live in component state only: nothing touches the URL.
import { Fragment, useEffect, useRef, useState } from 'react';
import { CopyPathButton } from '../components/copy-path-button.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog.tsx';
import type { DebugValue } from '../../planning-repo/handlers/debug-session.ts';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import { entriesFor, evidenceFilters, roundBreaks, TAG_LABEL } from './debug-case.ts';
import type {
  ComposedDebugCase,
  ComposedDebugEvidence,
  ComposedDebugLead,
  ComposedDebugSuspects,
  ComposedDebugSymptoms,
  DebugEvidenceFilter,
} from './debug-case.ts';

// ---------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------

type DialogState = { kind: 'more'; title: string; value: DebugValue } | { kind: 'resolution' } | null;

const RESULT_MARK = { pass: '✓', fail: '✗', open: '○' } as const;
const RESULT_TITLE = { pass: 'Passed', fail: 'Failed', open: 'Not settled yet' } as const;

function ValueView({ value }: { value: DebugValue }): React.JSX.Element {
  if (value.shape === 'fields') {
    return (
      <dl className="view-debug-dl">
        {value.fields.map((field, index) => (
          <Fragment key={`${field.label}-${index}`}>
            <dt>{field.label}</dt>
            <dd>
              <ResearchBlocks blocks={field.blocks} />
            </dd>
          </Fragment>
        ))}
      </dl>
    );
  }
  return <ResearchBlocks blocks={value.blocks} />;
}

function MoreButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button type="button" className="view-debug-more" onClick={onClick}>
      More ↗
    </button>
  );
}

/** A CSS-clamped line. Its More button shows only once a ResizeObserver callback measures that the clamp
 * actually cuts the text (re-measured on resize); without a ResizeObserver it never shows. */
function ClampedLine({
  as: Tag,
  big,
  always,
  children,
  onMore,
}: {
  as: 'p' | 'span';
  big?: boolean;
  /** True when the text was shortened: its More button shows whether or not the clamp cuts. */
  always?: boolean;
  children: React.ReactNode;
  onMore: () => void;
}): React.JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  const [cut, setCut] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el === null || typeof ResizeObserver === 'undefined') return undefined;
    const measure = (): void => setCut(el.scrollHeight > el.clientHeight + 2);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <Tag
        ref={(node: HTMLElement | null) => {
          ref.current = node;
        }}
        className={big ? 'view-debug-big' : undefined}
        data-clamp=""
      >
        {children}
      </Tag>
      {always === true || cut ? <MoreButton onClick={onMore} /> : null}
    </>
  );
}

function Field({ kicker, children }: { kicker: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="view-debug-field">
      <span className="view-debug-kicker">{kicker}</span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The lead
// ---------------------------------------------------------------------------

function Lead({
  lead,
  onMore,
  onResolution,
}: {
  lead: ComposedDebugLead;
  onMore: (title: string, value: DebugValue) => void;
  onResolution: () => void;
}): React.JSX.Element {
  const open = (label: string, text: { text: string; value: DebugValue } | null, big: boolean): React.JSX.Element => (
    <Field kicker={label}>
      <ClampedLine as={big ? 'p' : 'span'} big={big} onMore={() => text !== null && onMore(label, text.value)}>
        <ResearchInline text={text === null || text.text === '' ? '—' : text.text} />
      </ClampedLine>
    </Field>
  );

  const next =
    lead.next === null ? null : (
      <div className="view-debug-next">
        <span aria-hidden="true">→</span>
        <div>
          <span className="view-debug-kicker">{lead.next.label}</span>
          <ResearchInline text={lead.next.text} />
        </div>
      </div>
    );

  const causes =
    lead.causes === null ? null : (
      <Field kicker={lead.causes.kicker}>
        {lead.causes.items.length > 1 ? (
          <ol className="view-debug-causes">
            {lead.causes.items.map((cause, index) => (
              <li key={`${cause.label}-${index}`}>
                <span className="view-debug-cause-label">{cause.label}</span>
                <span>
                  <ResearchInline text={cause.text} />
                  {cause.cut ? (
                    <>
                      {' '}
                      <MoreButton onClick={() => onMore(`Root cause · ${cause.label}`, cause.value)} />
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="view-debug-big">
            <ResearchInline text={lead.causes.items[0].text} />
            {lead.causes.items[0].cut ? (
              <>
                {' '}
                <MoreButton onClick={() => onMore('Root cause', lead.causes!.items[0].value)} />
              </>
            ) : null}
          </p>
        )}
      </Field>
    );

  const fix =
    lead.fix === null ? null : (
      <Field kicker={lead.fix.label}>
        <ClampedLine
          as="span"
          always={lead.fix.cut}
          onMore={() => onMore(lead.fix!.notApplied ? 'Suggested fix' : lead.fix!.label, lead.fix!.value)}
        >
          <ResearchInline text={lead.fix.text} />
        </ClampedLine>
      </Field>
    );

  const verification =
    lead.verification === null ? null : (
      <Field kicker={lead.verification.kicker}>
        {lead.verification.chips !== null ? (
          <div className="view-debug-vchips">
            {lead.verification.chips.map((chip, index) => (
              <span
                key={`${chip.name}-${index}`}
                className="view-debug-vchip"
                data-result={chip.result}
                title={RESULT_TITLE[chip.result]}
              >
                {RESULT_MARK[chip.result]} {chip.name}
              </span>
            ))}
          </div>
        ) : (
          <span>
            <ResearchInline text={lead.verification.text} />
          </span>
        )}
      </Field>
    );

  const files =
    lead.files === null ? null : (
      <Field kicker={lead.files.kicker}>
        <div className="view-debug-files">
          {lead.files.items.map((file, index) => (
            <code key={`${file.path}-${index}`} className="view-debug-file" title={file.title}>
              {file.name}
            </code>
          ))}
        </div>
      </Field>
    );

  const link = lead.resolutionLink ? (
    <button type="button" className="view-debug-link" onClick={onResolution}>
      The full root cause, fix and verification ↗
    </button>
  ) : null;

  return (
    <section className="view-debug-lead" data-variant={lead.variant} data-tone={lead.tone}>
      {lead.kicker !== null ? <span className="view-debug-kicker">{lead.kicker}</span> : null}
      {lead.variant === 'open' ? (
        <>
          {open('Current hypothesis', lead.hypothesis, true)}
          <div className="view-debug-two">
            {open('Testing it by', lead.test, false)}
            {open('What the result means', lead.expecting, false)}
          </div>
          {next}
        </>
      ) : lead.variant === 'awaiting' ? (
        <>
          {next}
          {causes}
          {fix}
          {verification}
          {files}
          {link}
        </>
      ) : lead.variant === 'diagnosed' ? (
        <>
          {causes}
          {fix}
          {link}
        </>
      ) : (
        <>
          {causes}
          {fix}
          {verification}
          {files}
          {link}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The trail: Expected vs actual, Suspects, Evidence log, Also in this session
// ---------------------------------------------------------------------------

function SectionHead({
  title,
  aside,
  targetId,
  onShowSource,
}: {
  title: string;
  aside: string | null;
  /** Omit the Source button by passing `undefined`. */
  targetId: string | null | undefined;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  return (
    <div className="view-debug-section-head">
      <h2>{title}</h2>
      <span>
        {aside}
        {targetId !== undefined ? (
          <button type="button" className="view-debug-link" onClick={() => onShowSource(targetId)}>
            Source ↗
          </button>
        ) : null}
      </span>
    </div>
  );
}

function Symptoms({
  symptoms,
  onShowSource,
}: {
  symptoms: ComposedDebugSymptoms;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  const both = symptoms.expected !== null || symptoms.actual !== null;
  return (
    <section>
      <SectionHead title="Expected vs actual" aside={null} targetId={symptoms.targetId} onShowSource={onShowSource} />
      {both ? (
        <div className="view-debug-ea">
          <div className="view-debug-expected">
            <span className="view-debug-kicker">Should happen</span>
            {symptoms.expected === null ? <p>—</p> : <ValueView value={symptoms.expected.value} />}
          </div>
          <div className="view-debug-actual">
            <span className="view-debug-kicker">What happens</span>
            {symptoms.actual === null ? <p>—</p> : <ValueView value={symptoms.actual.value} />}
          </div>
        </div>
      ) : null}
      {symptoms.rest.length > 0 ? (
        <div className="view-debug-symptoms">
          {symptoms.rest.map((row, index) => (
            <div key={`${row.label}-${index}`}>
              <span className="view-debug-kicker">{row.label}</span>
              <div>
                <ValueView value={row.value} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Suspects({ suspects }: { suspects: ComposedDebugSuspects }): React.JSX.Element | null {
  if (suspects.total === 0) return null;
  return (
    <section>
      <SectionHead title="Suspects" aside={`${suspects.total} considered`} targetId={undefined} onShowSource={() => undefined} />
      <div className="view-debug-suspects">
        {suspects.columns.map((column) => (
          <div key={column.key} className="view-debug-column" data-column={column.key}>
            <header>
              <span>{column.label}</span>
              <span>{column.items.length}</span>
            </header>
            {column.items.length === 0 ? (
              <p className="view-debug-none">None.</p>
            ) : (
              column.items.map((item, index) => (
                <div key={`${item.text}-${index}`} className="view-debug-suspect" data-column={column.key}>
                  {item.kind !== null ? <span className="view-debug-kind">{item.kind}</span> : null}
                  <span className="view-debug-suspect-text">
                    <ResearchInline text={item.text} />
                  </span>
                  {item.why !== null ? (
                    <span className="view-debug-why">
                      <b>Ruled out by</b> <ResearchInline text={item.why} />
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidenceLog({
  evidence,
  initialFilter,
  onShowSource,
}: {
  evidence: ComposedDebugEvidence;
  initialFilter: DebugEvidenceFilter | undefined;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  const [filter, setFilter] = useState<DebugEvidenceFilter>(initialFilter ?? evidence.defaultFilter);
  const filters = evidenceFilters(evidence);
  const shown = entriesFor(evidence, filter);
  const breaks = roundBreaks(evidence, filter);
  return (
    <section>
      <SectionHead
        title="Evidence log"
        aside={`${evidence.total} ${evidence.total === 1 ? 'entry' : 'entries'}`}
        targetId={evidence.targetId}
        onShowSource={onShowSource}
      />
      <div className="view-debug-filters">
        {filters.map((f) => (
          <button
            key={f.filter}
            type="button"
            className="view-debug-filter"
            aria-pressed={filter === f.filter}
            onClick={() => setFilter(f.filter)}
          >
            {f.filter !== 'all' ? <span className="view-debug-tag" data-tag={f.filter} aria-hidden="true" /> : null}
            {f.label} <b>{f.count}</b>
          </button>
        ))}
      </div>
      <div className="view-debug-evlist">
        {shown.length === 0 ? <p className="view-debug-none">Nothing with this tag.</p> : null}
        {shown.map((entry) => (
          <Fragment key={entry.no}>
            {breaks.has(entry.no) ? <div className="view-debug-round">{breaks.get(entry.no)}</div> : null}
            <article className="view-debug-ev" data-tag={entry.tag}>
              <div className="view-debug-ev-top">
                <span className="view-debug-ts">
                  #{entry.no} · {entry.ts}
                </span>
                <span className="view-debug-tag" data-tag={entry.tag}>
                  {TAG_LABEL[entry.tag]}
                </span>
              </div>
              {entry.checked !== '' ? (
                <p className="view-debug-checked">
                  <ResearchInline text={entry.checked} />
                </p>
              ) : null}
              {entry.found !== '' ? (
                <p className="view-debug-found">
                  <ResearchInline text={entry.found} />
                </p>
              ) : null}
              {entry.text !== '' ? (
                <p className="view-debug-found">
                  <ResearchInline text={entry.text} />
                </p>
              ) : null}
              {entry.implication !== '' ? (
                <p className="view-debug-impl">
                  <span>
                    <ResearchInline text={entry.implication} />
                  </span>
                </p>
              ) : null}
            </article>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function AlsoRow({
  items,
  onShowSource,
}: {
  items: ComposedDebugCase['also'];
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <nav className="view-debug-also" aria-label="Also in this session">
      <span className="view-debug-key">Also in this session</span>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <button type="button" className="status-chip" title={item.title} onClick={() => onShowSource(item.targetId)}>
              {item.label}
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

export interface DebugCaseViewProps {
  model: ComposedDebugCase;
  fallbackTitle: string;
  path: string;
  mode: 'view' | 'source';
  onModeChange: (mode: 'view' | 'source') => void;
  onShowSource: (id: string | null) => void;
  chip: React.ReactNode;
  /** Static-markup tests only: the evidence filter the view opens on. */
  initialFilter?: DebugEvidenceFilter;
}

export function DebugCaseView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  chip,
  initialFilter,
}: DebugCaseViewProps): React.JSX.Element {
  const [trigOpen, setTrigOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  // Focus lands on the dialog's header, not on its last button: that would scroll a long resolution to its end.
  const headRef = useRef<HTMLDivElement | null>(null);

  const { head, status, trigger, facts, lead, resolution, symptoms, suspects, evidence, also } = model;
  const title = head.title ?? fallbackTitle;
  const showSource = (id: string | null): void => {
    setDialog(null);
    onShowSource(id);
  };

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas view-debug-page" aria-label={`${title} document`}>
        <header className="view-debug-head">
          <div className="view-debug-meta">
            <div className="view-debug-meta-left">
              <p className="eyebrow">{head.eyebrow}</p>
              {head.opened !== null ? (
                <span className="view-debug-date">
                  Opened <b>{head.opened}</b>
                </span>
              ) : null}
              {head.updated !== null ? (
                <span className="view-debug-date">
                  Updated <b>{head.updated}</b>
                </span>
              ) : null}
              {head.archived ? (
                <span className="status-chip" data-tone="quiet">
                  Archived
                </span>
              ) : null}
              {chip}
            </div>
            <div className="view-debug-tools">
              <CopyPathButton path={path} />
              <DocumentViewToggle mode={mode} onChange={onModeChange} />
            </div>
          </div>
          <h1 className="view-debug-title">
            <ResearchInline text={title} />
          </h1>
        </header>

        <section className="view-debug-hero" aria-label="Where this session stands">
          <div className="view-debug-case">
            <span className="view-debug-status" data-tone={status.tone}>
              {status.label}
            </span>
            {trigger !== null ? (
              <figure className="view-debug-reported">
                <p className="view-debug-quote">
                  <ResearchInline text={trigger.short !== null && !trigOpen ? trigger.short : trigger.text} />
                </p>
                <figcaption className="view-debug-by">
                  What was reported
                  {trigger.short !== null ? (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="view-debug-link"
                        aria-expanded={trigOpen}
                        onClick={() => setTrigOpen((v) => !v)}
                      >
                        {trigOpen ? 'Less' : 'All of it'}
                      </button>
                    </>
                  ) : null}
                </figcaption>
              </figure>
            ) : null}
            <p className="view-debug-facts">
              {facts.map((fact) => (
                <span key={fact.label}>
                  {fact.label}
                  <b>{fact.value}</b>
                </span>
              ))}
            </p>
          </div>
          <Lead
            lead={lead}
            onMore={(label, value) => setDialog({ kind: 'more', title: label, value })}
            onResolution={() => setDialog({ kind: 'resolution' })}
          />
        </section>

        {symptoms !== null ? <Symptoms symptoms={symptoms} onShowSource={showSource} /> : null}
        <Suspects suspects={suspects} />
        {evidence !== null ? <EvidenceLog evidence={evidence} initialFilter={initialFilter} onShowSource={showSource} /> : null}
        <AlsoRow items={also} onShowSource={showSource} />

        <Dialog open={dialog !== null} onOpenChange={(next) => (next ? undefined : setDialog(null))}>
          <DialogContent className="view-debug-modal" initialFocus={headRef}>
            {dialog !== null && dialog.kind === 'more' ? (
              <>
                <DialogHeader ref={headRef} tabIndex={-1}>
                  <DialogTitle>{dialog.title}</DialogTitle>
                </DialogHeader>
                <ValueView value={dialog.value} />
              </>
            ) : dialog !== null && resolution !== null ? (
              <>
                <DialogHeader ref={headRef} tabIndex={-1}>
                  <DialogTitle>Resolution in full</DialogTitle>
                </DialogHeader>
                {resolution.parts.map((part) => (
                  <section key={part.label} className="view-debug-field">
                    <span className="view-debug-kicker">{part.label}</span>
                    <ValueView value={part.value} />
                  </section>
                ))}
                {resolution.files.length > 0 ? (
                  <section className="view-debug-field">
                    <span className="view-debug-kicker">Files changed</span>
                    {resolution.files.map((file, index) => (
                      <div key={`${file.path}-${index}`} className="view-debug-modal-file">
                        <span>{file.path}</span>
                        {file.note !== null ? (
                          <span className="view-debug-note">
                            <ResearchInline text={file.note} />
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </section>
                ) : null}
                <button type="button" className="view-debug-link" onClick={() => showSource(resolution.targetId)}>
                  Open in source ↗
                </button>
              </>
            ) : (
              <DialogHeader ref={headRef} tabIndex={-1}>
                <DialogTitle>Resolution in full</DialogTitle>
              </DialogHeader>
            )}
          </DialogContent>
        </Dialog>
      </article>
    </div>
  );
}
