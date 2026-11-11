// The client side of the raw-text route (Phase 12): one project's Source text for a route, read from that
// project's own API. The transport is reversible behind this one function (D-08).
import { projectUrl } from '../api.ts';
import { projectKey } from '../query-keys.ts';
import type { SourceTextResponse } from '../../server/source-text.ts';

/**
 * Where the reader should land once its text is loaded: a heading id from an "In the source only" link
 * (null lands on line 1) or a line from a pasted link or a same-page link. `seq` is fresh per request, so
 * asking for the same place twice lands twice.
 */
export type SourceTarget =
  | { kind: 'heading'; id: string | null; seq: number }
  | { kind: 'line'; line: number; select: boolean; seq: number };

/** The react-query key of one document's Source text. */
export function sourceKey(slug: string, scope: string | null, route: string): readonly unknown[] {
  return projectKey(slug, scope, 'source', route);
}

/** One document's Source text. A failure carries the response's plain text (the route answers errors as plain text). */
export async function fetchSource(slug: string, scope: string | null, route: string): Promise<SourceTextResponse> {
  let response: Response;
  try {
    response = await fetch(projectUrl(slug, `/source?route=${encodeURIComponent(route)}`, scope), {
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    throw new Error('Labelore could not be reached.', { cause: error });
  }
  if (!response.ok) {
    const text = await response.text().then(
      (value) => value.trim(),
      () => '',
    );
    throw new Error(text === '' ? `Source request failed (${response.status})` : text);
  }
  return (await response.json()) as SourceTextResponse;
}
