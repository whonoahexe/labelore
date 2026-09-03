import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button.tsx';

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
export function RefreshControl({ readAt, onPendingChange }: RefreshControlProps): React.JSX.Element {
  const queryClient = useQueryClient();

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
    // Task 2 wires the D-04 failure toast here.
    onError: () => {},
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
