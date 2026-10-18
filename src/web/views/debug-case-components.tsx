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
import type { ComposedDebugCase, ComposedDebugLead } from './debug-case.ts';

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
}

export function DebugCaseView({
  model,
  fallbackTitle,
  path,
  mode,
  onModeChange,
  onShowSource,
  chip,
}: DebugCaseViewProps): React.JSX.Element {
  const [trigOpen, setTrigOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const { head, status, trigger, facts, lead, resolution } = model;
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

        <Dialog open={dialog !== null} onOpenChange={(next) => (next ? undefined : setDialog(null))}>
          <DialogContent className="view-debug-modal">
            {dialog !== null && dialog.kind === 'more' ? (
              <>
                <DialogHeader>
                  <DialogTitle>{dialog.title}</DialogTitle>
                </DialogHeader>
                <ValueView value={dialog.value} />
              </>
            ) : dialog !== null && resolution !== null ? (
              <>
                <DialogHeader>
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
              <DialogHeader>
                <DialogTitle>Resolution in full</DialogTitle>
              </DialogHeader>
            )}
          </DialogContent>
        </Dialog>
      </article>
    </div>
  );
}
