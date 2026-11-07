// NAV-09: pure helpers for the project slug that opens every address. No React, no router: the
// hooks that apply them live in nav.tsx, the only module that prefixes the slug, and the router
// layout in pages/project-layout.tsx reads projectLayoutOutcome. Phase 8 adds projectRootPath, the
// address of a project by slug alone (landing rows, 'See all projects').
import { isValidSlug } from '../presentation/project-slug.ts';

/** Prefixes a project-relative target with the project slug. A null slug (no project route yet,
 * as in a bare MemoryRouter) leaves the target unchanged. The target must start with a single
 * '/': anything else, including '//host' and '/\host' (which a browser reads as another origin),
 * collapses to the project's dashboard, so a crafted value can never leave the app (T-07-07). The
 * query and hash of a valid target are kept. */
export function withProjectSlug(slug: string | null, to: string): string {
  if (slug === null) return to;
  const root = `/${slug}`;
  if (!to.startsWith('/') || to.startsWith('//') || to.startsWith('/\\')) return root;
  const cut = to.search(/[?#]/);
  const pathPart = cut < 0 ? to : to.slice(0, cut);
  const tail = cut < 0 ? '' : to.slice(cut);
  return pathPart === '/' ? `${root}${tail}` : `${root}${pathPart}${tail}`;
}

/** The scope prefix of a workstream: '/workstreams/{encoded name}'. The name is one encoded segment, so a
 * name that carries '/', '?' or '#' can never open another path (T-11-46). */
function scopePrefix(scope: string): string {
  return `/workstreams/${encodeURIComponent(scope)}`;
}

/** Prefixes a project-relative target with the project slug and, inside a workstream, the scope
 * (`/{slug}/workstreams/{name}{to}`). With no scope it is withProjectSlug exactly, so a flat project's links
 * are unchanged. The same single-slash rule applies: a target that is not a plain '/path' collapses to the
 * scope's own root. A null slug leaves the target unchanged. */
export function withProjectScope(slug: string | null, scope: string | null, to: string): string {
  if (slug === null || scope === null) return withProjectSlug(slug, to);
  const root = withProjectSlug(slug, scopePrefix(scope));
  if (!to.startsWith('/') || to.startsWith('//') || to.startsWith('/\\')) return root;
  const cut = to.search(/[?#]/);
  const pathPart = cut < 0 ? to : to.slice(0, cut);
  const tail = cut < 0 ? '' : to.slice(cut);
  return pathPart === '/' ? `${root}${tail}` : `${root}${pathPart}${tail}`;
}

/** Peels a workstream scope off the project-relative remainder of a pathname (the `rest` of
 * splitProjectPath): '/workstreams/{name}' or '/workstreams/{name}/...' gives the name, decoded once, and the
 * remainder, which starts with '/'. Anything else, including '/workstreams' and '/workstreams/' alone, has no
 * scope and comes back unchanged. The name is not validated here beyond being one segment: the server answers
 * 404 for a name that is not a workstream. */
export function splitScope(rest: string): { scope: string | null; rest: string } {
  const lead = '/workstreams/';
  if (!rest.startsWith(lead)) return { scope: null, rest };
  const after = rest.slice(lead.length);
  const cut = after.indexOf('/');
  const raw = cut < 0 ? after : after.slice(0, cut);
  if (raw === '') return { scope: null, rest };
  let scope = raw;
  try {
    scope = decodeURIComponent(raw);
  } catch {
    // A lone '%' stays raw; the server will not know the name.
  }
  return { scope, rest: cut < 0 ? '/' : after.slice(cut) };
}

/** The address of a project by slug alone: '/' plus the slug when it is a valid slug, else '/'.
 * Built for links that name another project (or none) and so are never prefixed with the current
 * slug; a crafted value ('API', '//evil', an empty string) can never leave the app (T-08-21). */
export function projectRootPath(slug: string): string {
  return isValidSlug(slug) ? `/${slug}` : '/';
}

/** Splits a pathname into its first raw segment (the project slug position) and the remainder,
 * which starts with '/' and is '/' when nothing follows. */
export function splitProjectPath(pathname: string): { first: string; rest: string } {
  const trimmed = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const cut = trimmed.indexOf('/');
  if (cut < 0) return { first: trimmed, rest: '/' };
  return { first: trimmed.slice(0, cut), rest: trimmed.slice(cut) };
}

/** The pathname as typed, decoded once per segment. A segment that fails to decode (a lone '%')
 * is kept raw, so the not-found page can always name what was typed. */
export function decodeAddress(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');
}

export type QueryStatusName = 'pending' | 'error' | 'success';

export type ProjectLayoutOutcome =
  | 'loading-list'
  | 'list-error'
  | 'unknown'
  | 'opening'
  | 'presentation-error'
  | 'invalid'
  | 'open';

/** What the project layout shows for the first URL segment. The slug is looked up in the list by exact
 * string equality (no case folding, no trimming), so `/Portal` is not `portal`. Only a listed slug can
 * reach a presentation: an unknown one stops at `unknown`, and nothing is requested for it. */
export function projectLayoutOutcome(input: {
  slug: string;
  listStatus: QueryStatusName;
  projects: ReadonlyArray<{ slug: string }> | undefined;
  presentationStatus: QueryStatusName;
  presentation: { loadStatus: { status: string } } | undefined;
}): ProjectLayoutOutcome {
  if (input.listStatus === 'error') return 'list-error';
  if (input.listStatus === 'pending' || input.projects === undefined) return 'loading-list';
  if (!input.projects.some((entry) => entry.slug === input.slug)) return 'unknown';
  if (input.presentationStatus === 'error') return 'presentation-error';
  if (input.presentationStatus === 'pending' || input.presentation === undefined) return 'opening';
  return input.presentation.loadStatus.status === 'ok' ? 'open' : 'invalid';
}
