// The dashboard's bottom row (quick-261018-4tb, sketch 026 B): On deck as Next, Todos and Notes
// tabs beside Recent work, a three-week activity chart over the latest quick and fast tasks. The
// two panels stretch to the taller one and pin their pagers to the floor. All strings from planning
// files render as React text through MarkedText; a link target is always an in-app url the server
// built from a discovered file.
import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from '../nav.tsx';
import {
  activityWindow,
  dayMark,
  groupByDay,
  pageOf,
  relativeDay,
  severityLabel,
} from '../../presentation/dashboard-ledger-view.ts';
import { activityDateLabel } from '../../presentation/dashboard-head.ts';
import type { DashboardViewModel } from '../../presentation/dashboard.ts';
import type { LedgerNoteDto, LedgerQueueItemDto, LedgerTaskDto, LedgerTodoDto } from '../../server/dashboard-ledger.ts';
import { LedgerPager, MarkedText } from './dashboard-ledger.tsx';

export const DECK_PAGE_SIZE = 5;

export type DeckTab = 'next' | 'todos' | 'notes';

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

function QueueItem({ item }: { item: LedgerQueueItemDto }): React.JSX.Element {
  return (
    <Link className="deck-item" to={item.url}>
      <span className="deck-item-meta">
        <span className="ledger-kicker">{item.kind === 'plan' ? 'Plan' : 'Phase'}</span>
        <span className="ledger-row-id">{item.kind === 'plan' ? item.id : item.label.replace(/^Phase /, '')}</span>
      </span>
      <span className="deck-item-title">
        <MarkedText text={item.title} />
      </span>
      {item.detail ? (
        <span className="deck-item-detail">
          <MarkedText text={item.detail} />
        </span>
      ) : null}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

/** "retry.ts:88-140": the file's name and line suffix, the full path on hover. */
function FileChip({ file }: { file: string }): React.JSX.Element {
  const [path, lines] = file.split(':');
  return (
    <code title={file}>
      {path.split('/').pop()}
      {lines ? <span className="ledger-quiet">{`:${lines}`}</span> : null}
    </code>
  );
}

function TodoRow({ todo, readAt }: { todo: LedgerTodoDto; readAt: string }): React.JSX.Element {
  const added = relativeDay(todo.created, readAt).replace(/^(Today|Yesterday)$/, (word) => word.toLowerCase());
  const meta = todo.url ? (
    <>
      {todo.area ? <span>{todo.area}</span> : null}
      {added ? <span>{`Added ${added}`}</span> : null}
      {todo.files.length > 0 ? (
        <span className="todo-files">
          <FileChip file={todo.files[0]} />
          {todo.files.length > 1 ? (
            <span className="ledger-quiet" title={todo.files.slice(1).join('\n')}>
              {`+${todo.files.length - 1}`}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  ) : todo.sources.length > 0 ? (
    todo.sources.map((source) => (
      <Link
        key={source.path}
        className="ledger-source-sum"
        to={source.url}
        title={`${source.kind}${source.meta ? ` · ${source.meta}` : ''}`}
      >
        {source.label}
      </Link>
    ))
  ) : (
    <span className="ledger-source-sum" data-untagged="true">
      Untagged
    </span>
  );
  return (
    <li className="todo-row" data-severity={todo.severity}>
      <span className="todo-severity" title={todo.weight ?? 'No severity recorded'}>
        <i />
        {severityLabel(todo.severity)}
      </span>
      <div className="todo-main">
        {todo.url ? (
          <Link className="todo-title" to={todo.url}>
            <MarkedText text={todo.title} />
          </Link>
        ) : (
          <span className="todo-title">
            <MarkedText text={todo.title} />
          </span>
        )}
        {todo.detail ? (
          <p className="todo-detail">
            <MarkedText text={todo.detail} />
          </p>
        ) : null}
        <p className="todo-meta">{meta}</p>
      </div>
      {todo.url ? <ArrowRight className="todo-go" aria-hidden="true" /> : null}
    </li>
  );
}

function NoteItem({ note, readAt }: { note: LedgerNoteDto; readAt: string }): React.JSX.Element {
  return (
    <Link className="deck-item" data-promoted={note.promoted} to={note.url}>
      <span className="deck-item-meta">
        <span className="ledger-kicker">{relativeDay(note.date, readAt) || note.date}</span>
        {note.promoted ? <span className="deck-chip">Now a todo</span> : null}
      </span>
      <span className="deck-item-title">
        <MarkedText text={note.title} />
      </span>
      {note.detail ? (
        <span className="deck-item-detail">
          <MarkedText text={note.detail} />
        </span>
      ) : null}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function EmptyLine({ children }: { children: string }): React.JSX.Element {
  return (
    <div className="quiet-state">
      <CheckCircle2 aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

/** On deck: what comes after the next step, as Next, Todos and Notes tabs. The panel opens on the
 * first tab that has anything, and each tab keeps its own page of five. */
export function OnDeckPanel({
  onDeck,
  readAt,
  initialTab = null,
}: {
  onDeck: DashboardViewModel['onDeck'];
  readAt: string;
  /** Forces a tab to open on; the page leaves it null so the first non-empty tab opens. */
  initialTab?: DeckTab | null;
}): React.JSX.Element {
  const [tab, setTab] = useState<DeckTab | null>(initialTab);
  const [pages, setPages] = useState<Record<DeckTab, number>>({ next: 0, todos: 0, notes: 0 });
  const unpromoted = onDeck.notes.filter((note) => !note.promoted);
  const tabs: { key: DeckTab; label: string; count: number }[] = [
    { key: 'next', label: 'Next', count: onDeck.queue.length },
    { key: 'todos', label: 'Todos', count: onDeck.todos.length },
    { key: 'notes', label: 'Notes', count: unpromoted.length },
  ];
  const current: DeckTab = tab ?? tabs.find((entry) => entry.count > 0)?.key ?? 'next';
  const length = { next: onDeck.queue.length, todos: onDeck.todos.length, notes: onDeck.notes.length }[current];
  const pager = pageOf(length, DECK_PAGE_SIZE, pages[current]);

  let body: React.ReactNode;
  if (current === 'next') {
    body =
      onDeck.queue.length > 0 ? (
        <div className="deck-list">
          {onDeck.queue.slice(pager.start, pager.end).map((item) => (
            <QueueItem key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <EmptyLine>Nothing is queued after the next step.</EmptyLine>
      );
  } else if (current === 'todos') {
    body =
      onDeck.todos.length > 0 ? (
        <ol className="deck-list">
          {onDeck.todos.slice(pager.start, pager.end).map((todo) => (
            <TodoRow key={todo.key} todo={todo} readAt={readAt} />
          ))}
        </ol>
      ) : (
        <EmptyLine>
          {onDeck.todosDone > 0 ? `No pending todos — ${onDeck.todosDone} done.` : 'No pending todos.'}
        </EmptyLine>
      );
  } else {
    body =
      onDeck.notes.length > 0 ? (
        <div className="deck-list">
          {onDeck.notes.slice(pager.start, pager.end).map((note) => (
            <NoteItem key={note.key} note={note} readAt={readAt} />
          ))}
        </div>
      ) : (
        <EmptyLine>No notes captured.</EmptyLine>
      );
  }

  return (
    <section className="deck-panel" aria-labelledby="on-deck-heading">
      <header className="ledger-head">
        <div>
          <p className="eyebrow">After the next step</p>
          <h2 id="on-deck-heading">On deck</h2>
        </div>
      </header>
      <div className="deck-tabs" role="tablist">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            className="deck-tab"
            aria-selected={entry.key === current}
            onClick={() => setTab(entry.key)}
          >
            <span>{entry.label}</span> <b>{entry.count}</b>
          </button>
        ))}
      </div>
      {body}
      <LedgerPager
        pager={pager}
        label="On deck pagination"
        onPage={(next) => setPages((previous) => ({ ...previous, [current]: next }))}
      />
      {current === 'todos' && onDeck.todos.length > 0 && onDeck.todosDone > 0 ? (
        <p className="deck-foot">{`${plural(onDeck.todosDone, 'todo')} done.`}</p>
      ) : null}
    </section>
  );
}

function TaskRow({ task }: { task: LedgerTaskDto }): React.JSX.Element {
  return (
    <div className="recent-task">
      <span
        className="recent-task-kind"
        data-kind={task.kind}
        title={task.kind === 'quick' ? 'Quick task' : 'Fast task'}
      >
        {task.kind === 'quick' ? 'Q' : 'F'}
      </span>
      <span className="recent-task-title">
        <MarkedText text={task.title} />
      </span>
      <span className="recent-task-meta">
        {task.status ? <span className="recent-status">{task.status}</span> : null}
        {task.commit ? <code>{task.commit}</code> : null}
        {task.planUrl ? <Link to={task.planUrl}>Plan</Link> : null}
        {task.summaryUrl ? <Link to={task.summaryUrl}>Summary</Link> : null}
      </span>
    </div>
  );
}

/** Recent work: three weeks of quick and fast tasks as a bar a day (quick stacked over fast), then
 * the latest five grouped by day under a date gutter. */
export function RecentWorkPanel({
  recent,
  readAt,
}: {
  recent: LedgerTaskDto[];
  readAt: string;
}): React.JSX.Element {
  const [page, setPage] = useState(0);
  const { days, total, max } = activityWindow(recent);
  const pager = pageOf(recent.length, DECK_PAGE_SIZE, page);
  return (
    <section className="deck-panel" aria-labelledby="recent-work-heading">
      <header className="ledger-head">
        <div>
          <p className="eyebrow">Quick and fast tasks</p>
          <h2 id="recent-work-heading">Recent work</h2>
        </div>
        {recent.length > 0 ? (
          <span className="ledger-count">
            <b>{total}</b> <span>in 3 weeks</span>
          </span>
        ) : null}
      </header>
      {recent.length === 0 ? (
        <EmptyLine>No quick or fast tasks logged yet.</EmptyLine>
      ) : (
        <>
          <div className="recent-activity">
            <div className="recent-bars">
              {days.map((day) => (
                <span
                  key={day.day}
                  data-day={day.day}
                  data-empty={day.quick + day.fast === 0}
                  title={`${activityDateLabel(day.day, readAt)}: ${day.quick} quick, ${day.fast} fast`}
                >
                  {day.quick > 0 ? (
                    <i data-kind="quick" style={{ height: `${(day.quick / max) * 100}%` }} />
                  ) : null}
                  {day.fast > 0 ? <i data-kind="fast" style={{ height: `${(day.fast / max) * 100}%` }} /> : null}
                </span>
              ))}
            </div>
            <div className="recent-axis">
              <span className="ledger-kicker">{activityDateLabel(days[0].day, readAt)}</span>
              <span className="ledger-kicker">{activityDateLabel(days[days.length - 1].day, readAt)}</span>
            </div>
            <div className="recent-key">
              <span>
                <i data-kind="quick" />
                Quick
              </span>
              <span>
                <i data-kind="fast" />
                Fast
              </span>
            </div>
          </div>
          <div className="recent-log">
            {groupByDay(recent.slice(pager.start, pager.end)).map((group) => {
              const mark = dayMark(group.day);
              return (
                <div key={group.day} className="recent-day">
                  <div className="recent-date">
                    <span className="recent-date-number">{mark.number}</span>
                    <span className="ledger-kicker">{mark.label}</span>
                  </div>
                  <div>
                    {group.items.map((task) => (
                      <TaskRow key={task.key} task={task} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <LedgerPager pager={pager} label="Recent work pagination" onPage={setPage} />
        </>
      )}
    </section>
  );
}
