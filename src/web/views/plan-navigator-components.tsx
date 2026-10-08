// The PLAN task navigator's React surface (quick-261006-iz6, sketch 019 B): the Planned fact that shares
// the header's meta row, the head row (chips, the Depends on / Files / Requirements triggers and the
// stats), the objective definition list, the workspace (a sticky task list beside the selected task's
// tabs) with its three modals, Done when, and the "In the source only" strip. Every string derived from
// the document renders only through `ResearchInline` / `ResearchBlocks` (tokenizeInline output mapped to
// React nodes) or as plain React text — never React's raw-HTML injection prop (T-iz6-02). Colour comes
// only from the tone a composed model carries (the maps in `plan-navigator.ts`) and the theme tokens;
// the parse-degradation tones never appear on document content. The only links are a dependency row's
// `Link` to the in-app URL the presentation generated and the fixed traceability route (T-iz6-03).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog.tsx';
import { ResearchBlocks, ResearchInline } from './research-briefing-components.tsx';
import type {
  ComposedPlanIntro,
  ComposedPlanNavigator,
  ComposedPlanTask,
  PlanChip,
  PlanSection,
  PlanTab,
} from './plan-navigator.ts';

// ---------------------------------------------------------------------------
// Header: Planned
// ---------------------------------------------------------------------------

