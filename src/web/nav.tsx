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
// Everything below the router speaks project-relative paths ('/roadmap', '/milestones/...'): the
// wrappers add the slug on the way out, and the location hooks take it off on the way in.
import { forwardRef, useCallback } from 'react';
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
import { projectRootPath, splitProjectPath, withProjectSlug } from './project-path.ts';

/** The open project's slug: the `:project` route parameter, else null (a component rendered outside
 * the project route, such as in a bare MemoryRouter, stays unprefixed). Deliberately no react-query
 * here, so those components keep rendering without a QueryClient. */
export function useProjectSlug(): string | null {
  const params = useParams();
  return params.project ?? null;
}

/** Search-only and hash-only targets stay on the current page, so they pass through unprefixed. */
function isRelativeTail(value: string): boolean {
  return value.startsWith('?') || value.startsWith('#');
}

function prefixTo(slug: string | null, to: To): To {
  if (slug === null) return to;
  if (typeof to === 'string') return isRelativeTail(to) ? to : withProjectSlug(slug, to);
  if (to.pathname === undefined || to.pathname === '') return to;
  return { ...to, pathname: withProjectSlug(slug, to.pathname) };
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...props }, ref) {
  const slug = useProjectSlug();
  return <RouterLink ref={ref} to={prefixTo(slug, to)} {...props} />;
});

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, ...props },
  ref,
) {
  const slug = useProjectSlug();
  return <RouterNavLink ref={ref} to={prefixTo(slug, to)} {...props} />;
});

/** A target that names the landing page or one project, checked again here: '/' passes, '/' plus a
 * valid slug passes, anything else (a query, a path below a project, '//evil') is '/'. */
function appTarget(to: string): string {
  return to.startsWith('/') ? projectRootPath(to.slice(1)) : '/';
}

/** A link to '/' or to another project's root. Never prefixed with the current project's slug. */
export const AppLink = forwardRef<HTMLAnchorElement, Omit<LinkProps, 'to'> & { to: string }>(function AppLink(
  { to, ...props },
  ref,
) {
  return <RouterLink ref={ref} to={appTarget(to)} {...props} />;
});

/** navigate() for '/' or another project's root, under the same rule as AppLink. */
export function useAppNavigate(): (to: string, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  return useCallback(
    (to, options) => {
      void navigate(appTarget(to), options);
    },
    [navigate],
  );
}

/** navigate() with the slug prefixed; a number (history delta) passes through. */
export function useProjectNavigate(): (to: To | number, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  const slug = useProjectSlug();
  return useCallback(
    (to, options) => {
      if (typeof to === 'number') void navigate(to);
      else void navigate(prefixTo(slug, to), options);
    },
    [navigate, slug],
  );
}

/** The href for a raw anchor that needs a project page URL (a project-relative target). */
export function useProjectHref(to: string): string {
  return withProjectSlug(useProjectSlug(), to);
}

/** The location with the slug taken off the pathname, so pages and query keys see the same
 * project-relative path they saw before the slug existed. Outside a project route it is the
 * location unchanged. */
export function useProjectLocation(): { pathname: string; search: string; hash: string } {
  const { pathname, search, hash } = useLocation();
  const slug = useProjectSlug();
  return { pathname: slug === null ? pathname : splitProjectPath(pathname).rest, search, hash };
}

export function useProjectPathname(): string {
  return useProjectLocation().pathname;
}
