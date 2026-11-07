// NAV-09: the single place the project slug is prefixed. Every Link, NavLink, navigate call,
// pathname reader and raw href in the web goes through this module; ESLint (no-restricted-imports)
// and test/web/nav-contract.test.ts fail on a router link anywhere else.
//
// The slug comes only from the URL (D-08): useProjectSlug reads the `:project` route parameter and
// nothing else, so no context can make one tab's links point into a project its address does not
// name. Link, NavLink and useProjectNavigate prefix that slug, for links inside a project. AppLink
// and useAppNavigate are the one way to reach '/' or another project: they never take the current
// slug, and a target that is not '/' or '/' plus a valid slug collapses to '/'.
//
// A workstream scope (Phase 11, D-11) is the second URL position: /{project}/workstreams/{name}/... The
// router's ProjectRoute peels it off the pathname once (splitScope) and provides it here; inside a scope
// Link, NavLink, useProjectNavigate and useProjectHref build /{slug}/workstreams/{name}{to}, so call sites need
// no change. UnscopedLink and useUnscopedProjectHref are the explicit way out of a scope (the drawer's Shared
// group, the chip's All workstreams). With no scope every address is exactly what it was before.
//
// Everything below the router speaks project-relative paths ('/roadmap', '/milestones/...'): the
// wrappers add the slug on the way out, and the location hooks take it off on the way in.
import { createContext, forwardRef, useCallback, useContext } from 'react';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useLocation,
  useNavigate,
  useParams,
  type LinkProps,
  type NavLinkProps,
  type NavigateOptions,
  type To,
} from 'react-router';
import { projectRootPath, splitProjectPath, splitScope, withProjectScope, withProjectSlug } from './project-path.ts';

/** The open project's slug: the `:project` route parameter, else null (a component rendered outside
 * the project route, such as in a bare MemoryRouter, stays unprefixed). Deliberately no react-query
 * here, so those components keep rendering without a QueryClient. */
export function useProjectSlug(): string | null {
  const params = useParams();
  return params.project ?? null;
}

const ProjectScopeContext = createContext<string | null>(null);

/** Provides the open workstream scope to the project's pages. Only the router's project route renders it,
 * and the value is read off the address there, so the scope always names the address. */
export const ProjectScopeProvider = ProjectScopeContext.Provider;

/** The open workstream's name, else null (a flat project, or a component outside a project route). */
export function useProjectScope(): string | null {
  return useContext(ProjectScopeContext);
}

/** Search-only and hash-only targets stay on the current page, so they pass through unprefixed. */
function isRelativeTail(value: string): boolean {
  return value.startsWith('?') || value.startsWith('#');
}

function prefixTo(slug: string | null, scope: string | null, to: To): To {
  if (slug === null) return to;
  if (typeof to === 'string') return isRelativeTail(to) ? to : withProjectScope(slug, scope, to);
  if (to.pathname === undefined || to.pathname === '') return to;
  return { ...to, pathname: withProjectScope(slug, scope, to.pathname) };
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...props }, ref) {
  const slug = useProjectSlug();
  const scope = useProjectScope();
  return <RouterLink ref={ref} to={prefixTo(slug, scope, to)} {...props} />;
});

/** A link inside the open project that leaves the workstream scope: the project's own (shared) address
 * even while a workstream is open. Without a scope it is Link. */
export const UnscopedLink = forwardRef<HTMLAnchorElement, LinkProps>(function UnscopedLink(
  { to, ...props },
  ref,
) {
  const slug = useProjectSlug();
  return <RouterLink ref={ref} to={prefixTo(slug, null, to)} {...props} />;
});

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, ...props },
  ref,
) {
  const slug = useProjectSlug();
  const scope = useProjectScope();
  return <RouterNavLink ref={ref} to={prefixTo(slug, scope, to)} {...props} />;
});

/** A target that names the landing page or one project, checked again here: '/' passes, '/' plus a
 * valid slug passes, anything else (a query, a path below a project, '//evil') is '/'. */
function appTarget(to: string): string {
  return to.startsWith('/') ? projectRootPath(to.slice(1)) : '/';
}

/** A link to '/' or to another project's root. Never prefixed with the current project's slug.
 *
 * A plain click navigates with `flushSync`. React Router otherwise applies a navigation inside a
 * transition: the address changes at once while the new page renders a few frames later, so the page
 * just left stays on screen under the new project's address (D-07: no project's text may show once the
 * address names another). A synchronous update commits the new project's shell in the same task that
 * changes the address. Modified clicks and `target` links keep the browser's own behaviour. */
export const AppLink = forwardRef<HTMLAnchorElement, Omit<LinkProps, 'to'> & { to: string }>(function AppLink(
  { to, onClick, target, replace, ...props },
  ref,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const href = appTarget(to);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>): void {
    onClick?.(event);
    const plain =
      event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
    if (event.defaultPrevented || !plain || (target !== undefined && target !== '_self')) return;
    event.preventDefault();
    // Like Link: following a link to the page already open replaces its history entry.
    const samePage = location.pathname === href && location.search === '' && location.hash === '';
    void navigate(href, { replace: replace ?? samePage, flushSync: true });
  }

  return <RouterLink ref={ref} to={href} target={target} replace={replace} onClick={handleClick} {...props} />;
});

/** navigate() for '/' or another project's root, under the same rule as AppLink (including the
 * synchronous update: a caller may still pass `flushSync: false` in `options`). */
export function useAppNavigate(): (to: string, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  return useCallback(
    (to, options) => {
      void navigate(appTarget(to), { flushSync: true, ...options });
    },
    [navigate],
  );
}

/** navigate() with the slug prefixed; a number (history delta) passes through. */
export function useProjectNavigate(): (to: To | number, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  const slug = useProjectSlug();
  const scope = useProjectScope();
  return useCallback(
    (to, options) => {
      if (typeof to === 'number') void navigate(to);
      else void navigate(prefixTo(slug, scope, to), options);
    },
    [navigate, slug, scope],
  );
}

/** The href for a raw anchor that needs a project page URL (a project-relative target). */
export function useProjectHref(to: string): string {
  return withProjectScope(useProjectSlug(), useProjectScope(), to);
}

/** The href for a raw anchor to the project's own address, outside any open workstream scope. */
export function useUnscopedProjectHref(to: string): string {
  return withProjectSlug(useProjectSlug(), to);
}

/** The location with the slug (and a workstream scope) taken off the pathname, so pages and query keys see the
 * same project-relative path they saw before the slug existed. Outside a project route it is the
 * location unchanged. */
export function useProjectLocation(): { pathname: string; search: string; hash: string; state: unknown } {
  const { pathname, search, hash, state } = useLocation();
  const slug = useProjectSlug();
  const scope = useProjectScope();
  if (slug === null) return { pathname, search, hash, state };
  const { rest } = splitProjectPath(pathname);
  return { pathname: scope === null ? rest : splitScope(rest).rest, search, hash, state };
}

export function useProjectPathname(): string {
  return useProjectLocation().pathname;
}
