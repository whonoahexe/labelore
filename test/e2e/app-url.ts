// Every address a spec opens is built here from what the served project reports, never hard-coded:
// the project slug comes from /api/presentation (NAV-09) and artifact addresses come from the DTO key
// of the artifact found by path, so the specs follow the server's URL grammar instead of pinning one.
// This is a helper, not a spec (testMatch is *.spec.ts).
import { withProjectSlug } from '../../src/web/project-path.ts';

/** The repo server the Playwright config starts; matches `use.baseURL` in playwright.config.ts. */
export const BASE_URL = 'http://127.0.0.1:4199';

interface PresentationLite {
  projectSlug?: string;
  artifacts?: { key: string; path: string }[];
}

const presentations = new Map<string, Promise<PresentationLite>>();

function presentationAt(base: string): Promise<PresentationLite> {
  let cached = presentations.get(base);
  if (cached === undefined) {
    cached = fetch(`${base}/api/presentation`).then(async (response) => {
      if (!response.ok) throw new Error(`app-url: ${base}/api/presentation responded ${response.status}`);
      return (await response.json()) as PresentationLite;
    });
    // A failed fetch must not poison later calls to the same base.
    cached.catch(() => presentations.delete(base));
    presentations.set(base, cached);
  }
  return cached;
}

/** Drops what was cached for `base`. A server that stops takes its payload with it: the next server may
 * be started on the same port (the fixture server reuses 5310 for every spec) with a different project. */
export function forgetPresentation(base: string): void {
  presentations.delete(base);
}

/** The project slug the server at `base` reports on /api/presentation. */
export async function projectSlugAt(base: string): Promise<string> {
  const { projectSlug } = await presentationAt(base);
  if (typeof projectSlug !== 'string' || projectSlug === '') {
    throw new Error(`No projectSlug at ${base}/api/presentation`);
  }
  return projectSlug;
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
