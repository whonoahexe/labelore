// The module that holds an /api/ URL for the several-projects web (PLAT-08). Every request goes
// through apiFetch, so a refused or unreachable server reads the same everywhere, and every write
// carries the JSON content type the server's request guard demands. The presentation, open and
// refresh calls of one project live here (08-08); 08-17 and 08-13 add the add, forget and scan
// mutations.
import type { ProjectListResponse } from '../presentation/project-list.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';

export const REFUSED_COPY =
  'Labelore refused this request because it did not come from its own page. Reload the page and try again.';
export const UNREACHABLE_COPY =
  'Labelore could not be reached. Check that it is still running, then try again.';

export type ApiErrorKind = 'refused' | 'unreachable' | 'http';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly body: unknown;

  constructor(kind: ApiErrorKind, message: string, status: number | null, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }
}

/** The URL of a project's API: `/api/projects/<slug><path>`. `path` starts with '/'. */
export function projectUrl(slug: string, path: string): string {
  if (!path.startsWith('/')) throw new Error(`A project API path starts with '/': ${path}`);
  return `/api/projects/${encodeURIComponent(slug)}${path}`;
}

export interface ApiInit {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function errorText(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('error' in body)) return null;
  const { error } = body as { error: unknown };
  return typeof error === 'string' && error !== '' ? error : null;
}

/** Fetches `url` as JSON. A network failure is an `unreachable` ApiError, a 403 a `refused` one, and
 * any other non-ok status an `http` one carrying the server's own error text when it sent any. */
export async function apiFetch<T>(url: string, init: ApiInit = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: string | undefined;
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body ?? {});
  }

  let response: Response;
  try {
    response = await fetch(url, { method, headers, ...(body === undefined ? {} : { body }) });
  } catch {
    throw new ApiError('unreachable', UNREACHABLE_COPY, null, null);
  }

  if (response.status === 403) throw new ApiError('refused', REFUSED_COPY, 403, await readBody(response));
  if (!response.ok) {
    const failure = await readBody(response);
    throw new ApiError('http', errorText(failure) ?? `Request failed (${response.status})`, response.status, failure);
  }
  return (await response.json()) as T;
}

/** The registry's project list: every remembered project, in the order the server sends. */
export function fetchProjects(): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>('/api/projects');
}

/** One project's presentation payload, read from that project's own API (never a shared route). */
export async function fetchPresentation(slug: string): Promise<ProjectPresentation> {
  return await apiFetch<ProjectPresentation>(projectUrl(slug, '/presentation'));
}

export interface OpenProjectResponse {
  slug: string;
  state: string;
}

export interface RefreshProjectResponse {
  refreshed: boolean;
  readAt?: string;
  loadStatus?: unknown;
}

/** Stamps the project as opened now (D-08). The server keeps no active project: this only records
 * when the project was last opened, so the list can order by it. */
export function openProject(slug: string): Promise<OpenProjectResponse> {
  return apiFetch<OpenProjectResponse>(projectUrl(slug, '/open'), { method: 'POST' });
}

/** Asks the server to re-read one project (08-09 wires it into the snapshot pill). */
export function refreshProject(slug: string): Promise<RefreshProjectResponse> {
  return apiFetch<RefreshProjectResponse>(projectUrl(slug, '/refresh'), { method: 'POST' });
}
