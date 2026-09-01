import { useMemo } from 'react';
import { Popover } from '@base-ui/react/popover';
import { ArrowUpRight, X } from 'lucide-react';
import type { ReferencePreviewDto } from '../../presentation/references.ts';

export interface ReferencePreviewState {
  trigger: HTMLElement;
  preview: ReferencePreviewDto;
}

interface ReferencePreviewProps {
  state: ReferencePreviewState | null;
  open: boolean;
  onOpenChange(open: boolean): void;
  onCloseComplete(): void;
}

/** One controlled React-owned preview, positioned against an inert document control. */
export function ReferencePreview({
  state,
  open,
  onOpenChange,
  onCloseComplete,
}: ReferencePreviewProps): React.JSX.Element | null {
  const trigger = state?.trigger ?? null;
  /**
   * A virtual anchor, not the element itself. The trigger is a plain DOM node inside the
   * document mount — it is not React-rendered, so the positioner never registered its box and
   * fell back to a 0x0 reference at the viewport origin, pinning the popup to the top-left.
   * Measuring on demand also keeps the popup correct after a scroll or resize.
   */
  const anchor = useMemo(
    () => (trigger ? { getBoundingClientRect: () => trigger.getBoundingClientRect() } : null),
    [trigger],
  );

  // Hooks must run before this guard, so it sits below them rather than at the top.
  if (!state || !anchor) return null;
  const { preview } = state;

  return (
    <Popover.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) onCloseComplete();
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          className="reference-preview-positioner"
          anchor={anchor}
          sideOffset={8}
          align="start"
          positionMethod="fixed"
        >
          <Popover.Popup
            className="reference-preview"
            initialFocus
            finalFocus={() => state.trigger}
          >
            <div className="reference-preview-heading">
              <div>
                <p className="eyebrow">{preview.type}</p>
                <Popover.Title>{preview.identity}</Popover.Title>
              </div>
              <Popover.Close className="reference-preview-close" aria-label="Close preview">
                <X aria-hidden="true" />
              </Popover.Close>
            </div>
            <Popover.Description>{preview.title}</Popover.Description>
            <dl className="reference-preview-facts">
              <div>
                <dt>Status</dt>
                <dd>{preview.status}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{preview.location}</dd>
              </div>
              <div>
                <dt>{preview.detail.label}</dt>
                <dd>{preview.detail.value}</dd>
              </div>
            </dl>
            <a className="reference-preview-open" href={preview.url}>
              Open
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
