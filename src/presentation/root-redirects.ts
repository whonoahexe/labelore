// The one table of root documents that already have a designed page (09 D-01): STATE.md opens on the
// dashboard, REQUIREMENTS.md on traceability, MILESTONES.md and RETROSPECTIVE.md on the roadmap's History,
// and ROADMAP.md stays the roadmap page. Route dispatch, the view registry and search all read this
// table, so they cannot disagree about which file lives where.
//
// A redirected file's raw text stays reachable through a query flag on its own address (`?source=1`, the
// user-confirmed replacement for UI-SPEC section 2's `file/` wording, research A3 and A8). The flag only
// skips the redirect for an address an artifact already carries; it never reveals a file.
//
// Pure: no Node imports, no React, never throws. The redirect is chosen by the artifact's location 'root'
// plus its exact file name, never by kind alone, so a research/STATE.md or a STATE.md inside a phase
// folder still opens as a document (the T-07-04 precedent).
import { parseMilestoneFileName } from '../planning-repo/naming.ts';
import type { ArtifactDto, ProjectPresentation } from '../server/project-presentation.ts';
import { projectedArchiveVersion } from './traceability.ts';

export interface RootDocumentTarget {
  /** The exact file name under `.planning/`. */
  fileName: string;
  /** The artifact kind the handler gives that file. */
  kind: string;
  /** The project-relative address the file opens on. */
  to: string;
  /** How a sentence names that page: "The file behind the dashboard, as written." */
  pageLabel: string;
}

export const ROOT_DOCUMENT_TARGETS: readonly RootDocumentTarget[] = [
  { fileName: 'STATE.md', kind: 'state', to: '/', pageLabel: 'the dashboard' },
  { fileName: 'REQUIREMENTS.md', kind: 'requirements', to: '/traceability', pageLabel: 'traceability' },
  { fileName: 'MILESTONES.md', kind: 'milestones', to: '/roadmap#history', pageLabel: 'the roadmap history' },
  {
    fileName: 'RETROSPECTIVE.md',
    kind: 'retrospective',
    to: '/roadmap#history',
    pageLabel: 'the roadmap history',
  },
  { fileName: 'ROADMAP.md', kind: 'roadmap', to: '/roadmap', pageLabel: 'the roadmap' },
];

/** The query parameter that opens a root document's own file instead of its designed page. */
export const SOURCE_FLAG = 'source';

/** True only for `?source=1`; any other value (`0`, `true`, empty) is ignored. */
export function hasSourceFlag(search: string): boolean {
  try {
    return new URLSearchParams(search).get(SOURCE_FLAG) === '1';
  } catch {
    return false;
  }
}

type ArtifactAddress = Pick<ArtifactDto, 'key' | 'path' | 'location'>;

function fileNameOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

/** The table row an artifact is, or null. Location 'root' plus the exact file name; never kind alone. */
function rootRowOf(artifact: ArtifactAddress | undefined): RootDocumentTarget | null {
  if (!artifact || artifact.location !== 'root' || typeof artifact.path !== 'string') return null;
  const fileName = fileNameOf(artifact.path);
  return ROOT_DOCUMENT_TARGETS.find((row) => row.fileName === fileName) ?? null;
}

/**
 * The address a root document redirects to, or null when it opens as a document. ROADMAP.md returns null:
 * its key already is the roadmap page.
 */
export function rootDocumentRedirect(artifact: ArtifactAddress | undefined): string | null {
  const row = rootRowOf(artifact);
  if (row === null || row.fileName === 'ROADMAP.md') return null;
  return row.to;
}

/**
 * The address that opens the file itself: `<key>?source=1` for a root document that redirects and for the
 * root ROADMAP.md, null for anything else. The only place the Source address is built.
 */
export function sourceUrlOf(
  artifact: ArtifactAddress | ArtifactDto | undefined,
  presentation?: ProjectPresentation,
): string | null {
  if (artifact === undefined) return null;
  if (rootRowOf(artifact) === null) {
    // 09 D-02: an archived copy that opens on its live page keeps a way to its own file. Needs the payload
    // (the History block must exist), so a caller without one never gets a Source address for it.
    if (presentation === undefined || !('structured' in artifact)) return null;
    if (archivedCopyTarget(artifact, presentation) === null) return null;
  }
  return `${artifact.key}?${SOURCE_FLAG}=1`;
}

/** Which live page an archived milestone document opens on, and the milestone block it lands on. */
export interface ArchivedCopyTarget {
  page: 'roadmap' | 'traceability';
  version: string;
}

/**
 * 09 D-02: an archived copy under `milestones/` (`v1.0-ROADMAP.md`, `v1.0-REQUIREMENTS.md`) opens on its
 * live counterpart, at its milestone's block. The archived ROADMAP needs an archived milestone of that
 * version in the payload (so a History block exists); the archived REQUIREMENTS needs the traceability
 * projection to show it (`projectedArchiveVersion`). Anything else returns null and stays a document.
 * Both values come from the payload, never from the address (T-09-12).
 */
export function archivedCopyTarget(
  artifact: ArtifactDto | undefined,
  presentation: ProjectPresentation,
): ArchivedCopyTarget | null {
  if (!artifact || artifact.location !== 'milestone-root' || typeof artifact.path !== 'string') return null;
  const segments = artifact.path.split('/');
  // Directly under .planning/milestones/: `milestones/<file>` (or `.planning/milestones/<file>`).
  const name = segments[segments.length - 1] ?? '';
  const parent = segments[segments.length - 2];
  if (parent !== 'milestones') return null;
  const parsed = parseMilestoneFileName(name);
  if (!parsed.matched) return null;
  const document = parsed.document.toUpperCase();
  if (document === 'ROADMAP') {
    const milestone = presentation.milestones.find(
      (candidate) => candidate.archived && candidate.version?.toLowerCase() === parsed.version.toLowerCase(),
    );
    return milestone ? { page: 'roadmap', version: milestone.version ?? parsed.version } : null;
  }
  if (document === 'REQUIREMENTS') {
    const version = projectedArchiveVersion(artifact);
    return version === null ? null : { page: 'traceability', version };
  }
  return null;
}

/** The kinds of the five root documents designed elsewhere. */
export const DESIGNED_ELSEWHERE_KINDS: ReadonlySet<string> = new Set(
  ROOT_DOCUMENT_TARGETS.map((row) => row.kind),
);

/** The plain lead the escape page shows in place of the "no dedicated view" notice, or null for any other kind. */
export function designedElsewhereLead(kind: string): string | null {
  const row = ROOT_DOCUMENT_TARGETS.find((candidate) => candidate.kind === kind);
  return row ? `The file behind ${row.pageLabel}, as written.` : null;
}
