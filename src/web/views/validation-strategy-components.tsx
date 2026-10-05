// The VALIDATION strategy page's React surface (quick-261003-526, sketch 016 winner A "Run sheet"):
// the cover (facts, quiet dims, three verdict cells whose sign-off expands in place), "01 How it's
// tested" (spec list, Quick / Full command blocks with copy, the cadence ladder and latency meter),
// "02 Task verification" (status strip, filters, wave lanes of task tiles and the sticky inspector),
// the folded Wave 0 line, "03 Checked by a human" cards, "04 Sign-off" (checklist beside the
// Approval stamp), the folded extras and the "In the source only" strip. Every string derived from
// the document renders only through `ResearchInline` / `ResearchBlocks` (tokenizeInline output
// mapped to React nodes) or as plain React text — never React's raw-HTML injection prop (T-526-02),
// and no href is built from document text (T-526-03). A copy button writes exactly the visible
// command (T-526-04). Colour comes only from the tone a composed model carries (the maps in
// `validation-strategy.ts`) and the theme tokens; the parse-degradation tones never appear on
// document content.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../components/copy-path-button.tsx';
import type { ValidationRowStatus, ValidationTestKind } from '../../planning-repo/handlers/validation-strategy.ts';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import { STATUS_TONE, TEMPLATE_TONE } from './validation-strategy.ts';
import type {
  ComposedValidationCells,
  ComposedValidationIntro,
  ComposedValidationRig,
  ComposedValidationRun,
  ComposedValidationSection,
  ComposedValidationSignoff,
  ComposedValidationSquare,
  ComposedValidationStrategy,
  ComposedValidationTask,
} from './validation-strategy.ts';

// ---------------------------------------------------------------------------
// Jump + flash (the UAT idiom): scroll the target to the middle, outline it for ~900 ms
// ---------------------------------------------------------------------------

function useFlashJump(): (id: string) => void {
  const timer = useRef<number | null>(null);
  const flashed = useRef<HTMLElement | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      flashed.current?.removeAttribute('data-flash');
    },
    [],
  );

  return useCallback((id: string): void => {
    const target = document.getElementById(id);
    if (!target) return;
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    if (timer.current !== null) window.clearTimeout(timer.current);
    flashed.current?.removeAttribute('data-flash');
    target.setAttribute('data-flash', 'true');
    flashed.current = target;
    timer.current = window.setTimeout(() => {
      target.removeAttribute('data-flash');
      timer.current = null;
    }, 900);
  }, []);
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

