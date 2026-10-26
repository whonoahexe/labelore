// NAV-09: the single place the project slug is prefixed. Every Link, NavLink, navigate call,
// pathname reader and raw href in the web goes through this module; ESLint (no-restricted-imports)
// and test/web/nav-contract.test.ts fail on a router link anywhere else. Phase 8 swaps the slug
// source (useProjectSlug) here and nowhere else.
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
import { splitProjectPath, withProjectSlug } from './project-path.ts';

/** Overrides the route parameter. The router gate provides the open project's slug here when the
 * address named another project, so the shell's links still lead into the project that is open. */
const ProjectSlugContext = createContext<string | null>(null);

export const ProjectSlugProvider = ProjectSlugContext.Provider;

/** The open project's slug: the override above, else the `:project` route parameter, else null (a
 * component rendered outside the project route, such as in a bare MemoryRouter, stays unprefixed).
 * Deliberately no react-query here, so those components keep rendering without a QueryClient. */
export function useProjectSlug(): string | null {
  const override = useContext(ProjectSlugContext);
  const params = useParams();
  return override ?? params.project ?? null;
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
