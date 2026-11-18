// The render pin's collector: every artifact of every committed fixture project, fetched through a running
// server over real HTTP, reduced to one hash per document. Both runners of render-identity.test.ts (the
// in-process source server and the built bundle) call it, so they are compared by the same instrument.
//
// A manifest key is `<repo-relative root>::<artifact path>`, so two roots that hold the same artifact path
// never collide. A value is `sha256:<hex>` of the served `document` (html, headings, warnings, empty,
// references) with the absolute repo root replaced by `<repo>`, or `status:<code>` when the document
// endpoint does not answer 200 with a document. Only `document` is hashed: the rest of the response
// carries mtimes and git-derived dates that differ between clones.
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { relative } from 'node:path';
import { REPO_ROOT } from './server-bundle.ts';

export interface CollectOptions {
  /** `http://127.0.0.1:<port>` of a running server. */
  base: string;
  /** Absolute fixture roots. Each must be a project of that server. */
  roots: readonly string[];
  /** The most document requests in flight at once. */
  concurrency?: number;
}

interface ProjectListBody {
  projects: { slug: string; target: string }[];
}

interface PresentationBody {
  artifacts: { path: string; key: string }[];
}

interface DocumentBody {
  document?: unknown;
}

const PLACEHOLDER = '<repo>';

function repoPaths(): string[] {
  const real = realpathSync(REPO_ROOT);
  return real === REPO_ROOT ? [REPO_ROOT] : [real, REPO_ROOT];
}

function scrub(text: string): string {
  let out = text;
  for (const path of repoPaths()) out = out.split(path).join(PLACEHOLDER);
  return out;
}

async function getJson<T>(base: string, path: string): Promise<{ status: number; body: T | null }> {
  const response = await fetch(`${base}${path}`, { headers: { Host: new URL(base).host } });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) as T };
  } catch {
    return { status: response.status, body: null };
  }
}

/** Runs `task` over `items` with at most `limit` in flight; results keep the input order. */
async function mapLimited<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function collectRenderCorpus(options: CollectOptions): Promise<Record<string, string>> {
  const { base, roots, concurrency = 8 } = options;
  const list = await getJson<ProjectListBody>(base, '/api/projects');
  if (list.status !== 200 || !list.body) throw new Error(`GET /api/projects answered ${list.status}`);
  const slugByTarget = new Map(list.body.projects.map((project) => [realpathSync(project.target), project.slug]));

  const entries: { key: string; slug: string; route: string }[] = [];
  for (const root of roots) {
    const slug = slugByTarget.get(realpathSync(root));
    if (!slug) throw new Error(`fixture root ${root} is not a project of the server at ${base}`);
    const presentation = await getJson<PresentationBody>(base, `/api/projects/${slug}/presentation`);
    if (presentation.status !== 200 || !presentation.body) {
      throw new Error(`presentation of ${root} answered ${presentation.status}`);
    }
    const { artifacts } = presentation.body;
    if (artifacts.length === 0) throw new Error(`fixture root ${root} lists no artifacts`);
    const prefix = relative(REPO_ROOT, root).split('\\').join('/');
    for (const artifact of artifacts) {
      entries.push({ key: `${prefix}::${artifact.path}`, slug, route: artifact.key });
    }
  }

  const values = await mapLimited(entries, concurrency, async (entry) => {
    const answer = await getJson<DocumentBody>(
      base,
      `/api/projects/${entry.slug}/documents?route=${encodeURIComponent(entry.route)}`,
    );
    if (answer.status !== 200 || !answer.body || answer.body.document === undefined) {
      return `status:${answer.status}`;
    }
    const digest = createHash('sha256').update(scrub(JSON.stringify(answer.body.document))).digest('hex');
    return `sha256:${digest}`;
  });

  const corpus: Record<string, string> = {};
  entries.forEach((entry, index) => {
    if (entry.key in corpus) throw new Error(`duplicate manifest key ${entry.key}`);
    corpus[entry.key] = values[index];
  });
  return corpus;
}

/** The manifest text: keys in sorted order, 2-space indent, trailing newline. */
export function serializeCorpus(corpus: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(corpus).sort()) sorted[key] = corpus[key];
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/** The sum of `artifacts.length` over every root's presentation response: how many keys a full pin holds. */
export async function countArtifacts(base: string, roots: readonly string[]): Promise<number> {
  const list = await getJson<ProjectListBody>(base, '/api/projects');
  if (list.status !== 200 || !list.body) throw new Error(`GET /api/projects answered ${list.status}`);
  const slugByTarget = new Map(list.body.projects.map((project) => [realpathSync(project.target), project.slug]));
  let total = 0;
  for (const root of roots) {
    const slug = slugByTarget.get(realpathSync(root));
    if (!slug) throw new Error(`fixture root ${root} is not a project of the server at ${base}`);
    const presentation = await getJson<PresentationBody>(base, `/api/projects/${slug}/presentation`);
    if (presentation.status !== 200 || !presentation.body) throw new Error(`presentation of ${root} answered ${presentation.status}`);
    total += presentation.body.artifacts.length;
  }
  return total;
}
