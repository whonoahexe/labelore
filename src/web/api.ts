// The module that holds an /api/ URL for the several-projects web (PLAT-08). Every request goes
// through apiFetch, so a refused or unreachable server reads the same everywhere, and every write
// carries the JSON content type the server's request guard demands. The presentation, open and
// refresh calls of one project live here (08-08); the add and forget calls are 08-17's, the scan
// and bulk-add calls 08-13's.
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
  /** Lets a caller abort the request (react-query hands one to every query function). */
  signal?: AbortSignal;
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
    response = await fetch(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body }),
      ...(init.signal === undefined ? {} : { signal: init.signal }),
    });
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

export interface AddProjectResponse {
  slug: string;
  name: string;
  /** True when the target was already in the list: nothing was created. */
  duplicate: boolean;
}

/** Adds a folder or an ssh:// target to the remembered list (D-09, D-13). The server validates it once
 * (D-17): a target it cannot read is a 422 whose body keeps `{ error, status }`, an empty or malformed
 * one a 400, and both reach the caller as an `http` ApiError carrying the server's own message. */
export async function addProject(target: string): Promise<AddProjectResponse> {
  return await apiFetch<AddProjectResponse>('/api/projects', { method: 'POST', body: { target } });
}

export interface ForgetProjectResponse {
  forgotten: string;
}

/** Removes a project from Labelore's list only (D-10): the server edits its own settings file and
 * touches nothing in the project. A settings write failure is a 500 carrying the save-failure copy. */
export async function forgetProject(slug: string): Promise<ForgetProjectResponse> {
  return await apiFetch<ForgetProjectResponse>('/api/projects/' + encodeURIComponent(slug), {
    method: 'DELETE',
    body: {},
  });
}

/** One GSD project a scan found (the server's `ScanFound`, restated here so the web imports no server module). */
export interface ScannedProject {
  /** The canonical path of the project folder: what add-many is sent. */
  path: string;
  /** The same path home-shortened, for display. */
  displayPath: string;
  name: string;
  /** True when the list already holds this project: it is shown, not selectable. */
  alreadyAdded: boolean;
}

export interface ScanFolderResponse {
  /** The folder as the person will read it (home-shortened). */
  folder: string;
  found: ScannedProject[];
  /** True when the scan stopped at the result cap. */
  capped: boolean;
  cap: number;
}

/** Looks for GSD projects two levels below a folder inside home (D-15). Runs only when called, never at
 * startup (D-16). A folder the server refuses (outside home, missing, a file, unreadable, empty) is a 422
 * or 400 `http` ApiError carrying the server's own message. */
export async function scanFolder(folder: string): Promise<ScanFolderResponse> {
  return await apiFetch<ScanFolderResponse>('/api/projects/scan', { method: 'POST', body: { folder } });
}

export interface AddProjectsResult {
  target: string;
  slug?: string;
  duplicate?: boolean;
  /** The server's own words when this one target could not be added. */
  error?: string;
}

export interface AddProjectsResponse {
  /** How many targets became new entries (a duplicate adds nothing). */
  added: number;
  results: AddProjectsResult[];
}

/** Remembers the picked projects without loading them (D-14). Each target goes through the server's one
 * add path; the server refuses more than 100. */
export async function addProjects(targets: readonly string[]): Promise<AddProjectsResponse> {
  return await apiFetch<AddProjectsResponse>('/api/projects/add-many', { method: 'POST', body: { targets } });
}
