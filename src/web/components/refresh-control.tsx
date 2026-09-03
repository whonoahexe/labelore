import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatReadAt } from './app-shell.tsx';
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

interface RefreshControlProps {
  readAt: string | null;
  /** Lets AppShell branch its header status on the mutation's pending state without duplicating
   * the mutation itself or reaching for `useMutationState`. */
  onPendingChange?: (isRefreshing: boolean) => void;
}

/** Header Refresh control (D-01) — re-reads the project through `POST /api/refresh`, the
 * codebase's first `useMutation`. Every other data flow here is `useQuery`. */
export function RefreshControl({
  readAt,
  onPendingChange,
}: RefreshControlProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const toastManager = useToastManager();

  const mutation = useMutation({
    mutationFn: postRefresh,
    onSuccess: async () => {
      // D-05: one unfiltered invalidation is the entire client-side reaction to a successful
      // refresh — never gated on comparing the returned readAt against the previous one, because
      // two refreshes completing inside the same millisecond carry equal timestamps and must
      // still repaint (TGT-08 adjacency edge).
      await queryClient.invalidateQueries();
      // D-03: preserve the current route, return to the top.
      window.scrollTo({ top: 0 });
    },
    // D-04: the previously loaded snapshot and its original readAt are retained unchanged - this
    // handler never touches the query cache and never scrolls. The raw fetch/server error text
    // never reaches the toast; only the retained snapshot's own read time varies in the fixed
    // copy below, which is the one deliberate exception to every other `.notice.destructive`
    // branch in this codebase interpolating `{error.message}`.
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

  useEffect(() => {
    onPendingChange?.(isRefreshing);
  }, [isRefreshing, onPendingChange]);

  return (
    <Button
      aria-label="Refresh the project snapshot"
      className="refresh-control"
      onClick={() => mutation.mutate()}
      size="icon-sm"
      type="button"
      variant="ghost"
      disabled={isRefreshing}
      aria-disabled={isRefreshing}
      data-snapshot-read-at={readAt ?? undefined}
    >
      <RefreshCw
        aria-hidden="true"
        className={isRefreshing ? 'refresh-icon spinning' : 'refresh-icon'}
      />
      <span className="sr-only">Refresh the project snapshot</span>
    </Button>
  );
}
