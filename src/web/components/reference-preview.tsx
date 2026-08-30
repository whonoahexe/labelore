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
  if (!state) return null;
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
          anchor={state.trigger}
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
