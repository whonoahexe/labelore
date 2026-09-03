import { CircleDashed } from 'lucide-react';

/** D-08: one compact generic message for every surface reporting the absence of optional
 * planning content — a single source string so no call site re-types it. Byte-identical to the
 * string `tree-navigator.tsx`'s empty-group branch already renders. */
export const EMPTY_STATE_MESSAGE = 'Nothing here yet.';

/**
 * D-06 through D-09: the one shared empty state every optional-content surface renders instead
 * of bespoke absence copy. `variant="inline"` matches the existing `.empty-note` treatment
 * (a single quiet paragraph); `variant="block"` matches the existing `.empty-flow` treatment
 * (icon + message) used where a section needs a standalone empty block rather than an inline
 * note. Both variants use a neutral, muted-foreground icon and never the accent color — absence
 * must never read as a warning, a parse failure, or an application error (D-09).
 */
export function EmptyState({
  variant = 'inline',
}: {
  variant?: 'inline' | 'block';
}): React.JSX.Element {
  if (variant === 'block') {
    return (
      <div className="empty-flow" data-tone="quiet" role="status">
        <CircleDashed aria-hidden="true" />
        <p>{EMPTY_STATE_MESSAGE}</p>
      </div>
    );
  }
  return <p className="empty-note">{EMPTY_STATE_MESSAGE}</p>;
}