/** Copies exactly the command shown beside it; Copy turns to Check for 1.5 s, silent on failure. */
function CopyCommand({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = async (): Promise<void> => {
    if (!(await copyText(text))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      className="view-validation-copy"
      aria-label="Copy command"
      title="Copy command"
      data-copied={copied}
      onClick={copy}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </button>
  );
}

function SectionHeading({ section }: { section: ComposedValidationSection }): React.JSX.Element {
  return (
    <header className="section-heading">
      <h2>
        <span className="view-validation-number">{section.number}</span>
        {section.title}
      </h2>
      <span className="view-validation-aside">{section.aside}</span>
    </header>
  );
}

function Squares({
  squares,
  label,
}: {
  squares: ComposedValidationSquare[];
  label: string;
}): React.JSX.Element | null {
  if (squares.length === 0) return null;
  return (
    <span className="view-validation-squares" role="img" aria-label={label}>
      {squares.map((square) => (
        <span key={square.index} className="view-validation-square" data-tone={square.tone} title={square.title} />
      ))}
    </span>
  );
}

function Checklist({ items }: { items: ComposedValidationSignoff['items'] }): React.JSX.Element {
  return (
    <ul className="view-validation-checklist">
      {items.map((item, index) => (
        <li key={index} data-done={item.checked}>
          <span className="view-validation-mark" aria-hidden="true">
            {item.checked ? '✓' : '○'}
          </span>
          <span>
            <ResearchInline text={item.text} />
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Cover: facts, quiet dims, the three verdict cells
// ---------------------------------------------------------------------------

export function ValidationIntroMeta({
  intro,
  cells,
  initialChecksOpen = false,
}: {
  intro: ComposedValidationIntro;
  cells: ComposedValidationCells;
  initialChecksOpen?: boolean;
}): React.JSX.Element {
  const [checksOpen, setChecksOpen] = useState(initialChecksOpen);
  const jump = useFlashJump();
  const { tasks, human, signoff } = cells;
  return (
    <div className="view-validation-cover">
      <p className="view-validation-facts">
        <span className="status-chip" data-tone={intro.status.tone}>
          {intro.status.label}
        </span>
        {intro.created ? (
          <span>
            Created<b>{intro.created}</b>
          </span>
        ) : null}
        {intro.reconciled ? (
          <span>
            Reconciled<b>{intro.reconciled}</b>
          </span>
        ) : null}
        {intro.updated ? (
          <span>
            Updated<b>{intro.updated}</b>
          </span>
        ) : null}
      </p>
      {intro.dims.length > 0 ? (
        <div className="view-validation-dims">
          {intro.dims.map((dim) => (
            <span key={dim.key} className="view-validation-dim" data-tone={dim.tone}>
              <span className="view-validation-dim-glyph" aria-hidden="true">
                {dim.glyph}
              </span>
              {dim.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="view-validation-cells">
        <div className="view-validation-cell" data-cell="tasks">
          <span className="view-validation-key">Tasks proven</span>
          <span className="view-validation-big">
            {tasks.value ?? '—'}
            <small>{tasks.note}</small>
          </span>
          <Squares squares={tasks.squares} label={tasks.label} />
        </div>
        <div className="view-validation-cell" data-cell="human">
          <span className="view-validation-key">Human checks</span>
          <span className="view-validation-big">
            {human.count}
            <small>{human.note}</small>
          </span>
          {human.hasSection ? (
            <button type="button" className="view-validation-link" onClick={() => jump('validation-manual')}>
              Go to checks ↓
            </button>
          ) : null}
        </div>
        {signoff ? (
          <div className="view-validation-cell" data-cell="signoff">
            <span className="view-validation-key">Sign-off</span>
            <span className="view-validation-big">
              {signoff.checked}
              <small>of {signoff.total} checks</small>
            </span>
            {signoff.approval ? (
              <span className="view-validation-approval">
                <ResearchInline text={signoff.approval} />
              </span>
            ) : null}
            <button
              type="button"
              className="view-validation-link"
              aria-expanded={checksOpen}
              onClick={() => setChecksOpen((open) => !open)}
            >
              {checksOpen ? 'Hide checks ▴' : 'Show checks ▾'}
            </button>
          </div>
        ) : null}
      </div>
      {signoff && checksOpen ? (
        <div className="view-validation-cover-checks">
          <Checklist items={signoff.items} />
        </div>
      ) : null}
    </div>
  );
}

/** Every field optional on purpose: the page spreads this over ArtifactHeader's own props, and a
 * Partial keeps TypeScript from flagging the intentional override. */
export type ValidationHeaderProps = Partial<{
  eyebrow: string;
  title: string;
  lead: null;
  hideCrumbs: boolean;
  meta: React.ReactNode;
}>;

/** The ArtifactHeader override View mode spreads over its props: the eyebrow, the slug title, no
 * lead, no breadcrumb row, and the cover as `meta`. */
export function validationHeaderProps(
  strategy: ComposedValidationStrategy,
  fallbackTitle: string,
): ValidationHeaderProps {
  return {
    eyebrow: strategy.intro.eyebrow,
    title: strategy.intro.title ?? fallbackTitle,
    lead: null,
    hideCrumbs: true,
    meta: <ValidationIntroMeta intro={strategy.intro} cells={strategy.cells} />,
  };
}

// ---------------------------------------------------------------------------
// 01 How it's tested
// ---------------------------------------------------------------------------

function RunBlock({
  kind,
  label,
  runs,
}: {
  kind: 'quick' | 'full';
  label: string;
  runs: ComposedValidationRun[];
}): React.JSX.Element | null {
  if (runs.length === 0) return null;
  return (
    <div className="view-validation-run" data-run={kind}>
      <span className="view-validation-run-key">{label}</span>
      <div className="view-validation-cmds">
        {runs.map((run, runIndex) =>
          run.commands.map((command, commandIndex) => (
            <div key={`${runIndex}-${commandIndex}`} className="view-validation-cmd">
              {run.qualifier ? <span className="view-validation-qualifier">{run.qualifier}</span> : null}
              <span className="view-validation-cmd-text">
                <ResearchInline text={command.text} />
              </span>
              {command.copy ? <CopyCommand text={command.copy} /> : null}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

function Rig({
  rig,
  section,
}: {
  rig: ComposedValidationRig;
  section: ComposedValidationSection;
}): React.JSX.Element {
  const { sampling } = rig;
  return (
    <section id={section.id} className="view-block view-validation-rig-section">
      <SectionHeading section={section} />
      <div className="view-validation-rig">
        <div className="view-validation-rig-left">
          {rig.spec.length > 0 ? (
            <dl className="view-validation-spec">
              {rig.spec.map((row, index) => (
                <div key={index} className="view-validation-spec-row" data-muted={row.muted}>
                  <dt>{row.key}</dt>
                  <dd>
                    <ResearchInline text={row.value} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="view-validation-runs">
            <RunBlock kind="quick" label="Quick" runs={rig.quick} />
            <RunBlock kind="full" label="Full" runs={rig.full} />
            {rig.runtime ? (
              <p className="view-validation-runtime">
                Runtime · <ResearchInline text={rig.runtime} />
              </p>
            ) : null}
          </div>
          {rig.prose.length > 0 ? (
            <div className="view-validation-prose">
              <ResearchBlocks blocks={rig.prose} />
            </div>
          ) : null}
        </div>
        {sampling ? (
          <div className="view-validation-rig-right">
            <h3 className="view-validation-subheading">Sampling rate</h3>
            {sampling.lead.length > 0 ? (
              <div className="view-validation-prose">
                <ResearchBlocks blocks={sampling.lead} />
              </div>
            ) : null}
            <ol className="view-validation-cadence">
              {sampling.steps.map((step, index) => (
                <li key={index} className="view-validation-step" data-size={step.size}>
                  <span className="view-validation-tick" aria-hidden="true">
                    <i />
                  </span>
                  <div>
                    <div className="view-validation-when">
                      <ResearchInline text={step.when} />
                    </div>
                    <div className="view-validation-what">
                      <ResearchInline text={step.what} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            {sampling.latency ? (
              <div className="view-validation-latency">
                <span className="view-validation-key">Max feedback latency</span>
                <span className="view-validation-meter">
                  <i style={{ width: `${sampling.latency.percent}%` }} />
                </span>
                <span className="view-validation-latency-value">
                  <ResearchInline text={sampling.latency.text} />
                </span>
              </div>
            ) : null}
            {sampling.tail.length > 0 ? (
              <div className="view-validation-prose">
                <ResearchBlocks blocks={sampling.tail} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 02 Task verification
// ---------------------------------------------------------------------------

export interface ValidationFilter {
  ref: string | null;
  kind: ValidationTestKind | null;
  status: ValidationRowStatus | null;
}

const NO_FILTER: ValidationFilter = { ref: null, kind: null, status: null };

function anyFilter(filter: ValidationFilter): boolean {
  return filter.ref !== null || filter.kind !== null || filter.status !== null;
}

function passesFilter(task: ComposedValidationTask, filter: ValidationFilter): boolean {
  if (filter.ref !== null && !task.requirements.includes(filter.ref) && !task.threats.includes(filter.ref)) {
    return false;
  }
  if (filter.kind !== null && task.kind !== filter.kind) return false;
  if (filter.status !== null && task.status !== filter.status) return false;
  return true;
}

function FileMarker({ kind }: { kind: ComposedValidationTask['file']['kind'] }): React.JSX.Element | null {
  if (kind !== 'create' && kind !== 'extend') return null;
  return <span className="view-validation-marker" data-file={kind} aria-hidden="true" />;
}

function Tile({
  task,
  selected,
  dimmed,
  onSelect,
}: {
  task: ComposedValidationTask;
  selected: boolean;
  dimmed: boolean;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      id={task.anchorId}
      className="view-validation-tile"
      data-tone={task.tone}
      data-file={task.file.kind}
      data-dim={dimmed}
      aria-pressed={selected}
      onClick={() => onSelect(task.index)}
    >
      <span className="view-validation-tile-top">
        <span className="view-validation-tile-id">{task.shortId}</span>
        <span className="view-validation-glyph" data-kind={task.kind} data-tone={task.glyphTone ?? undefined}>
          {task.glyph}
        </span>
      </span>
      <span className="view-validation-tile-text">{task.behaviorPlain}</span>
      <span className="view-validation-tile-reqs">{task.reqLabel}</span>
    </button>
  );
}

function RefButton({
  value,
  active,
  onPick,
}: {
  value: string;
  active: boolean;
  onPick: (value: string) => void;
}): React.JSX.Element {
  return (
    <button type="button" className="view-validation-ref" aria-pressed={active} onClick={() => onPick(value)}>
      {value}
    </button>
  );
}

function Inspector({
  task,
  filter,
  hasManual,
  onPickRef,
  onClose,
  onJumpManual,
}: {
  task: ComposedValidationTask | null;
  filter: ValidationFilter;
  hasManual: boolean;
  onPickRef: (value: string) => void;
  onClose: () => void;
  onJumpManual: () => void;
}): React.JSX.Element {
  if (task === null) {
    return (
      <aside className="view-validation-inspector" aria-label="Task inspector">
        <div className="view-validation-inspector-empty">
          <span className="view-validation-key">Inspector</span>
          <p>Pick a task to see what it proves, the command that proves it, and whether its test file exists yet.</p>
          <p className="view-validation-inspector-hint">Solid edge = file exists · dashed = file to create</p>
        </div>
      </aside>
    );
  }
  return (
    <aside className="view-validation-inspector" aria-label="Task inspector">
      <div className="view-validation-inspector-head">
        <span className="view-validation-ref">{task.id}</span>
        <span className="view-validation-glyph" data-kind={task.kind} data-tone={task.glyphTone ?? undefined}>
          {task.glyph}
        </span>
        <span className="status-chip" data-tone={task.tone}>
          {task.statusLabel}
        </span>
        <button type="button" className="view-validation-link" aria-label="Clear selection" onClick={onClose}>
          ✕
        </button>
      </div>
      <h3 className="view-validation-inspector-title">
        <ResearchInline text={task.behavior} />
      </h3>
      <dl className="view-validation-kv">
        <dt>Plan · wave</dt>
        <dd>
          {task.plan || '—'} · {task.wave || '—'}
        </dd>
        <dt>Requirement</dt>
        <dd>
          {task.requirements.length > 0
            ? task.requirements.map((value) => (
                <RefButton key={value} value={value} active={filter.ref === value} onPick={onPickRef} />
              ))
            : '—'}
        </dd>
        <dt>Threat</dt>
        <dd>
          {task.threats.length > 0
            ? task.threats.map((value) => (
                <RefButton key={value} value={value} active={filter.ref === value} onPick={onPickRef} />
              ))
            : '—'}
        </dd>
        <dt>Test file</dt>
        <dd>
          {task.file.kind === 'unknown' ? (
            <span className="view-validation-muted">Not recorded</span>
          ) : (
            <>
              <FileMarker kind={task.file.kind} />
              <span>{task.file.label}</span>
              {task.file.note ? (
                <span className="view-validation-muted">
                  · <ResearchInline text={task.file.note} />
                </span>
              ) : null}
            </>
          )}
        </dd>
      </dl>
      <div className="view-validation-command">
        <span className="view-validation-key">{task.commandLabel}</span>
        <div className="view-validation-cmd-box">
          <div>
            <ResearchInline text={task.command === '' ? '—' : task.command} />
          </div>
          {task.copy ? <CopyCommand text={task.copy} /> : null}
        </div>
        {task.prerequisite ? (
          <p className="view-validation-prereq">
            <span className="view-validation-key">Before it runs · </span>
            <ResearchInline text={task.prerequisite} />
          </p>
        ) : null}
        {task.human && hasManual ? (
          <button type="button" className="view-validation-link" onClick={onJumpManual}>
            See the human checks ↓
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function Chip({
  filterKey,
  pressed,
  tone,
  count,
  onClick,
  children,
}: {
  filterKey: 'ref' | 'kind' | 'status';
  pressed: boolean;
  tone?: string;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="status-chip view-validation-filter"
      data-filter={filterKey}
      data-tone={tone}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
      <span className="view-validation-count">{count}</span>
    </button>
  );
}

function MapSection({
  map,
  section,
  hasManual,
  selected,
  filter,
  onSelect,
  onFilter,
  onJumpManual,
}: {
  map: NonNullable<ComposedValidationStrategy['map']>;
  section: ComposedValidationSection;
  hasManual: boolean;
  selected: number | null;
  filter: ValidationFilter;
  onSelect: (index: number | null) => void;
  onFilter: (next: ValidationFilter) => void;
  onJumpManual: () => void;
}): React.JSX.Element {
  const toggleSelect = (index: number): void => onSelect(selected === index ? null : index);
  const pickRef = (value: string): void => onFilter({ ...filter, ref: filter.ref === value ? null : value });
  const selectedTask = selected === null ? null : (map.tasks[selected] ?? null);
  return (
    <section id={section.id} className="view-block view-validation-map">
      <SectionHeading section={section} />
      {map.template ? (
        <div className="notice view-validation-template" data-tone={TEMPLATE_TONE}>
          <strong>The map was never filled in.</strong>
          <span className="view-validation-muted">
            It still holds the template&apos;s own row (<code>{map.template.id}</code> ·{' '}
            <ResearchInline text={map.template.command} />
            ). The planner fills it from the task breakdown; validate-phase reconciles it.
          </span>
        </div>
      ) : (
        <>
          <div className="view-validation-strip">
            <span className="view-validation-strip-group">
              <span className="view-validation-key">{map.total} tasks</span>
              <Squares squares={map.squares} label={map.label} />
            </span>
            <span className="view-validation-strip-group">
              {map.hasStatus ? (
                map.statuses.map((status) => (
                  <span key={status.status} className="status-chip" data-tone={status.tone}>
                    {status.label} <span className="view-validation-count">{status.count}</span>
                  </span>
                ))
              ) : (
                <span className="status-chip" data-tone={STATUS_TONE.none}>
                  No status column
                </span>
              )}
            </span>
            {map.toCreate > 0 ? (
              <span className="view-validation-strip-group">
                <span className="view-validation-marker" data-file="create" aria-hidden="true" />
                <span className="view-validation-muted">{map.toCreate} need a file created</span>
              </span>
            ) : null}
          </div>
          <div className="view-validation-filters">
            <div className="view-validation-filter-row">
              <span className="view-validation-key">Requirement</span>
              {map.filters.requirements.map((req) => (
                <Chip
                  key={req.value}
                  filterKey="ref"
                  pressed={filter.ref === req.value}
                  count={req.count}
                  onClick={() => pickRef(req.value)}
                >
                  {req.value}
                </Chip>
              ))}
            </div>
            <div className="view-validation-filter-row">
              <span className="view-validation-key">Test type</span>
              {map.filters.kinds.map((kind) => (
                <Chip
                  key={kind.kind}
                  filterKey="kind"
                  pressed={filter.kind === kind.kind}
                  count={kind.count}
                  onClick={() => onFilter({ ...filter, kind: filter.kind === kind.kind ? null : kind.kind })}
                >
                  {kind.glyph}
                </Chip>
              ))}
              {map.hasStatus && map.filters.statuses.length > 0 ? (
                <>
                  <span className="view-validation-key view-validation-key-inline">Status</span>
                  {map.filters.statuses.map((status) => (
                    <Chip
                      key={status.status}
                      filterKey="status"
                      pressed={filter.status === status.status}
                      tone={status.tone}
                      count={status.count}
                      onClick={() =>
                        onFilter({ ...filter, status: filter.status === status.status ? null : status.status })
                      }
                    >
                      {status.label}
                    </Chip>
                  ))}
                </>
              ) : null}
              {anyFilter(filter) ? (
                <button type="button" className="view-validation-link view-validation-clear" onClick={() => onFilter(NO_FILTER)}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <div className="view-validation-board">
            <div className="view-validation-lanes">
              {map.lanes.map((lane) => (
                <div key={lane.wave} className="view-validation-lane" data-wave={lane.wave}>
                  <div className="view-validation-lane-head">
                    <span className="view-validation-key">Wave</span>
                    <span className="view-validation-lane-wave">{lane.wave || '—'}</span>
                    <span className="view-validation-key">
                      {lane.count} task{lane.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="view-validation-lane-body">
                    {lane.plans.map((plan) => (
                      <div key={plan.plan} className="view-validation-plan">
                        <span className="view-validation-plan-label">Plan {plan.plan || '—'}</span>
                        <div className="view-validation-tiles">
                          {plan.taskIndexes.map((index) => {
                            const task = map.tasks[index];
                            return (
                              <Tile
                                key={task.anchorId}
                                task={task}
                                selected={selected === index}
                                dimmed={anyFilter(filter) && !passesFilter(task, filter)}
                                onSelect={toggleSelect}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Inspector
              task={selectedTask}
              filter={filter}
              hasManual={hasManual}
              onPickRef={pickRef}
              onClose={() => onSelect(null)}
              onJumpManual={onJumpManual}
            />
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Wave 0
// ---------------------------------------------------------------------------

function Wave0({
  wave0,
  open,
  onToggle,
  onPickTask,
}: {
  wave0: NonNullable<ComposedValidationStrategy['wave0']>;
  open: boolean;
  onToggle: () => void;
  onPickTask: (index: number) => void;
}): React.JSX.Element {
  return (
    <section id="validation-wave0" className="view-validation-wave0">
      <button type="button" className="view-validation-wave0-toggle" aria-expanded={open} onClick={onToggle}>
        <span className="view-validation-key">{wave0.label}</span>
        <span className="view-validation-mini" aria-hidden="true">
          {wave0.boxes.map((box, index) => (
            <i key={index} data-on={box.checked} />
          ))}
        </span>
        <span>{wave0.summary}</span>
        <span className="view-validation-chevron" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open ? (
        <div className="view-validation-wave0-body">
          {wave0.lead.length > 0 ? (
            <div className="view-validation-prose">
              <ResearchBlocks blocks={wave0.lead} />
            </div>
          ) : null}
          <ul className="view-validation-wave0-list">
            {wave0.items.map((item, index) => (
              <li key={index} data-done={item.done}>
                <span className="view-validation-mark" aria-hidden="true">
                  {item.mark}
                </span>
                <span>
                  {item.segments.map((segment, segmentIndex) =>
                    'taskId' in segment ? (
                      <button
                        key={segmentIndex}
                        type="button"
                        className="view-validation-ref"
                        onClick={() => onPickTask(segment.index)}
                      >
                        {segment.taskId}
                      </button>
                    ) : (
                      <ResearchInline key={segmentIndex} text={segment.text} />
                    ),
                  )}
                </span>
              </li>
            ))}
          </ul>
          {wave0.tail.length > 0 ? (
            <div className="view-validation-prose">
              <ResearchBlocks blocks={wave0.tail} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 03 Checked by a human
// ---------------------------------------------------------------------------

function Manual({
  manual,
  section,
  openCards,
  onToggleCard,
}: {
  manual: NonNullable<ComposedValidationStrategy['manual']>;
  section: ComposedValidationSection;
  openCards: ReadonlySet<number>;
  onToggleCard: (index: number) => void;
}): React.JSX.Element {
  return (
    <section id={section.id} className="view-block view-validation-manual">
      <SectionHeading section={section} />
      {manual.cards.length > 0 ? (
        <div className="view-validation-cards">
          {manual.cards.map((card, index) => {
            const open = openCards.has(index);
            return (
              <article key={index} className="view-validation-card">
                <div className="view-validation-card-top">
                  {card.requirements.map((req) => (
                    <span key={req} className="view-validation-ref">
                      {req}
                    </span>
                  ))}
                  {card.backstop ? <span className="status-chip">Backstop</span> : null}
                </div>
                <div className="view-validation-card-main">
                  <h3>
                    <ResearchInline text={card.title} />
                  </h3>
                  {card.backstop ? (
                    <p className="view-validation-card-text">
                      <ResearchInline text={card.backstop} />
                    </p>
                  ) : null}
                  {card.why ? (
                    <p className="view-validation-card-text">
                      <span className="view-validation-key">Why manual · </span>
                      <ResearchInline text={card.why} />
                    </p>
                  ) : null}
                  {card.how ? (
                    <div className="view-validation-how">
                      <span className="view-validation-key">How</span>
                      <span>
                        <ResearchInline text={card.how} />
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="view-validation-outcome" data-tone={card.outcome.tone}>
                  <div className="view-validation-outcome-head">
                    <span className="status-chip" data-tone={card.outcome.tone}>
                      {card.outcome.label}
                    </span>
                    {card.outcome.date ? (
                      <span className="view-validation-outcome-date">
                        <ResearchInline text={card.outcome.date} />
                      </span>
                    ) : null}
                  </div>
                  {card.outcome.text ? (
                    <>
                      <div className="view-validation-outcome-text" data-clamped={card.outcome.long && !open}>
                        <ResearchInline text={card.outcome.text} />
                      </div>
                      {card.outcome.long ? (
                        <button
                          type="button"
                          className="view-validation-link"
                          aria-expanded={open}
                          onClick={() => onToggleCard(index)}
                        >
                          {open ? 'less' : 'more'}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : manual.prose ? (
        <div className="view-validation-prose">
          <ResearchBlocks blocks={manual.prose} />
        </div>
      ) : null}
      {manual.notes.length > 0 ? (
        <div className="notice view-validation-notice">
          <ResearchBlocks blocks={manual.notes} />
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 04 Sign-off
// ---------------------------------------------------------------------------

function Signoff({
  signoff,
  section,
}: {
  signoff: ComposedValidationSignoff;
  section: ComposedValidationSection;
}): React.JSX.Element {
  return (
    <section id={section.id} className="view-block view-validation-signoff">
      <SectionHeading section={section} />
      <div className="view-validation-signoff-box">
        <Checklist items={signoff.items} />
        <div className="view-validation-stamp" data-tone={signoff.stamp.tone}>
          <span className="view-validation-key">Approval</span>
          <span className="view-validation-big">{signoff.stamp.label}</span>
          {signoff.stamp.approval ? (
            <span className="view-validation-approval">
              <ResearchInline text={signoff.stamp.approval} />
            </span>
          ) : null}
        </div>
      </div>
      {signoff.extra.length > 0 ? (
        <div className="view-validation-prose">
          <ResearchBlocks blocks={signoff.extra} />
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Folded extras and the "In the source only" strip
// ---------------------------------------------------------------------------

function Extras({ extras }: { extras: ComposedValidationStrategy['extras'] }): React.JSX.Element | null {
  if (extras.length === 0) return null;
  return (
    <section id="validation-extras" className="view-block view-validation-extras">
      {extras.map((extra) => (
        <details key={extra.id}>
          <summary>{extra.heading}</summary>
          <div className="view-validation-prose">
            <ResearchBlocks blocks={extra.blocks} />
          </div>
        </details>
      ))}
    </section>
  );
}

function SourceOnly({
  entries,
  onShowSource,
}: {
  entries: ComposedValidationStrategy['sourceOnly'];
  onShowSource: (id: string | null) => void;
}): React.JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <nav
      id="validation-source-only"
      className="view-block view-validation-source-only"
      aria-label="In the source only"
    >
      <span className="view-validation-key">In the source only</span>
      <ul>
        {entries.map((entry) => (
          <li key={entry.label}>
            {entry.interactive ? (
              <button type="button" className="status-chip" onClick={() => onShowSource(entry.targetId)}>
                {entry.label}
              </button>
            ) : (
              <span
                className="status-chip view-validation-source-note"
                title="Only in the raw file — Source mode drops HTML comments"
              >
                {entry.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function ValidationStrategyView({
  strategy,
  onShowSource,
  title,
  initialSelection = null,
  initialFilter = NO_FILTER,
  initialWave0Open = false,
}: {
  strategy: ComposedValidationStrategy;
  onShowSource: (id: string | null) => void;
  title: string;
  initialSelection?: number | null;
  initialFilter?: ValidationFilter;
  initialWave0Open?: boolean;
}): React.JSX.Element {
  const [selected, setSelected] = useState<number | null>(initialSelection);
  const [filter, setFilter] = useState<ValidationFilter>(initialFilter);
  const [wave0Open, setWave0Open] = useState(initialWave0Open);
  const [openCards, setOpenCards] = useState<ReadonlySet<number>>(() => new Set());
  const jump = useFlashJump();

  const toggleCard = useCallback((index: number): void => {
    setOpenCards((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const sectionOf = (id: string): ComposedValidationSection | undefined =>
    strategy.sections.find((section) => section.id === id);
  const rigSection = sectionOf('validation-rig');
  const mapSection = sectionOf('validation-map');
  const manualSection = sectionOf('validation-manual');
  const signoffSection = sectionOf('validation-signoff');

  const pickTask = (index: number): void => {
    setSelected(index);
    const task = strategy.map?.tasks[index];
    if (task) jump(task.anchorId);
  };

  return (
    <div className="document-reader-layout" data-outline="false">
      <article className="document-canvas" aria-label={`${title} document`}>
        {strategy.rig && rigSection ? <Rig rig={strategy.rig} section={rigSection} /> : null}
        {strategy.map && mapSection ? (
          <MapSection
            map={strategy.map}
            section={mapSection}
            hasManual={strategy.manual !== null}
            selected={selected}
            filter={filter}
            onSelect={setSelected}
            onFilter={setFilter}
            onJumpManual={() => jump('validation-manual')}
          />
        ) : null}
        {strategy.wave0 ? (
          <Wave0
            wave0={strategy.wave0}
            open={wave0Open}
            onToggle={() => setWave0Open((open) => !open)}
            onPickTask={pickTask}
          />
        ) : null}
        {strategy.manual && manualSection ? (
          <Manual manual={strategy.manual} section={manualSection} openCards={openCards} onToggleCard={toggleCard} />
        ) : null}
        {strategy.signoff && signoffSection ? <Signoff signoff={strategy.signoff} section={signoffSection} /> : null}
        <Extras extras={strategy.extras} />
        <SourceOnly entries={strategy.sourceOnly} onShowSource={onShowSource} />
      </article>
    </div>
  );
}
