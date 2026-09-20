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

function OutlineList({
  entries,
  activeId,
  onSelect,
}: {
  entries: OutlineEntry[];
  activeId?: string | null;
  onSelect?: () => void;
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
    </ol>
  );
}

export function DocumentOutline({
  entries,
  activeId,
}: {
  entries: OutlineEntry[];
  activeId?: string | null;
}): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  const currentLabel = (entries.find((entry) => entry.id === activeId) ?? entries[0]).label;

  return (
    <>
      <nav className="document-outline" aria-label="On this page">
        <p>On this page</p>
        <OutlineList entries={entries} activeId={activeId} />
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
              <OutlineList entries={entries} activeId={activeId} onSelect={() => setOpen(false)} />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
