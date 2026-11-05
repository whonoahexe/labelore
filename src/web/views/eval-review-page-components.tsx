// The Eval review page's React surface (Phase 10, 10-20, VIEW-12, sketch 050 winner B "Gap -> fix ledger"): the header
// override (eyebrow "Phase N · Eval review", the phase name as the h1, "Audited {date}" as meta) and the page body. The
// first screen is a picture: a ruled head of the score ("64 of 100", mono, Heading size) and GSD's verdict as a chip,
// the tally "{c} covered, {p} partial, {m} missing" beside the shared status-meter (one square per dimension), and the
// file's own Coverage Score, Infrastructure Score and AI-SPEC Present as written. Under it a two-sided ledger: what the
// audit found on the left (a row per dimension, then the smaller infrastructure rows showing the file's own word beside
// its tone) and the remediation plan in the author's order on the right (the groups as the auditor wrote them, steps
// numbered), with a wire - a small SVG overlay - from each row to the step that opens with its name; under 52rem the
// wires go and a tag on the step and a "Fix:" reference on the row carry the link. A row opens its finding in place;
// selecting either end of a wire brings it forward. Below, Critical Gaps, Files Found and anything unclaimed as closed
// bars. Every string is author text rendered as plain React text through ResearchInline - never React's raw-HTML
// injection prop - and no href is built from document text. The score and the verdict are the file's own words: this
// page shows them and never recomputes or overrides them (T-10-38). Colour comes only from the tone a composed model
// carries and the theme tokens; MISSING is the `missing` tone (a hollow square with a ruled outline), never
// destructive, and a word the page does not know is `quiet`.
import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ResearchInline } from '../pages/research-atoms.tsx';
import { StatusMeter } from '../components/status-meter.tsx';
import { stripLeadingHeading } from './document-sections.ts';
import { VERDICT_NOT_STATED_LABEL } from './eval-review-page.ts';
import type { SpecHeaderProps } from './spec-page-components.tsx';
import { splitPhaseTitle } from '../pages/document-title.ts';
import type {
  ComposedEvalBar,
  ComposedEvalReview,
  ComposedEvalStep,
  ComposedEvalTarget,
  EvalReviewTone,
} from './eval-review-page.ts';

/** "EVAL-REVIEW — Phase 4: Bulk Loan Export" as the eyebrow and the h1 it names: the document kind and the dash are
 * dropped, then the phase moves up as `splitPhaseTitle` does for every phase document. A title that does not read that
 * way stays whole under the plain eyebrow "Eval review". */
export function splitEvalReviewTitle(title: string): { phase: string | null; title: string } {
  let rest = title.trim();
  if (rest.toLowerCase().startsWith('eval-review')) {
    rest = rest.slice(11).trim();
    const dash = rest.charAt(0);
    if (dash === '—' || dash === '–' || dash === '-') rest = rest.slice(1).trim();
  }
  const split = splitPhaseTitle(rest, 'Eval review');
  return split.phase === null ? { phase: null, title } : split;
}

function EvalReviewMeta({ model }: { model: ComposedEvalReview }): React.JSX.Element | null {
  if (model.auditDate === null) return null;
  return <span className="view-eval-review-meta">Audited {model.auditDate}</span>;
}

/** The ArtifactHeader override View mode spreads over its props: "Phase N · Eval review", the phase name as the h1, no
 * lead and "Audited {date}" as meta. */
export function evalReviewHeaderProps(model: ComposedEvalReview, artifactTitle: string): SpecHeaderProps {
  const split = splitEvalReviewTitle(artifactTitle);
  return {
    eyebrow: split.phase === null ? 'Eval review' : `${split.phase} · Eval review`,
    title: split.title,
    lead: null,
    meta: <EvalReviewMeta model={model} />,
  };
}

function Square({ tone }: { tone: EvalReviewTone }): React.JSX.Element {
  return <i className="status-square view-eval-review-sq" data-tone={tone} aria-hidden="true" />;
}

function VerdictChip({ model }: { model: ComposedEvalReview }): React.JSX.Element {
  const { tone, word } = model.verdict;
  return (
    <span className="status-chip view-eval-review-verdict" data-tone={tone}>
      <Square tone={tone} />
      {word ?? VERDICT_NOT_STATED_LABEL}
    </span>
  );
}

