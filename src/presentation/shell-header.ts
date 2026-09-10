// Pure header helpers for the app shell (quick-260911-243). No DOM, no node:* imports, no React
// — this module must stay importable from tsconfig.server.json's test project, and presentation/
// must never depend on src/server, so state is typed structurally rather than imported.

/** Structural shape of the fields formatProjectMeta needs from ProjectStateDto (src/server/
 * project-presentation.ts). Typed here rather than imported so presentation stays server-free. */
export interface ProjectMetaState {
  milestone: string | null;
  phaseNumber: string | null;
  progress: {
    totalPhases: number | null;
    percent: number | null;
  };
}

const META_SEPARATOR = ' · ';

/** Derives the header brand's project name: the explicit projectName when present and non-blank,
 * otherwise the rootPath basename (split on both / and \, dropping empty trailing segments and a
 * final `.planning` segment), otherwise the fixed fallback. */
export function projectDisplayName(projectName: string | null, rootPath: string): string {
  if (projectName && projectName.trim().length > 0) return projectName;

  const segments = rootPath.split(/[/\\]/).filter((segment) => segment.length > 0);
  if (segments.length > 0 && segments[segments.length - 1] === '.planning') {
    segments.pop();
  }
  const basename = segments[segments.length - 1];
  if (basename) return basename;

  return 'Planning intelligence';
}

/** Formats the phase portion of the meta line: leading zeros are dropped from the integer part of
 * phaseNumber ('04' → '4', '02.1' → '2.1'), a non-numeric phaseNumber is shown as-is, and a null
 * totalPhases omits the "/total" suffix. Returns null when phaseNumber itself is null. */
function formatPhasePart(phaseNumber: string | null, totalPhases: number | null): string | null {
  if (phaseNumber === null) return null;

  const numericMatch = phaseNumber.match(/^(\d+)(\..*)?$/);
  const normalized = numericMatch
    ? `${Number.parseInt(numericMatch[1], 10)}${numericMatch[2] ?? ''}`
    : phaseNumber;

  if (totalPhases === null || !Number.isFinite(totalPhases)) return `Phase ${normalized}`;
  return `Phase ${normalized}/${totalPhases}`;
}

/** Builds the mono meta line under the brand's project name: 'milestone · Phase n/total ·
 * percent%', with any missing part omitted. Returns null when every part is missing (including a
 * null or empty milestone), or when state itself is null. */
export function formatProjectMeta(state: ProjectMetaState | null): string | null {
  if (state === null) return null;

  const parts: string[] = [];
  if (state.milestone && state.milestone.trim().length > 0) parts.push(state.milestone);

  const phasePart = formatPhasePart(state.phaseNumber, state.progress.totalPhases);
  if (phasePart !== null) parts.push(phasePart);

  if (state.progress.percent !== null && Number.isFinite(state.progress.percent)) {
    parts.push(`${Math.round(state.progress.percent)}%`);
  }

  if (parts.length === 0) return null;
  return parts.join(META_SEPARATOR);
}

/** Moved unchanged from app-shell.tsx: an invalid date returns the raw string, a valid one returns
 * toLocaleString(). */
export function formatReadAt(readAt: string): string {
  const parsed = new Date(readAt);
  return Number.isNaN(parsed.valueOf()) ? readAt : parsed.toLocaleString();
}

const JUST_NOW_THRESHOLD_MS = 60_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Formats readAt relative to nowMs: 'just now' under 60s (including a future readAt from clock
 * skew), otherwise floored '{m}m ago' / '{h}h ago' / '{d}d ago'. Returns null for an unparseable
 * readAt. */
export function formatRelativeReadAt(readAt: string, nowMs: number): string | null {
  const parsed = new Date(readAt);
  if (Number.isNaN(parsed.valueOf())) return null;

  const diffMs = Math.abs(nowMs - parsed.valueOf());
  if (diffMs < JUST_NOW_THRESHOLD_MS) return 'just now';

  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  return `${Math.floor(diffMs / DAY_MS)}d ago`;
}

interface SearchShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** True for the ⌘K/Ctrl+K search shortcut: key 'k' or 'K' with exactly one of metaKey/ctrlKey
 * held, and neither altKey nor shiftKey. */
export function isSearchShortcut(event: SearchShortcutEvent): boolean {
  if (event.altKey || event.shiftKey) return false;
  if (event.key !== 'k' && event.key !== 'K') return false;
  return event.metaKey || event.ctrlKey;
}

/** Returns the platform-appropriate shortcut hint text for navigator.platform. */
export function shortcutHintFor(platform: string): string {
  return /Mac|iPhone|iPad/.test(platform) ? '⌘K' : 'Ctrl K';
}

interface EditableTargetShape {
  tagName: string;
  isContentEditable: boolean;
}

const EDITABLE_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True when target is an editable form control or a contentEditable element; false for a
 * non-editable element or a null target. */
export function isEditableTarget(target: EditableTargetShape | null): boolean {
  if (target === null) return false;
  if (target.isContentEditable) return true;
  return EDITABLE_TAG_NAMES.has(target.tagName);
}
