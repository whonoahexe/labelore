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

export type ProjectGateOutcome = 'loading' | 'invalid' | 'wrong-project' | 'open';

/** What the router does with an address once it knows the first segment: wait for the payload,
 * show the invalid-project screen, show the not-found page for another project's name, or open. */
export function projectGateOutcome(
  first: string,
  presentation: { projectSlug: string; loadStatus: { status: string } } | undefined,
): ProjectGateOutcome {
  if (presentation === undefined) return 'loading';
  if (presentation.loadStatus.status !== 'ok') return 'invalid';
  return first === presentation.projectSlug ? 'open' : 'wrong-project';
}
