import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronsDownUp, ChevronsUpDown, PanelLeft, X } from 'lucide-react';
import { TreeNavigator } from './tree-navigator.tsx';
import { buttonVariants } from './ui/button.tsx';

/** D-01: the navbar-triggered overlay drawer that now hosts the planning tree, replacing the
 * former permanent sidebar. Modeled on SearchDialog (search-field.tsx) — the same `@base-ui/react`
 * Dialog pattern, here fixed to the left edge with `keepMounted` so manual expand/collapse state
 * and the tree itself survive the drawer closing. The default modal mode gives Esc and a backdrop
 * click for free; every leaf/folder link inside TreeNavigator also closes it via `onNavigate`. */
export function SidebarDrawer(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  // The tree's <details> are uncontrolled, so the toggle reads their live state rather than
  // owning it: `toggle` doesn't bubble, but a capture listener on the popup still sees every one.
  useEffect(() => {
    const popup = popupRef.current;
    if (!open || popup === null) return;
    const sync = () => {
      const disclosures = [
        ...popup.querySelectorAll<HTMLDetailsElement>('details.tree-disclosure'),
      ];
      setAllExpanded(disclosures.length > 0 && disclosures.every((details) => details.open));
    };
    sync();
    popup.addEventListener('toggle', sync, true);
    return () => popup.removeEventListener('toggle', sync, true);
  }, [open]);

  const toggleAll = () => {
    const next = !allExpanded;
    popupRef.current
      ?.querySelectorAll<HTMLDetailsElement>('details.tree-disclosure')
      .forEach((details) => {
        details.open = next;
      });
    setAllExpanded(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={buttonVariants({
          variant: 'ghost',
          size: 'icon-sm',
          className: 'sidebar-trigger',
        })}
        aria-label="Open planning files"
      >
        <PanelLeft aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop className="sidebar-drawer-backdrop" />
        <Dialog.Popup className="sidebar-drawer" ref={popupRef}>
          <div className="sidebar-drawer-header">
            <Dialog.Title className="sidebar-drawer-title">Planning files</Dialog.Title>
            <div className="sidebar-drawer-actions">
              <button
                type="button"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'sidebar-drawer-toggle-all',
                })}
                aria-label={allExpanded ? 'Collapse all folders' : 'Expand all folders'}
                title={allExpanded ? 'Collapse all' : 'Expand all'}
                onClick={toggleAll}
              >
                {allExpanded ? (
                  <ChevronsDownUp aria-hidden="true" />
                ) : (
                  <ChevronsUpDown aria-hidden="true" />
                )}
              </button>
              <Dialog.Close
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'sidebar-drawer-close',
                })}
                aria-label="Close planning files"
              >
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <TreeNavigator open={open} onNavigate={() => setOpen(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