function Head({ model }: { model: ComposedEvalReview }): React.JSX.Element {
  return (
    <section className="view-eval-review-head" aria-label="Score and verdict">
      <div className="view-eval-review-line">
        {model.score !== null ? (
          <>
            <span className="view-eval-review-key">Score</span>
            <span className="view-eval-review-score">{model.score}</span>
          </>
        ) : null}
        {model.verdict.word !== null ? <span className="view-eval-review-key">Verdict</span> : null}
        <VerdictChip model={model} />
      </div>
      {model.tallyText !== null && model.tally !== null && model.meter !== null ? (
        <div className="view-eval-review-tally">
          <p className="view-eval-review-tally-line">
            <b>{model.tally.covered}</b> covered, <b>{model.tally.partial}</b> partial, <b>{model.tally.missing}</b>{' '}
            missing
          </p>
          <StatusMeter
            filled={model.meter.covered}
            total={model.meter.items.length}
            items={model.meter.items}
            label={model.meter.label}
            size="large"
            caption={
              <>
                <b>
                  {model.meter.covered} of {model.meter.items.length}
                </b>{' '}
                dimensions covered
              </>
            }
          />
        </div>
      ) : null}
      {model.facts.length > 0 ? (
        <p className="view-eval-review-facts">
          {model.facts.map((fact) => (
            <span key={fact.key}>
              {fact.key} <b>{fact.value}</b>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}

/** A name without its trailing parenthetical: what a tag shows ("Eval tooling (Vitest)" tags as "Eval tooling"). */
function tagName(name: string): string {
  const open = name.indexOf('(');
  return open > 0 && name.trimEnd().endsWith(')') ? name.slice(0, open).trim() : name;
}

function Tag({ target }: { target: ComposedEvalTarget }): React.JSX.Element {
  return (
    <span className="view-eval-review-tgt">
      <Square tone={target.tone} />
      {tagName(target.name)}
    </span>
  );
}

function TargetRow({
  model,
  target,
  selected,
  onSelect,
}: {
  model: ComposedEvalReview;
  target: ComposedEvalTarget;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  const small = target.kind === 'component';
  return (
    <button
      type="button"
      className="view-eval-review-row"
      data-size={small ? 'small' : 'default'}
      data-row={`t${target.id}`}
      aria-pressed={selected}
      aria-expanded={selected}
      onClick={onSelect}
    >
      <Square tone={target.tone} />
      <span className="view-eval-review-name">
        <ResearchInline text={target.name} />
      </span>
      <span className="view-eval-review-word">{target.word}</span>
      <span className="view-eval-review-sub">
        {target.measurement !== null ? <span className="view-eval-review-meta">{target.measurement}</span> : null}
        {target.fixes.length > 0 ? (
          <span className="view-eval-review-meta">
            Fix: {target.fixes.map((index) => model.steps[index].ref).join(', ')}
          </span>
        ) : null}
      </span>
      {selected ? (
        <span className="view-eval-review-finding">
          {target.finding === '' ? 'No finding stated.' : <ResearchInline text={target.finding} />}
        </span>
      ) : null}
    </button>
  );
}

function Step({
  model,
  step,
  selected,
  onSelect,
}: {
  model: ComposedEvalReview;
  step: ComposedEvalStep;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="view-eval-review-fix"
      data-fix={`s${step.index}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="view-eval-review-no">{step.no}.</span>
      <span className="view-eval-review-tx">
        <ResearchInline text={step.text} />
        {step.target !== null ? (
          <span className="view-eval-review-tgt-line">
            <Tag target={model.targets[step.target]} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

interface Wire {
  key: string;
  d: string;
  tone: EvalReviewTone;
  on: boolean | null;
}

/** The wires: one stroked curve from the right edge of a row to the left edge of the step that opens with its name,
 * measured after layout. Hidden (and skipped) when the stylesheet hides the overlay under 52rem. */
function useWires(
  model: ComposedEvalReview,
  selection: string | null,
  watch: unknown,
): { ledger: React.RefObject<HTMLDivElement | null>; wires: Wire[]; box: { w: number; h: number } } {
  const ledger = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<{ wires: Wire[]; box: { w: number; h: number } }>({
    wires: [],
    box: { w: 0, h: 0 },
  });
  useLayoutEffect(() => {
    const host = ledger.current;
    if (host === null) return undefined;
    const measure = (): void => {
      const overlay = host.querySelector('svg');
      if (overlay === null || window.getComputedStyle(overlay).display === 'none') {
        setState((current) => (current.wires.length === 0 ? current : { wires: [], box: { w: 0, h: 0 } }));
        return;
      }
      const frame = host.getBoundingClientRect();
      const wires: Wire[] = [];
      for (const step of model.steps) {
        if (step.target === null) continue;
        const from = host.querySelector(`[data-row="t${step.target}"]`);
        const to = host.querySelector(`[data-fix="s${step.index}"]`);
        if (from === null || to === null) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x1 = a.right - frame.left;
        const y1 = a.top + Math.min(a.height / 2, 20) - frame.top;
        const x2 = b.left - frame.left;
        const y2 = b.top + 18 - frame.top;
        const mid = (x1 + x2) / 2;
        wires.push({
          key: `s${step.index}`,
          d: `M${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
          tone: model.targets[step.target].tone,
          on: selection === null ? null : selection === `s${step.index}` || selection === `t${step.target}`,
        });
      }
      const next = { wires, box: { w: frame.width, h: frame.height } };
      setState((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(host);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [model, selection, watch]);
  return { ledger, wires: state.wires, box: state.box };
}

function Ledger({ model }: { model: ComposedEvalReview }): React.JSX.Element | null {
  const [selection, setSelection] = useState<string | null>(null);
  const toggle = (key: string): void => setSelection((current) => (current === key ? null : key));
  const { ledger, wires, box } = useWires(model, selection, null);
  if (model.targets.length === 0 && model.steps.length === 0 && model.groups.length === 0) return null;
  return (
    <section className="view-eval-review-ledger-wrap" aria-label="What the audit found, and the plan">
      <div className="view-eval-review-ledger" ref={ledger}>
        <svg
          className="view-eval-review-wires"
          aria-hidden="true"
          viewBox={`0 0 ${box.w} ${box.h}`}
          focusable="false"
        >
          {wires.map((wire) => (
            <path key={wire.key} d={wire.d} data-tone={wire.tone} data-on={wire.on === null ? undefined : String(wire.on)} />
          ))}
        </svg>
        <div className="view-eval-review-col">
          {model.dimensions.length > 0 ? (
            <>
              <h2 className="view-eval-review-key view-eval-review-colhead">Dimension coverage</h2>
              {model.dimensions.map((id) => (
                <TargetRow
                  key={id}
                  model={model}
                  target={model.targets[id]}
                  selected={selection === `t${id}`}
                  onSelect={() => toggle(`t${id}`)}
                />
              ))}
            </>
          ) : null}
          {model.components.length > 0 ? (
            <>
              <h2 className="view-eval-review-key view-eval-review-colhead" data-gap="true">
                Infrastructure audit{model.infrastructureScore !== null ? ` · ${model.infrastructureScore}` : ''}
              </h2>
              {model.components.map((id) => (
                <TargetRow
                  key={id}
                  model={model}
                  target={model.targets[id]}
                  selected={selection === `t${id}`}
                  onSelect={() => toggle(`t${id}`)}
                />
              ))}
            </>
          ) : null}
        </div>
        <div className="view-eval-review-gut" aria-hidden="true" />
        <div className="view-eval-review-col">
          {model.groups.length > 0 ? (
            <>
              <h2 className="view-eval-review-key view-eval-review-colhead">Remediation plan</h2>
              {model.groups.map((group, groupIndex) => (
                <div key={groupIndex} className="view-eval-review-group">
                  <p className="view-eval-review-ghead">
                    <ResearchInline text={group.heading} />{' '}
                    <span className="view-eval-review-meta">{group.steps.length}</span>
                  </p>
                  {group.steps.length > 0 ? (
                    group.steps.map((index) => (
                      <Step
                        key={index}
                        model={model}
                        step={model.steps[index]}
                        selected={selection === `s${index}`}
                        onSelect={() => toggle(`s${index}`)}
                      />
                    ))
                  ) : (
                    <p className="view-eval-review-zero">
                      <Square tone="quiet" />
                      <span className="view-eval-review-score">0</span>
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** A section the page does not claim: a closed native bar holding the section as the document renders it. */
function Bar({
  bar,
  open,
  onToggle,
  renderHtml,
}: {
  bar: ComposedEvalBar;
  open: boolean;
  onToggle: (open: boolean) => void;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  return (
    <details
      className="view-eval-review-bar"
      id={bar.id}
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary className="view-eval-review-bar-sum">
        <ChevronRight className="view-eval-review-bar-chev" aria-hidden="true" />
        <span className="view-eval-review-bar-name">
          <ResearchInline text={bar.heading} />
        </span>
        {bar.count !== null ? <span className="view-eval-review-bar-count">{bar.count}</span> : null}
      </summary>
      <div className="view-eval-review-bar-body view-eval-review-plain-section">
        {renderHtml(stripLeadingHeading(bar.html))}
      </div>
    </details>
  );
}

function Bars({
  model,
  renderHtml,
}: {
  model: ComposedEvalReview;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element | null {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  if (model.bars.length === 0) return null;
  const setOpen = (id: string, open: boolean): void => {
    setOpenIds((current) => {
      if (current.has(id) === open) return current;
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  return (
    <div className="view-eval-review-bars">
      {model.bars.map((bar) => (
        <Bar
          key={bar.id}
          bar={bar}
          open={openIds.has(bar.id)}
          onToggle={(open) => setOpen(bar.id, open)}
          renderHtml={renderHtml}
        />
      ))}
    </div>
  );
}

export function EvalReviewView({
  model,
  renderHtml,
}: {
  model: ComposedEvalReview;
  renderHtml: (html: string) => React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="view-eval-review-page">
      <Head model={model} />
      <Ledger model={model} />
      <Bars model={model} renderHtml={renderHtml} />
    </div>
  );
}
