// The header scope chip (Phase 11, 11-32, D-11; sketch 056 C, the inside screen). Inside a workstream the header shows
// the project switcher and, beside it, "ws: {name}": a neutral button (never accent) that opens a popover of every
// workstream and 'All workstreams'. It is modelled on the project switcher and reads as a second level under it:
// smaller, ruled with the foreground, and it lists workstreams of this one project, never another project.
//
// The list is navigation, not a menu: real links, the open workstream marked aria-current='page'. Choosing a row
// navigates and closes the list at once; Escape closes it and returns focus to the trigger. Names, statuses and
// phase words are author text and are React text nodes only (T-11-49); every address comes from the listed name
// through the nav helpers, which encode it as one path segment (T-11-46).
import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Popover } from '@base-ui/react/popover';
import {
  buildScopeChipModel,
  SCOPE_ALL_LABEL,
  SCOPE_ALL_SUB,
  type ScopeChipModel,
} from '../../presentation/workstream-index.ts';
import { fetchWorkstreams } from '../api.ts';
import { UnscopedLink, useProjectSlug } from '../nav.tsx';
import { projectKey } from '../query-keys.ts';

/** The inside of the popup: the "Workstreams" head and the navigation list. Exported so a static render can show
 * it (Base UI mounts a popover's portal only on the client). */
export function ScopeChipPanel({ model }: { model: ScopeChipModel }): React.JSX.Element {
  return (
    <>
      <p className="scope-chip-title">Workstreams</p>
      <nav aria-label="Workstreams">
        <ul className="scope-chip-list">
          {model.rows.map((row) => (
            <li key={row.name}>
              <UnscopedLink className="scope-chip-row" to={row.url} aria-current={row.current ? 'page' : undefined}>
                <span className="status-square" data-tone={row.tone} aria-hidden="true" />
                <span className="scope-chip-row-name">{row.name}</span>
                {row.active ? <span className="scope-chip-active">Active</span> : <span />}
                <span className="scope-chip-sub">{row.sub}</span>
              </UnscopedLink>
            </li>
          ))}
          <li className="scope-chip-all">
            <UnscopedLink className="scope-chip-row" to="/">
              <span />
              <span className="scope-chip-row-name">{SCOPE_ALL_LABEL}</span>
              <span />
              <span className="scope-chip-sub">{SCOPE_ALL_SUB}</span>
            </UnscopedLink>
          </li>
        </ul>
      </nav>
    </>
  );
}

export function ScopeChip({ scope }: { scope: string }): React.JSX.Element {
  const slug = useProjectSlug() ?? '';
  const [open, setOpen] = useState(false);
  // The popup hangs under the header, not just under the trigger: below 42rem the tabs sit in a second row.
  const [sideOffset, setSideOffset] = useState(4);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // The project's own inventory (the same one the index reads), asked for from inside a scope: the key carries the
  // scope, so it is never mistaken for another workstream's entry. A failure leaves the chip with just its name.
  const inventory = useQuery({
    queryKey: projectKey(slug, scope, 'workstreams'),
    queryFn: () => fetchWorkstreams(slug),
    enabled: slug !== '',
  });
  const model = buildScopeChipModel(inventory.data, scope);

  const onOpenChange = useCallback((next: boolean) => {
    if (next) {
      const trigger = triggerRef.current;
      const header = trigger?.closest('header');
      if (trigger && header) {
        const gap = header.getBoundingClientRect().bottom - trigger.getBoundingClientRect().bottom;
        setSideOffset(Math.max(0, Math.ceil(gap)));
      }
    }
    setOpen(next);
  }, []);

  // One handler for every link in the list: the router navigates, and the list closes at once.
  const onPopupClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as Element).closest('a')) setOpen(false);
  }, []);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger ref={triggerRef} className="scope-chip" aria-label={model.label} aria-haspopup="dialog">
        <span className="scope-chip-key" aria-hidden="true">
          ws:
        </span>
        <span className="scope-chip-name">{scope}</span>
        <ChevronDown aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="scope-chip-positioner"
          sideOffset={sideOffset}
          align="start"
          collisionPadding={16}
          positionMethod="fixed"
        >
          <Popover.Popup className="scope-chip-popup" aria-label="Workstreams" initialFocus onClickCapture={onPopupClick}>
            <ScopeChipPanel model={model} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
