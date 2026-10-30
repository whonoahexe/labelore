// The only place a react-query key is built (PLAT-08). Two shapes exist: the project list, and
// everything that belongs to one project. Every key under a project starts with its slug, so two
// projects can never share a cache entry (research Pitfall 1); 08-12 adds the standing scan that
// enforces it across src/web.

/** The registry's project list (GET /api/projects). */
export const projectsKey = ['projects'] as const;

/** A key under one project: `['project', slug, ...rest]`. */
export function projectKey(slug: string, ...rest: readonly unknown[]): readonly unknown[] {
  return ['project', slug, ...rest] as const;
}
