// The D-01/D-03 View/Source toggle. Client-side state only — never a route change, never a
// `#hash` write (Phase 2 D-16). Renders inside `ArtifactHeader`'s `children` slot, the same slot
// `plan-pair-page.tsx` already uses for its own section-jump nav.
import { Button } from './ui/button.tsx';

export function DocumentViewToggle({
  mode,
  onChange,
}: {
  mode: 'view' | 'source';
  onChange(mode: 'view' | 'source'): void;
}): React.JSX.Element {
  return (
    <div className="document-view-toggle" role="group" aria-label="Document display">
      <Button
        type="button"
        size="xs"
        variant={mode === 'view' ? 'secondary' : 'ghost'}
        aria-pressed={mode === 'view'}
        onClick={() => onChange('view')}
      >
        View
      </Button>
      <Button
        type="button"
        size="xs"
        variant={mode === 'source' ? 'secondary' : 'ghost'}
        aria-pressed={mode === 'source'}
        onClick={() => onChange('source')}
      >
        Source
      </Button>
    </div>
  );
}
