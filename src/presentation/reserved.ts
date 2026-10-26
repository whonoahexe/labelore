// The one reserved-word constant shared by the server, the router and the slug generator
// (RESEARCH Pitfall 7). The server decides which URLs it owns from SERVER_OWNED_PREFIXES; slugOf
// reads RESERVED_SLUGS so a project folder named like any of these words can never become a first
// path segment that the server or the router would take for something else.

/** URL prefixes the Hono app owns in dev mode: the JSON API and the read-only sketch files. The
 * bare `/sketches` is a client page, so only the trailing-slash form is server-owned. */
export const SERVER_OWNED_PREFIXES = ['/api/', '/sketches/'] as const;

/** True for a URL the Hono app answers itself (everything else goes to Vite in dev mode). */
export function isServerOwnedUrl(url: string | undefined): boolean {
  return url !== undefined && SERVER_OWNED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/** Words a project slug may not equal: server-owned paths, the dev server's own folders and the
 * route words of the pages. A slug that lands on one gets the `-project` suffix (assumption A7;
 * adding a word is a one-line change here). */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'api',
  'assets',
  'sketches',
  'fonts',
  'src',
  'public',
  'docs',
  'test',
  'fixtures',
  'dist',
  'projects',
  'milestones',
  'artifacts',
  'phases',
  'roadmap',
  'search',
  'traceability',
  'research',
  'settings',
]);

/** The pages that live at a fixed address inside a project (`/roadmap`, `/search`, ...). Each is also a
 * reserved word, so no file can take one of these addresses except ROADMAP.md, which IS the roadmap page. */
export const PROJECT_PAGES = ['roadmap', 'search', 'traceability', 'research', 'sketches'] as const;

/** Segment prefixes that mean something to the URL parser, so no file or version may start a segment
 * with one unescaped: `phase-5` is a phase and `milestone-x` is an escaped milestone version. */
export const RESERVED_SEGMENT_PREFIXES = ['phase-', 'milestone-'] as const;

/** The version shape GSD writes (`v1.1`, `v2.0.3`): a milestone version in this shape is its own URL
 * segment; any other version gets the `milestone-` escape. Case-insensitive, like the naming grammar. */
export const GSD_VERSION_PATTERN = /^v\d+\.\d+(?:\.\d+)?$/i;
