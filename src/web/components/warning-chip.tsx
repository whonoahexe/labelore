// The parse-warning chip a console view shows in its rail in place of the artifact header's chip
// (quick-261003-527): the same Warning / Unreadable vocabulary and tones the header and the search
// results use, read from the shared `artifactWarningTone` derivation — never a static literal.
import type { ArtifactWarningTone } from '../../presentation/artifact-warning-tone.ts';

export function WarningChip({ tone }: { tone: ArtifactWarningTone }): React.JSX.Element | null {
  if (!tone) return null;
  return (
    <span className="status-chip" data-tone={tone === 'unreadable' ? 'destructive' : 'warning'}>
      {tone === 'unreadable' ? 'Unreadable' : 'Warning'}
    </span>
  );
}
