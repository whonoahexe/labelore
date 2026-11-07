// The only place a react-query key is built (PLAT-08). Two shapes exist: the project list, and
// everything that belongs to one project. Every key under a project starts with its slug, so two
// projects can never share a cache entry (research Pitfall 1); 08-12 adds the standing scan that
// enforces it across src/web. Inside a workstream the scope follows the slug, so two workstreams of
// one project can never share an entry either (Phase 11, T-11-48).

/** The registry's project list (GET /api/projects). */
export const projectsKey = ['projects'] as const;

/** A key under one project: `['project', slug, ...rest]`, or `['project', slug, 'ws', name, ...rest]` inside a
 * workstream scope. The scope is a required argument (null for a flat project) so a page cannot forget it;
 * a flat project's keys are exactly what they were before scopes existed. */
export function projectKey(slug: string, scope: string | null, ...rest: readonly unknown[]): readonly unknown[] {
  return scope === null ? (['project', slug, ...rest] as const) : (['project', slug, 'ws', scope, ...rest] as const);
}

/** The prefix of everything cached for one project, every workstream scope included: what a refresh
 * invalidates and what forgetting a project removes. Never used to read or write an entry. */
export function projectWideKey(slug: string): readonly unknown[] {
  return ['project', slug] as const;
}
