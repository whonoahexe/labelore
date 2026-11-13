// The settings page's sticky rail (quick-261114-42r, sketch 065 variant A): a filter (key, label, description or value; `/` focuses
// it), the status filters with their counts, and "On this page" with each section's set/total and a scroll-spy. At 760px and below
// the CSS turns the rail into a sticky bar that shows the filter and two selects (a section and a status) instead of the lists. The
// rail changes nothing but the page's own view of itself: its only inputs are the search box and the two selects, and the section
// links are plain in-page anchors.
import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useActiveSection } from '../components/use-active-section.ts';
import type { FilteredSettings, SettingsCounts, StatusFilter } from './settings-reference.ts';

const NOT_RECOGNISED_ID = 's-not-recognised';

/** True when the key press came from somewhere the person is typing. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function jumpTo(id: string): void {
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

export function SettingsRail({
  query,
  onQuery,
  status,
  onStatus,
  showStatus,
  counts,
  filtered,
  hasUnknown,
}: {
  query: string;
  onQuery: (query: string) => void;
  status: StatusFilter;
  onStatus: (status: StatusFilter) => void;
  /** The status filters (and the narrow-screen status select) are only for a config that was read. */
  showStatus: boolean;
  counts: SettingsCounts;
  filtered: FilteredSettings;
  hasUnknown: boolean;
}): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null);

  // `/` focuses the filter, unless the person is already typing somewhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const visible = filtered.sections.filter((entry) => !entry.dim);
  const spyIds = [...visible.map((entry) => entry.section.id), ...(filtered.unknownDim ? [] : [NOT_RECOGNISED_ID])];
  const current = useActiveSection(spyIds);

  const statuses: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'All settings', count: counts.understood + counts.notRecognised },
    { id: 'set', label: 'Set in this project', count: counts.set },
    { id: 'unset', label: 'Not set', count: counts.notSet },
    ...(hasUnknown ? [{ id: 'unknown' as const, label: 'Not recognised', count: counts.notRecognised }] : []),
  ];

  return (
    <aside className="view-settings-rail" aria-label="Settings navigation">
      <label className="view-settings-find">
        <span className="sr-only">Filter settings</span>
        <Search aria-hidden="true" />
        <input
          ref={input}
          type="search"
          placeholder="Filter settings"
          autoComplete="off"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        <kbd>/</kbd>
      </label>
      <div className="view-settings-jump">
        <select
          aria-label="Jump to a section"
          value={current ?? ''}
          onChange={(event) => jumpTo(event.target.value)}
        >
          {filtered.sections.map((entry) => (
            <option key={entry.section.id} value={entry.section.id} disabled={entry.dim}>
              {entry.section.name}
            </option>
          ))}
          {hasUnknown ? (
            <option value={NOT_RECOGNISED_ID} disabled={filtered.unknownDim}>
              Not recognised
            </option>
          ) : null}
        </select>
        {showStatus ? (
          <select aria-label="Show" value={status} onChange={(event) => onStatus(event.target.value as StatusFilter)}>
            {statuses.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label} {entry.count}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {showStatus ? (
        <div className="view-settings-status" role="group" aria-label="Show">
          {statuses.map((entry) => (
            <button key={entry.id} type="button" aria-pressed={status === entry.id} onClick={() => onStatus(entry.id)}>
              <span>{entry.label}</span>
              <span className="view-settings-num">{entry.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      <nav className="view-settings-toc" aria-label="On this page">
        <span className="view-settings-toc-title">On this page</span>
        <ol>
          {filtered.sections.map((entry) => (
            <li key={entry.section.id}>
              <a
                href={`#${entry.section.id}`}
                data-dim={entry.dim}
                {...(current === entry.section.id && !entry.dim ? { 'aria-current': 'true' as const } : {})}
              >
                <span>{entry.section.name}</span>
                <span className="view-settings-num">{entry.rail}</span>
              </a>
            </li>
          ))}
          {hasUnknown ? (
            <li>
              <a
                href={`#${NOT_RECOGNISED_ID}`}
                data-dim={filtered.unknownDim}
                {...(current === NOT_RECOGNISED_ID && !filtered.unknownDim ? { 'aria-current': 'true' as const } : {})}
              >
                <span>Not recognised</span>
                <span className="view-settings-num">{filtered.unknownRail}</span>
              </a>
            </li>
          ) : null}
        </ol>
      </nav>
    </aside>
  );
}
