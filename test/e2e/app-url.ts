// Every address a spec opens is built here from what the served project reports, never hard-coded:
// the project slug comes from the project list (NAV-09), the payload from that project's own API, and
// artifact addresses come from the DTO key of the artifact found by path, so the specs follow the
// server's URL grammar instead of pinning one. Each server in these specs holds exactly one project.
// This is a helper, not a spec (testMatch is *.spec.ts).
import { withProjectSlug } from '../../src/web/project-path.ts';

/** The repo server the Playwright config starts; matches `use.baseURL` in playwright.config.ts. */
export const BASE_URL = 'http://127.0.0.1:4199';

interface PresentationLite {
  projectSlug?: string;
  artifacts?: { key: string; path: string }[];
}

const slugs = new Map<string, Promise<string>>();
const presentations = new Map<string, Promise<PresentationLite>>();

function slugAt(base: string): Promise<string> {
  let cached = slugs.get(base);
  if (cached === undefined) {
    cached = fetch(`${base}/api/projects`).then(async (response) => {
      if (!response.ok) throw new Error(`app-url: ${base}/api/projects responded ${response.status}`);
      const { projects } = (await response.json()) as { projects: { slug: string }[] };
      if (projects.length !== 1) {
        throw new Error(`Expected exactly one project at ${base}/api/projects, found ${projects.length}`);
      }
      return projects[0].slug;
    });
    // A failed fetch must not poison later calls to the same base.
    cached.catch(() => slugs.delete(base));
    slugs.set(base, cached);
  }
  return cached;
}

function presentationAt(base: string): Promise<PresentationLite> {
  let cached = presentations.get(base);
  if (cached === undefined) {
    cached = projectApiUrl(base, '/presentation').then(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`app-url: ${url} responded ${response.status}`);
      return (await response.json()) as PresentationLite;
    });
    cached.catch(() => presentations.delete(base));
    presentations.set(base, cached);
  }
  return cached;
}

/** Drops what was cached for `base`. A server that stops takes its payload with it: the next server may
 * be started on the same port (the fixture server reuses 5310 for every spec) with a different project. */
export function forgetPresentation(base: string): void {
  slugs.delete(base);
  presentations.delete(base);
}

/** The slug of the one project the server at `base` lists. */
export async function projectSlugAt(base: string): Promise<string> {
  return slugAt(base);
}

/** The full address of one of the project's own API routes (`path` starts with `/`, e.g. `/presentation`). */
export async function projectApiUrl(base: string, path: string): Promise<string> {
  if (!path.startsWith('/')) throw new Error(`projectApiUrl: path must start with '/', got ${path}`);
  return `${base}/api/projects/${encodeURIComponent(await slugAt(base))}${path}`;
}

/** The full address of a project-relative target (a page path or a DTO key) on the server at `base`. */
export async function projectUrl(base: string, projectRelative: string): Promise<string> {
  return `${base}${withProjectSlug(await projectSlugAt(base), projectRelative)}`;
}

/** The full address of the artifact whose project-relative path is `path` on the server at `base`. */
export async function artifactUrl(base: string, path: string): Promise<string> {
  const { artifacts } = await presentationAt(base);
  const artifact = artifacts?.find((entry) => entry.path === path);
  if (artifact === undefined) throw new Error(`No artifact ${path} at ${base}`);
  return projectUrl(base, artifact.key);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A toHaveURL pattern for `url` (from projectUrl or artifactUrl): the whole address, allowing a
 * trailing query or hash, so the assertion compares with the DTO key and pins no URL shape. */
export function exactUrl(url: string): RegExp {
  return new RegExp(`^${escapeRegExp(url)}(?:[?#].*)?$`);
}

/** A toHaveAttribute('href') pattern for `url`: the address as a link renders it, which is the path
 * without the origin, allowing a trailing hash or query. */
export function hrefOf(url: string): RegExp {
  const { pathname } = new URL(url);
  return new RegExp(`${escapeRegExp(pathname)}(?:[?#].*)?$`);
}