export function PlanIntroMeta({ intro }: { intro: ComposedPlanIntro }): React.JSX.Element {
  return (
    <div className="view-plan-nav-cover">
      {intro.planned ? (
        <p className="view-plan-nav-facts">
          <span>
            Planned<b title={intro.planned.title}>{intro.planned.date}</b>
          </span>
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyboard stepping
// ---------------------------------------------------------------------------

export interface StepContext {
  /** True when the event target is an input, textarea, select or contenteditable element. */
  editable: boolean;
  /** True when the target is the page body or sits inside the view. */
  inside: boolean;
  /** True when a modifier key is held. */
  modified: boolean;
}

/** ArrowRight / ArrowLeft -> the next / previous task number (1-based), clamped at both ends (no
 * wrapping); null for any other key, a held modifier, an editable target, a target outside the view
 * or a step that would leave the list. */
export function stepTask(key: string, current: number, count: number, context: StepContext): number | null {
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null;
  if (context.modified || context.editable || !context.inside || count <= 0) return null;
  const next = current + (key === 'ArrowRight' ? 1 : -1);
  if (next < 1 || next > count) return null;
  return next;
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Chip({ chip }: { chip: PlanChip }): React.JSX.Element {
  return (
    <span className="status-chip" data-tone={chip.tone}>
      {chip.label}
    </span>
  );
}

/** A file path as a chip: the folder muted, a long folder shortened to its last segment. */
function fileParts(path: string): { dir: string; name: string } {
  const slash = path.lastIndexOf('/');
  if (slash <= 0) return { dir: '', name: path };
  const name = path.slice(slash + 1);
  let dir = path.slice(0, slash + 1);
  if (dir.length > 26) {
    const segments = dir.split('/').filter((segment) => segment !== '');
    dir = `…/${segments[segments.length - 1]}/`;
  }
  return { dir, name };
}

function SectionView({
  section,
  sectionId,
  open,
  onToggle,
}: {
  section: PlanSection;
  sectionId: string;
  open: boolean;
  onToggle: (id: string) => void;
}): React.JSX.Element {
  let body: React.JSX.Element;
  if (section.kind === 'files') {
    body = (
      <div className="view-plan-nav-files">
        {section.files.map((path, index) => {
          const parts = fileParts(path);
          return (
            <span key={`${path}-${index}`} className="view-plan-nav-file" title={path}>
              {parts.dir ? <span className="view-plan-nav-dir">{parts.dir}</span> : null}
              {parts.name}
            </span>
          );
        })}
      </div>
    );
  } else if (section.kind === 'blocks') {
    const clamped = section.clamp && !open;
    body = (
      <>
        <div className="view-plan-nav-text" data-clamp={clamped ? 'true' : undefined}>
          <ResearchBlocks blocks={section.blocks} />
        </div>
        {section.clamp ? (
          <button
            type="button"
            className="view-plan-nav-more"
            data-read-all={sectionId}
            aria-expanded={open}
            onClick={() => onToggle(sectionId)}
          >
            {open ? '− Show less' : `+ Read all · ${section.words} words`}
          </button>
        ) : null}
      </>
    );
  } else if (section.kind === 'list') {
    body = (
      <>
        {section.lead ? (
          <p className="view-plan-nav-lead">
            <ResearchInline text={section.lead} />
          </p>
        ) : null}
        <ul className="view-plan-nav-checks">
          {section.items.map((item, index) => (
            <li key={index}>
              <span>
                <ResearchInline text={item} />
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (section.kind === 'verify') {
    body = (
      <div className="view-plan-nav-verify">
        {section.rows.map((row, index) =>
          row.kind === 'command' ? (
            <div key={index} className="view-plan-nav-cmd">
              <pre>{row.text}</pre>
              {row.fails ? (
                <p className="view-plan-nav-fails">
                  <ResearchInline text={row.fails} />
                </p>
              ) : null}
            </div>
          ) : (
            <div key={index} className="view-plan-nav-note">
              {row.label ? <span className="view-plan-nav-key">{row.label}</span> : null}
              <ResearchBlocks blocks={row.blocks} />
            </div>
          ),
        )}
      </div>
    );
  } else if (section.kind === 'options') {
    body = (
      <div className="view-plan-nav-options">
        {section.options.map((option, index) => (
          <div key={index} className="view-plan-nav-option">
            {option.name ? (
              <span className="view-plan-nav-option-name">
                <ResearchInline text={option.name} />
              </span>
            ) : null}
            {option.description ? (
              <p>
                <ResearchInline text={option.description} />
              </p>
            ) : null}
            {option.pros ? (
              <p data-kind="pro">
                <ResearchInline text={option.pros} />
              </p>
            ) : null}
            {option.cons ? (
              <p data-kind="con">
                <ResearchInline text={option.cons} />
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  } else {
    body = (
      <p className="view-plan-nav-line" data-large={section.large ? 'true' : undefined} data-done={section.done ? 'true' : undefined}>
        <span>
          <ResearchInline text={section.text} />
        </span>
      </p>
    );
  }
  return (
    <div className="view-plan-nav-sec" data-section={section.key}>
      <span className="view-plan-nav-key">
        {section.label}
        {section.aside ? <span className="view-plan-nav-aside-inline">{section.aside}</span> : null}
      </span>
      {body}
    </div>
  );
}

function TaskDetail({
  task,
  count,
  tab,
  opened,
  onTab,
  onToggle,
  onStep,
  onShowSource,
}: {
  task: ComposedPlanTask;
  count: number;
  tab: PlanTab['key'];
  opened: ReadonlySet<string>;
  onTab: (key: PlanTab['key']) => void;
  onToggle: (id: string) => void;
  onStep: (delta: number) => void;
  onShowSource: (id: string | null) => void;
}): React.JSX.Element {
  const active = task.tabs.find((candidate) => candidate.key === tab) ?? task.tabs[0] ?? null;
  const sections = active ? task.sections[active.key] : [];
  return (
    <div
      id="plan-task-panel"
      className="view-plan-nav-detail"
      role="tabpanel"
      aria-live="polite"
      aria-labelledby={`plan-task-tab-${task.n}`}
    >
      <div className="view-plan-nav-dhead">
        <div className="view-plan-nav-chips">
          <span className="view-plan-nav-position">
            Task {task.n} of {count}
          </span>
          {task.chips.map((chip, index) => (
            <Chip key={`${chip.label}-${index}`} chip={chip} />
          ))}
          {task.waits ? <span className="view-plan-nav-waits">{task.waits}</span> : null}
        </div>
        <h2>
          <ResearchInline text={task.name} />
        </h2>
      </div>
      {task.tabs.length > 0 ? (
        <div className="view-plan-nav-tabs" role="tablist" aria-label="Task sections">
          {task.tabs.map((candidate) => (
            <button
              key={candidate.key}
              type="button"
              role="tab"
              data-tab={candidate.key}
              aria-selected={active?.key === candidate.key}
              onClick={() => onTab(candidate.key)}
            >
              {candidate.label}
              {candidate.count ? <span className="view-plan-nav-count">{candidate.count}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <div className="view-plan-nav-pane">
        <div className="view-plan-nav-body">
          {sections.map((section) => (
            <SectionView
              key={section.key}
              section={section}
              sectionId={`${task.n}:${section.key}`}
              open={opened.has(`${task.n}:${section.key}`)}
              onToggle={onToggle}
            />
          ))}
          {task.sourceRow ? (
            <div className="view-plan-nav-src" data-task-source={task.n}>
              <span className="view-plan-nav-key">In the source only</span>
              {task.sourceRow.labels.map((entry) => (
                <button
                  key={`${entry.label}-${entry.anchor}`}
                  type="button"
                  className="status-chip"
                  onClick={() => onShowSource(entry.anchor)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="view-plan-nav-foot">
        <button type="button" className="view-plan-nav-step" data-step="-1" disabled={task.n <= 1} onClick={() => onStep(-1)}>
          ← Previous
        </button>
        <span className="view-plan-nav-key">← → to step</span>
        <button type="button" className="view-plan-nav-step" data-step="1" disabled={task.n >= count} onClick={() => onStep(1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

export type ModalKey = 'deps' | 'files' | 'reqs';

/** The modal's title: the trigger's label and the count it showed. */
export function modalTitle(plan: ComposedPlanNavigator, modal: ModalKey): string {
  if (modal === 'deps') return `Depends on · ${plan.modals.deps.length}`;
  if (modal === 'files') return `Files · ${plan.modals.files.total}`;
  return `Requirements · ${plan.modals.requirements.length}`;
}

export function PlanModalBody({
  plan,
  modal,
  onGoto,
  onClose,
}: {
  plan: ComposedPlanNavigator;
  modal: ModalKey;
  onGoto: (n: number) => void;
  onClose: () => void;
}): React.JSX.Element {
  const { modals } = plan;
  if (modal === 'deps') {
    return (
      <>
        <div className="view-plan-nav-modal-body">
          <div>
            {modals.deps.map((dep) => {
              const row = (
                <>
                  <span className="view-plan-nav-modal-id">{dep.id}</span>
                  <span className="view-plan-nav-modal-text">
                    {dep.title ? (
                      <ResearchInline text={dep.title} />
                    ) : (
                      <span className="view-plan-nav-muted">Not found in this project</span>
                    )}
                    {dep.status ? <Chip chip={dep.status} /> : null}
                  </span>
                </>
              );
              return dep.url !== null ? (
                <Link key={dep.id} className="view-plan-nav-row" to={dep.url} onClick={onClose}>
                  {row}
                </Link>
              ) : (
                <div key={dep.id} className="view-plan-nav-row">
                  {row}
                </div>
              );
            })}
          </div>
          <p className="view-plan-nav-footnote">{modals.depsFooter}</p>
        </div>
      </>
    );
  }
  if (modal === 'files') {
    return (
      <>
        <div className="view-plan-nav-modal-body">
          {modals.files.groups.map((group) => (
            <div key={group.dir} className="view-plan-nav-group">
              <span className="view-plan-nav-key">{group.dir}/</span>
              {group.files.map((file) => (
                <div key={file.path} className="view-plan-nav-filerow" data-file={file.path}>
                  <span className="view-plan-nav-filename">
                    {file.name}
                    {file.newTone ? (
                      <span className="status-chip" data-tone={file.newTone}>
                        New
                      </span>
                    ) : null}
                  </span>
                  <span className="view-plan-nav-by">
                    {file.tasks.length > 0 ? (
                      file.tasks.map((task) => (
                        <button
                          key={task.n}
                          type="button"
                          className="view-plan-nav-tref"
                          data-goto={task.n}
                          data-gate={task.gate ? 'true' : undefined}
                          title={task.name}
                          onClick={() => onGoto(task.n)}
                        >
                          T{task.n}
                        </button>
                      ))
                    ) : (
                      <span className="view-plan-nav-muted view-plan-nav-nobody">no task names it</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <p className="view-plan-nav-footnote">
            From files_modified (and creates). T-chips are the tasks whose files list names the file. Click one to open it.
          </p>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="view-plan-nav-modal-body">
        <div>
          {modals.requirements.map((requirement) => (
            <div key={requirement.id} className="view-plan-nav-req" data-source={requirement.source ?? undefined}>
              <span className="view-plan-nav-modal-id">{requirement.id}</span>
              {requirement.text ? (
                <p>
                  <ResearchInline text={requirement.text} />
                </p>
              ) : (
                <p className="view-plan-nav-muted">Not in this project&apos;s REQUIREMENTS.md</p>
              )}
            </div>
          ))}
        </div>
        <p className="view-plan-nav-footnote">
          <Link to={presentationRoutePatterns.traceability} onClick={onClose}>
            Open the traceability page
          </Link>
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function PlanNavigatorView({
  plan,
  onShowSource,
  initialTask,
  initialModal,
}: {
  plan: ComposedPlanNavigator;
  onShowSource: (id: string | null) => void;
  /** Only the static-markup tests set these two. */
  initialTask?: number;
  initialModal?: ModalKey | null;
}): React.JSX.Element {
  const count = plan.tasks.length;
  const [selected, setSelected] = useState<number>(initialTask ?? plan.initialTask);
  const [tab, setTab] = useState<PlanTab['key']>('main');
  const [modal, setModal] = useState<ModalKey | null>(initialModal ?? null);
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const [flashed, setFlashed] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const flashTimer = useRef<number | null>(null);
  const pendingScroll = useRef(false);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const select = useCallback((n: number): void => {
    setSelected(n);
    setTab('main');
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      const tag = target?.tagName ?? '';
      const editable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (target instanceof HTMLElement && target.isContentEditable);
      const inside = target === document.body || (target !== null && root.current?.contains(target) === true);
      const next = stepTask(event.key, selected, count, {
        editable,
        inside,
        modified: event.ctrlKey || event.metaKey || event.altKey || event.shiftKey,
      });
      if (next === null) return;
      event.preventDefault();
      select(next);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, count, select]);

  const onGoto = useCallback(
    (n: number): void => {
      setModal(null);
      select(n);
      pendingScroll.current = true;
      setFlashed(true);
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashed(false), 1200);
    },
    [select],
  );

  // After the render that shows the jumped-to task, bring the workspace into view.
  useEffect(() => {
    if (!pendingScroll.current) return;
    pendingScroll.current = false;
    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('plan-task-workspace')?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  const toggleOpen = useCallback((id: string): void => {
    setOpened((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onStep = useCallback(
    (delta: number): void => {
      const next = selected + delta;
      if (next >= 1 && next <= count) select(next);
    },
    [selected, count, select],
  );

  // An entry with no rendered section opens Source at its top, not wherever the strip was scrolled to.
  const openSource = useCallback(
    (target: string | null): void => {
      if (target === null) window.scrollTo(0, 0);
      onShowSource(target);
    },
    [onShowSource],
  );

  const task = plan.tasks.find((candidate) => candidate.n === selected) ?? plan.tasks[0];
  const { head, objective } = plan;
  const triggers: { key: ModalKey; label: string; count: number; disabled: boolean }[] = [
    { key: 'deps', label: 'Depends on', count: head.triggers.deps.count, disabled: head.triggers.deps.disabled },
    { key: 'files', label: 'Files', count: head.triggers.files.count, disabled: head.triggers.files.disabled },
    { key: 'reqs', label: 'Requirements', count: head.triggers.requirements.count, disabled: head.triggers.requirements.disabled },
  ];

  return (
    <div className="document-reader-layout" data-outline="false">
      <div className="document-canvas view-plan-nav-page" ref={root}>
        <div className="view-plan-nav-head">
          <div className="view-plan-nav-chips">
            {head.chips.map((chip, index) => (
              <Chip key={`${chip.label}-${index}`} chip={chip} />
            ))}
          </div>
          <div className="view-plan-nav-tools">
            <div className="view-plan-nav-triggers">
              {triggers.map((trigger) => (
                <button
                  key={trigger.key}
                  type="button"
                  className="view-plan-nav-trigger"
                  data-modal={trigger.key}
                  disabled={trigger.disabled}
                  onClick={() => setModal(trigger.key)}
                >
                  {trigger.label} <b>{trigger.count}</b>
                </button>
              ))}
            </div>
            <div className="view-plan-nav-stats">
              {head.stats.map((stat) => (
                <div key={stat.label} className="view-plan-nav-stat">
                  <span className="view-plan-nav-key">{stat.label}</span>
                  <b data-tone={stat.tone ?? undefined}>{stat.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {objective.rest || objective.why || objective.youGet ? (
          <dl className="view-plan-nav-brief">
            {objective.rest ? (
              <>
                <dt className="view-plan-nav-key">Objective</dt>
                <dd className="view-plan-nav-lead-row">
                  <ResearchBlocks blocks={objective.rest} />
                </dd>
              </>
            ) : null}
            {objective.why ? (
              <>
                <dt className="view-plan-nav-key">Why</dt>
                <dd>
                  <ResearchBlocks blocks={objective.why} />
                </dd>
              </>
            ) : null}
            {objective.youGet ? (
              <>
                <dt className="view-plan-nav-key">You get</dt>
                <dd>
                  <ResearchBlocks blocks={objective.youGet} />
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}

        <section
          id="plan-task-workspace"
          className="view-plan-nav-work"
          aria-label="Tasks"
          data-flash={flashed ? 'true' : undefined}
        >
          <div
            id="plan-task-list"
            className="view-plan-nav-list"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Tasks"
          >
            <div className="view-plan-nav-list-head">
              <span className="view-plan-nav-key">Tasks · {plan.listHead.count}</span>
              {plan.listHead.waits > 0 ? (
                <span className="view-plan-nav-waits-count">{plan.listHead.waits} waits</span>
              ) : null}
            </div>
            {plan.tasks.map((item) => (
              <button
                key={item.n}
                id={`plan-task-tab-${item.n}`}
                type="button"
                role="tab"
                className="view-plan-nav-item"
                data-task={item.n}
                aria-selected={item.n === task.n}
                aria-controls="plan-task-panel"
                onClick={() => select(item.n)}
              >
                <span
                  className="view-plan-nav-glyph"
                  data-type={item.type}
                  data-gate={item.gate ? 'true' : undefined}
                  title={item.typeLabel}
                >
                  {item.glyph}
                </span>
                <span className="view-plan-nav-item-text">
                  <span className="view-plan-nav-name">
                    <ResearchInline text={item.name} />
                  </span>
                  <span className="view-plan-nav-sub" data-gate={item.gate ? 'true' : undefined}>
                    {item.sub}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <TaskDetail
            key={task.n}
            task={task}
            count={count}
            tab={tab}
            opened={opened}
            onTab={setTab}
            onToggle={toggleOpen}
            onStep={onStep}
            onShowSource={openSource}
          />
        </section>

        {plan.doneWhen ? (
          <section className="view-plan-nav-done" aria-label="Done when">
            <div className="section-heading">
              <h2>Done when</h2>
              <span className="view-plan-nav-aside">{plan.doneWhen.aside}</span>
            </div>
            <div className="view-plan-nav-done-cols">
              {plan.doneWhen.outcomes.items.length > 0 || plan.doneWhen.outcomes.lead ? (
                <div className="view-plan-nav-outcomes">
                  <span className="view-plan-nav-key">What&apos;s true afterwards</span>
                  {plan.doneWhen.outcomes.lead ? (
                    <p className="view-plan-nav-lead">
                      <ResearchInline text={plan.doneWhen.outcomes.lead} />
                    </p>
                  ) : null}
                  <ul>
                    {plan.doneWhen.outcomes.items.map((item, index) => (
                      <li key={index}>
                        <span>
                          <ResearchInline text={item} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {plan.doneWhen.checks.items.length > 0 || plan.doneWhen.checks.lead ? (
                <div className="view-plan-nav-checkset">
                  <span className="view-plan-nav-key">Checks that must pass</span>
                  {plan.doneWhen.checks.lead ? (
                    <p className="view-plan-nav-lead">
                      <ResearchInline text={plan.doneWhen.checks.lead} />
                    </p>
                  ) : null}
                  <ul>
                    {plan.doneWhen.checks.items.map((item, index) => (
                      <li key={index}>
                        <span>
                          <ResearchInline text={item} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {plan.sourceOnly.length > 0 ? (
          <nav id="plan-source-only" className="view-plan-nav-source-only" aria-label="In the source only">
            <span className="view-plan-nav-key">In the source only</span>
            <ul>
              {plan.sourceOnly.map((entry, index) => (
                <li key={`${entry.label}-${index}`}>
                  <button type="button" className="status-chip" onClick={() => openSource(entry.target)}>
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="view-plan-nav-modal">
          {modal !== null ? (
            <>
              <DialogHeader>
                <DialogTitle>{modalTitle(plan, modal)}</DialogTitle>
              </DialogHeader>
              <PlanModalBody plan={plan} modal={modal} onGoto={onGoto} onClose={() => setModal(null)} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
