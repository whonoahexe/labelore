import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { PanelLeft, X } from 'lucide-react';
import { PlanningPlaces } from './planning-places.tsx';
import { buttonVariants } from './ui/button.tsx';

/** D-01: the navbar-triggered overlay drawer that hosts the planning files (sketch 038 C: places
 * on the left, the chosen place's files on the right). Modeled on SearchDialog (search-field.tsx)
 * — the same `@base-ui/react` Dialog pattern, here fixed to the left edge with `keepMounted` so
 * the drawer body survives the drawer closing. The default modal mode gives Esc and a backdrop
 * click for free; every file link inside PlanningPlaces also closes it via `onNavigate`. */
export function SidebarDrawer(): React.JSX.Element {
  const [open, setOpen] = useState(false);

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
        <Dialog.Popup className="sidebar-drawer">
          <div className="sidebar-drawer-header">
            <Dialog.Title className="sidebar-drawer-title">Planning files</Dialog.Title>
            <div className="sidebar-drawer-actions">
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
          <PlanningPlaces open={open} onNavigate={() => setOpen(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
