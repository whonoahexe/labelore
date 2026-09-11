import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { PanelLeft, X } from 'lucide-react';
import { TreeNavigator } from './tree-navigator.tsx';
import { buttonVariants } from './ui/button.tsx';

/** D-01: the navbar-triggered overlay drawer that now hosts the planning tree, replacing the
 * former permanent sidebar. Modeled on SearchDialog (search-field.tsx) — the same `@base-ui/react`
 * Dialog pattern, here fixed to the left edge with `keepMounted` so manual expand/collapse state
 * and the tree itself survive the drawer closing. The default modal mode gives Esc and a backdrop
 * click for free; every leaf/folder link inside TreeNavigator also closes it via `onNavigate`. */
export function SidebarDrawer(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm', className: 'sidebar-trigger' })}
        aria-label="Open planning files"
      >
        <PanelLeft aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop className="sidebar-drawer-backdrop" />
        <Dialog.Popup className="sidebar-drawer">
          <div className="sidebar-drawer-header">
            <Dialog.Title className="sidebar-drawer-title">Planning files</Dialog.Title>
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
          <TreeNavigator open={open} onNavigate={() => setOpen(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
