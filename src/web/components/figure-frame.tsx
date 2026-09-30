// A titled frame for a figure (quick-260929-3x3, sketch 009; quick-260930-jzt): the bar carries the
// title, an optional `tools` slot (a tree's Changed only chip and counts), and — when the figure is
// `scalable` — Fit to width / Actual size and a Grid toggle, then Expand. The body shows the whole
// figure (no height cap) and scrolls horizontally when it is wider than the frame; `data-grid` draws
// a grid-paper backdrop. The caption sits underneath. Expand opens the same figure at actual size in
// a Base UI dialog, mirroring sidebar-drawer.tsx's Dialog usage. View-agnostic: `children` is a
// render prop receiving the fit flag, so any figure component (the lifted diagram, a plain block, a
// tree) plugs in — nothing here knows about research.
import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';

export function FigureFrame({
  title,
  children,
  caption,
  tools,
  scalable = true,
}: {
  title: string;
  children: (fit: boolean) => React.ReactNode;
  caption?: React.ReactNode;
  /** Extra bar content, after the title and before the frame's own chips. */
  tools?: React.ReactNode;
  /** False for a figure that does not scale (a tree): no Fit / Actual size and no Grid chips. */
  scalable?: boolean;
}): React.JSX.Element {
  const [fit, setFit] = useState(false);
  const [grid, setGrid] = useState(false);
  const [open, setOpen] = useState(false);
  const gridAttribute = grid ? 'true' : undefined;
  return (
    <figure className="figure-frame">
      <div className="figure-frame-bar">
        <span className="figure-frame-title">{title}</span>
        {tools}
        {scalable ? (
          <>
            <button
              type="button"
              className="status-chip"
              aria-pressed={fit}
              onClick={() => setFit((previous) => !previous)}
            >
              {fit ? 'Fit to width' : 'Actual size'}
            </button>
            <button
              type="button"
              className="status-chip"
              aria-pressed={grid}
              onClick={() => setGrid((previous) => !previous)}
            >
              Grid
            </button>
          </>
        ) : null}
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="status-chip">Expand</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="sidebar-drawer-backdrop" />
            <Dialog.Popup className="figure-frame-dialog">
              <div className="figure-frame-bar">
                <Dialog.Title className="figure-frame-title">{title}</Dialog.Title>
                <Dialog.Close className="status-chip">Close</Dialog.Close>
              </div>
              <div className="figure-frame-body document-overflow-boundary" data-grid={gridAttribute}>
                {children(false)}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className="figure-frame-body document-overflow-boundary" data-grid={gridAttribute}>
        {children(fit)}
      </div>
      {caption ? <figcaption className="figure-frame-caption">{caption}</figcaption> : null}
    </figure>
  );
}
