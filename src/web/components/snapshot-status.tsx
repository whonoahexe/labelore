import { useEffect, useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatReadAt, formatRelativeReadAt } from '../../presentation/shell-header.ts';
import { Button } from './ui/button.tsx';
import { useToastManager } from './ui/toast.tsx';

interface RefreshResponse {
  refreshed: boolean;
  readAt?: string;
  loadStatus?: unknown;
}

async function postRefresh(): Promise<RefreshResponse> {
  const response = await fetch('/api/refresh', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Refresh request failed (${response.status})`);
  return (await response.json()) as RefreshResponse;
}

const RELATIVE_TICK_MS = 30_000;

export type SnapshotPhase = 'pending' | 'error' | 'ready';

interface SnapshotStatusProps {
  readAt: string | null;
  phase: SnapshotPhase;
}

/** NAV-05 (quick-260911-243): the header status pill, merged from the former RefreshControl —
 * a dot plus "Read {relative}" that is also the refresh trigger. Absorbs RefreshControl's whole
 * mutation, toast and aria contract verbatim (Phase-4 D-01 through D-05). */
export function SnapshotStatus({ readAt, phase }: SnapshotStatusProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const toastManager = useToastManager();
  const labelId = useId();

  const mutation = useMutation({
    mutationFn: postRefresh,
    onSuccess: async () => {
      // Phase-4 D-05: one unfiltered invalidation is the entire client-side reaction to a
      // successful refresh — never gated on comparing the returned readAt against the previous
      // one, because two refreshes completing inside the same millisecond carry equal timestamps
      // and must still repaint (TGT-08 adjacency edge).
      await queryClient.invalidateQueries();
      // Phase-4 D-03: preserve the current route, return to the top.
      window.scrollTo({ top: 0 });
    },
    // Phase-4 D-04: the previously loaded snapshot and its original readAt are retained unchanged
    // - this handler never touches the query cache and never scrolls. The raw fetch/server error
    // text never reaches the toast; only the retained snapshot's own read time varies in the
    // fixed copy below, which is the one deliberate exception to every other `.notice.destructive`
    // branch in this codebase interpolating the caught error's own message text.
    onError: () => {
      toastManager.add({
        title: 'Refresh failed',
        description: `Refresh failed. Showing the last successful read from ${
          readAt ? formatReadAt(readAt) : 'the previous read'
        }.`,
        type: 'error',
      });
    },
  });

  const isRefreshing = mutation.isPending;

  // A `now` tick drives the relative-time label. Only ever set from inside the interval
  // callback, never synchronously in the effect body, so react-hooks v7's exhaustive-deps lint
  // passes without a spurious `now` dependency on the effect itself.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), RELATIVE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const state = isRefreshing ? 'refreshing' : phase;

  let title: string;
  let labelContent: React.ReactNode;
  let liveText: string;

  if (state === 'pending') {
    title = 'Reading snapshot…';
    labelContent = 'Reading snapshot…';
    liveText = 'Reading snapshot…';
  } else if (state === 'error') {
    title = 'Snapshot metadata unavailable — click to retry';
    labelContent = 'Metadata unavailable';
    liveText = 'Snapshot metadata unavailable';
  } else if (state === 'refreshing') {
    title = 'Refreshing the project snapshot';
    labelContent = 'Refreshing…';
    liveText = 'Refreshing…';
  } else {
    const formattedReadAt = readAt ? formatReadAt(readAt) : '';
    title = `Snapshot read ${formattedReadAt} — click to refresh`;
    labelContent = readAt ? (
      <>
        Read <time dateTime={readAt}>{formatRelativeReadAt(readAt, now) ?? formattedReadAt}</time>
      </>
    ) : (
      'Snapshot read'
    );
    liveText = `Snapshot read ${formattedReadAt}`;
  }

  return (
    <div className="snapshot-status">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        className="snapshot-pill"
        data-state={state}
        onClick={() => mutation.mutate()}
        disabled={isRefreshing}
        aria-disabled={isRefreshing}
        aria-label="Refresh the project snapshot"
        aria-describedby={labelId}
        data-snapshot-read-at={readAt ?? undefined}
        title={title}
      >
        <span className="snapshot-dot" aria-hidden="true" />
        <span className="snapshot-label" id={labelId}>
          {labelContent}
        </span>
      </Button>
      <span className="sr-only" aria-live="polite">
        {liveText}
      </span>
    </div>
  );
}
