// A titled frame for a figure (quick-260929-3x3, sketch 009): the bar carries Fit to width /
// Actual size and Expand, the body scrolls at actual size, the caption sits underneath. Expand opens
// the same figure at actual size in a Base UI dialog, mirroring sidebar-drawer.tsx's Dialog usage.
// View-agnostic: `children` is a render prop receiving the fit flag, so any figure component
// (the lifted diagram, a plain block) plugs in — nothing here knows about research.
import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';

export function FigureFrame({
  title,
  children,
  caption,
}: {
  title: string;
  children: (fit: boolean) => React.ReactNode;
  caption?: React.ReactNode;
}): React.JSX.Element {
  const [fit, setFit] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <figure className="figure-frame">
      <div className="figure-frame-bar">
        <span className="figure-frame-title">{title}</span>
        <button
          type="button"
          className="status-chip"
          aria-pressed={fit}
          onClick={() => setFit((previous) => !previous)}
        >
          {fit ? 'Fit to width' : 'Actual size'}
        </button>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="status-chip">Expand</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="sidebar-drawer-backdrop" />
            <Dialog.Popup className="figure-frame-dialog">
              <div className="figure-frame-bar">
                <Dialog.Title className="figure-frame-title">{title}</Dialog.Title>
                <Dialog.Close className="status-chip">Close</Dialog.Close>
              </div>
              <div className="figure-frame-body document-overflow-boundary">{children(false)}</div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className="figure-frame-body document-overflow-boundary">{children(fit)}</div>
      {caption ? <figcaption className="figure-frame-caption">{caption}</figcaption> : null}
    </figure>
  );
}
