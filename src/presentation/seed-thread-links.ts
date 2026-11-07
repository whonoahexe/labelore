// The seed and thread links context (Phase 11, 11-22, VIEW-15; read again by 11-23 for threads). A seed's
// Breadcrumbs and a thread's References are bullets the author wrote: usually "`path` - a few words", sometimes
// prose with no path at all. This module turns each bullet into the facts the page draws - the path, the words
// beside it and the in-app address of the payload artifact the path names, else null. Only a path that names an
// artifact of this project's payload resolves; anything else (a source file outside `.planning/`, a path that
// moved, a sentence) stays text, so the page can never link to an address built from author text (T-11-36).
//
// Pure: it reads the cached `ProjectPresentation`, never a file, and never throws on presentation data (any
// failure gives null). A path is tried three ways, in order: exactly as written (repository relative), under
// `.planning/`, and - for a bare file name with no folder - by name when exactly one artifact carries it. A path
// that climbs out of the project (`..`) or starts at the filesystem root never resolves.
import type { ArtifactDto, ProjectPresentation } from '../server/project-presentation.ts';

const PLANNING_PREFIX = '.planning/';
const DASHES: readonly string[] = ['—', '–', '-', ':'];

export interface SeedThreadLink {
  /** The bullet as the author wrote it. */
  text: string;
  /** The path the bullet leads with, as written (without the backticks), else null for prose. */
  path: string | null;
  /** The words beside the path, else null. */
  description: string | null;
  /** The in-app address of the artifact the path names, else null. */
  url: string | null;
}

export interface SeedThreadLinks {
  kind: 'seed' | 'thread';
  /** The day the project was read, so the page counts ages to it and never to the browser's clock. */
  readAt: string;
  /** A seed's Breadcrumbs, in the author's order; [] for a thread. */
  breadcrumbs: SeedThreadLink[];
  /** A thread's References, in the author's order; [] for a seed. */
  references: SeedThreadLink[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** True when `text` reads as a file path: no blank, and a folder slash or a dotted file name. */
function looksLikePath(text: string): boolean {
  if (text === '' || text.includes(' ')) return false;
  if (text.includes('/')) return true;
  const dot = text.lastIndexOf('.');
  return dot > 0 && dot < text.length - 1;
}

/** Drops the dash (or colon) that joins a path to its words, with the blanks around it. */
function afterDash(rest: string): string {
  let text = rest.trim();
  for (const dash of DASHES) {
    if (text.startsWith(dash)) {
      text = text.slice(dash.length).trim();
      break;
    }
  }
  return text;
}

/** Splits one bullet into its leading path (when it has one) and the words beside it. */
export function splitLinkText(text: string): { path: string | null; description: string | null } {
  const trimmed = text.trim();
  if (trimmed.startsWith('`')) {
    const close = trimmed.indexOf('`', 1);
    if (close > 1) {
      const path = trimmed.slice(1, close).trim();
      const description = afterDash(trimmed.slice(close + 1));
      return { path: path === '' ? null : path, description: description === '' ? null : description };
    }
  }
  const dashAt = trimmed.indexOf(' — ');
  const head = dashAt > 0 ? trimmed.slice(0, dashAt) : trimmed;
  if (looksLikePath(head)) {
    const description = dashAt > 0 ? trimmed.slice(dashAt + 3).trim() : '';
    return { path: head, description: description === '' ? null : description };
  }
  return { path: null, description: null };
}

function clean(path: string): string | null {
  let value = path.trim();
  const hash = value.indexOf('#');
  if (hash >= 0) value = value.slice(0, hash);
  while (value.startsWith('./')) value = value.slice(2);
  while (value.endsWith('/')) value = value.slice(0, -1);
  if (value === '' || value.startsWith('/') || value.includes('\\')) return null;
  if (value.split('/').includes('..')) return null;
  return value;
}

interface Lookup {
  byPath: Map<string, ArtifactDto>;
  byName: Map<string, ArtifactDto | null>;
}

function lookupOf(artifacts: readonly ArtifactDto[]): Lookup {
  const byPath = new Map<string, ArtifactDto>();
  const byName = new Map<string, ArtifactDto | null>();
  for (const artifact of artifacts) {
    byPath.set(artifact.path, artifact);
    const name = artifact.path.slice(artifact.path.lastIndexOf('/') + 1);
    // A file name two artifacts share names neither of them.
    byName.set(name, byName.has(name) ? null : artifact);
  }
  return { byPath, byName };
}

function resolve(lookup: Lookup, path: string | null): ArtifactDto | null {
  if (path === null) return null;
  const value = clean(path);
  if (value === null) return null;
  const exact = lookup.byPath.get(value);
  if (exact !== undefined) return exact;
  if (!value.startsWith(PLANNING_PREFIX)) {
    const planning = lookup.byPath.get(`${PLANNING_PREFIX}${value}`);
    if (planning !== undefined) return planning;
  }
  if (!value.includes('/')) return lookup.byName.get(value) ?? null;
  return null;
}

function linkOf(lookup: Lookup, text: string): SeedThreadLink {
  const { path, description } = splitLinkText(text);
  const found = resolve(lookup, path);
  return { text, path, description, url: found === null ? null : found.key };
}

/**
 * The resolved Breadcrumbs of the seed (or References of the thread) at `artifactPath`, or null when that path is
 * not a seed or a thread in the presentation or carries no lift.
 */
export function buildSeedThreadLinks(presentation: ProjectPresentation, artifactPath: string): SeedThreadLinks | null {
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const active = artifacts.find((candidate) => candidate.path === artifactPath);
    if (active === undefined) return null;
    const lookup = lookupOf(artifacts);
    if (active.kind === 'seed') {
      const seed = isRecord(active.structured) ? active.structured.seed : undefined;
      if (!isRecord(seed)) return null;
      return {
        kind: 'seed',
        readAt: presentation.readAt,
        breadcrumbs: stringsOf(seed.breadcrumbs).map((text) => linkOf(lookup, text)),
        references: [],
      };
    }
    if (active.kind === 'thread') {
      const thread = isRecord(active.structured) ? active.structured.thread : undefined;
      if (!isRecord(thread)) return null;
      return {
        kind: 'thread',
        readAt: presentation.readAt,
        breadcrumbs: [],
        references: stringsOf(thread.references).map((text) => linkOf(lookup, text)),
      };
    }
    return null;
  } catch {
    return null;
  }
}
