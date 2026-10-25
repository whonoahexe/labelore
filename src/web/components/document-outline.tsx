// The "On this page" navigation, extracted so its markup is shared verbatim between Source mode
// (fed by `RenderedDocument.headings`) and View mode (fed by the view registry's own
// promoted-section list, D-11), and — since Plan 05-04 — between the wide sticky column and the
// narrow-width sticky disclosure (D-12). `OutlineList` is the single shared `<ol>` both
// presentations render, so the markup cannot drift between them.
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover } from '@base-ui/react/popover';

export interface OutlineEntry {
  id: string;
  label: string;
  depth?: number;
}

/** SEC-03 (D-14): the quiet line that closes a capped outline. Plain text on purpose — not a link,
 * no class name, no icon or glyph — so it reads as a count, not a control. */
function overflowLabel(omitted: number): string {
  return `+${omitted} more ${omitted === 1 ? 'section' : 'sections'}`;
}

export function OutlineList({
  entries,
  activeId,
  onSelect,
  omitted = 0,
}: {
  entries: OutlineEntry[];
  activeId?: string | null;
  onSelect?: () => void;
  omitted?: number;
}): React.JSX.Element {
  return (
    <ol>
      {entries.map((entry) => (
        <li key={entry.id} data-depth={entry.depth ?? 2}>
          <a
            href={`#${encodeURIComponent(entry.id)}`}
            data-active={activeId === entry.id ? 'true' : undefined}
            onClick={onSelect}
          >
            {entry.label}
          </a>
        </li>
      ))}
      {omitted > 0 ? <li data-overflow="true">{overflowLabel(omitted)}</li> : null}
    </ol>
  );
}

export function DocumentOutline({
  entries,
  activeId,
  omitted = 0,
}: {
  entries: OutlineEntry[];
  activeId?: string | null;
  omitted?: number;
}): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  const currentLabel = (entries.find((entry) => entry.id === activeId) ?? entries[0]).label;

  return (
    <>
      <nav className="document-outline" aria-label="On this page">
        <p>On this page</p>
        <OutlineList entries={entries} activeId={activeId} omitted={omitted} />
      </nav>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="document-outline-trigger">
          <span>On this page · {currentLabel}</span>
          <ChevronDown aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            className="document-outline-positioner"
            sideOffset={8}
            align="start"
            positionMethod="fixed"
          >
            <Popover.Popup className="document-outline" aria-label="On this page" initialFocus>
              <OutlineList
                entries={entries}
                activeId={activeId}
                onSelect={() => setOpen(false)}
                omitted={omitted}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
