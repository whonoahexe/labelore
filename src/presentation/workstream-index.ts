// The workstream index model (Phase 11, 11-31, VIEW-20; sketch 056 C "Shared root"; D-10, D-12, D-13). In workstream
// mode the project's first screen is a tree: the project head, the root node with the files every workstream
// shares, one branch per workstream, and a closed bar of the completed ones. This module turns the inventory the
// server returns (src/server/workstreams.ts) and the project's own presentation into plain values the page draws;
// it holds every sentence the page shows, so a test pins the wording without a browser.
//
// Pure: no node:* or React imports, total over its input, and it reads nothing it was not handed. Everything
// that came off disk (names, status words, phase names) is carried as text and never interpreted. Nothing is
// derived across facts: phases and plans are separate counts, "Active" comes only from the active-workstream
// pointer the inventory already validated, and a missing roadmap or STATE is a fact about the folder, not a guess.
import type { ProjectPresentation } from '../server/project-presentation.ts';
import type { WorkstreamEntry, WorkstreamInventory } from '../server/workstreams.ts';
import { projectSectionLead, splitProjectTitle } from './dashboard-head.ts';
import { addressOfPath } from './routes.ts';

export const WORKSTREAM_EYEBROW = 'Project · workstream mode';
export const ROOT_NODE_LABEL = 'Shared by every workstream · .planning/';
export const NO_ROADMAP_LABEL = 'No roadmap yet';
export const NOT_A_FOLDER_LABEL = 'Not a workstream folder';
export const COMPLETED_LABEL = 'Completed';
export const NO_POINTER_LINE =
  'No active workstream on disk: GSD keeps the active one per agent session, which Labelore cannot see.';

/** The most own-file chips one branch draws; the rest are counted. */
const MAX_OWN_CHIPS = 12;

export type WorkstreamTone = 'complete' | 'in-flight' | 'quiet';

/** A run of a sentence, so the page can set a name in bold and a path in code without parsing text. */
export interface TextSegment {
  text: string;
  style: 'plain' | 'name' | 'code';
}

export interface WorkstreamFileChip {
  /** The text on the chip, e.g. `ROADMAP.md` or `phases/ (2)`. */
  label: string;
  /** The project-relative address of the file's page, or null when the chip is text only. */
  url: string | null;
}

export interface WorkstreamBranch {
  name: string;
  /** The project-relative address of the workstream's own dashboard; null for an entry that is not a folder. */
  url: string | null;
  /** True only when the active-workstream pointer names this workstream. */
  active: boolean;
  /** A dashed branch: no roadmap yet, or not a workstream folder. */
  dashed: boolean;
  /** The sentence a dashed branch carries ("No roadmap yet"), or null. */
  dashedLabel: string | null;
  /** The status word as STATE wrote it, with the tone it is drawn in. */
  status: { word: string; tone: WorkstreamTone } | null;
  /** "Phase N" and the phase name from the workstream's ROADMAP. */
  phase: { label: string; name: string | null } | null;
  /** The phase ring: done and total phases from STATE. Null with no roadmap or no counts. */
  ring: { done: number; total: number; text: string; label: string; fraction: number } | null;
  /** The plans status-meter: done and total plans from STATE. */
  plans: { done: number; total: number; label: string } | null;
  /** Shown only when every plan is done and STATE marks fewer phases complete (two facts, neither derived). */
  note: string | null;
  files: WorkstreamFileChip[];
  /** How many own files the chips left out. */
  filesLeftOut: number;
}

export interface WorkstreamCompletedRow {
  name: string;
  folder: string;
  phasesText: string;
}

export interface WorkstreamIndexModel {
  head: { eyebrow: string; name: string; lead: string | null };
  /** The pointer line under the head. */
  pointer: { state: 'present' | 'absent' | 'stale'; name: string | null; segments: TextSegment[]; text: string };
  /** The header count, "3 workstreams" ("1 workstream"). */
  countText: string;
  root: {
    label: string;
    name: string;
    files: WorkstreamFileChip[];
    /** "active-workstream → {name}" or "no active-workstream file". */
    pointerText: string;
  };
  branches: WorkstreamBranch[];
  /** The closed Completed bar, or null when no workstream was completed. */
  completed: { label: string; countText: string; rows: WorkstreamCompletedRow[] } | null;
  /** The one notice of a half-migrated project, or null. */
  midMigration: string | null;
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** The header count: "3 workstreams", "1 workstream". Folders only: an entry that is a file is not a workstream. */
export function workstreamCountText(inventory: WorkstreamInventory): string {
  return plural(inventory.entries.filter((entry) => entry.kind === 'folder').length, 'workstream', 'workstreams');
}

function join(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function textOf(segments: TextSegment[]): string {
  return segments.map((segment) => segment.text).join('');
}

function pointerOf(active: WorkstreamInventory['active']): WorkstreamIndexModel['pointer'] {
  const name = active.name;
  let segments: TextSegment[];
  if (active.state === 'present' && name !== null) {
    segments = [
      { text: 'Active workstream ', style: 'plain' },
      { text: name, style: 'name' },
      { text: ', from ', style: 'plain' },
      { text: '.planning/active-workstream', style: 'code' },
    ];
  } else if (active.state === 'stale' && name !== null) {
    segments = [
      { text: 'active-workstream', style: 'code' },
      { text: ' names ', style: 'plain' },
      { text: name, style: 'name' },
      { text: ', which is not in workstreams/.', style: 'plain' },
    ];
  } else {
    return { state: 'absent', name: null, segments: [{ text: NO_POINTER_LINE, style: 'plain' }], text: NO_POINTER_LINE };
  }
  return { state: active.state, name, segments, text: textOf(segments) };
}

/** The shared root files a workstream project can have, in the order the sketch draws them. */
const SHARED_FILES = ['PROJECT.md', 'config.json'] as const;
const SHARED_DIRS = ['milestones', 'research', 'codebase', 'todos'] as const;
/** The folder GSD archives a completed workstream into (the inventory's own pattern). */
const ARCHIVE_FOLDER = /^ws-.+-\d{4}-\d{2}-\d{2}(?:-\d{1,3})?$/;

/** The files present at the root of `.planning/` that every workstream shares. A file chip links to the page the
 * presentation gave that file; a folder chip is text. `milestones/` counts only when it holds something other than
 * the workstream archives, which the Completed bar already lists. */
export function sharedRootFiles(artifacts: ProjectPresentation['artifacts']): WorkstreamFileChip[] {
  const files = new Map<string, string | null>();
  const dirs = new Set<string>();
  for (const artifact of artifacts) {
    if (!artifact.path.startsWith('.planning/')) continue;
    const rest = artifact.path.slice('.planning/'.length);
    const slash = rest.indexOf('/');
    if (slash < 0) {
      if ((SHARED_FILES as readonly string[]).includes(rest)) files.set(rest, artifact.key);
      continue;
    }
    const dir = rest.slice(0, slash);
    if (!(SHARED_DIRS as readonly string[]).includes(dir)) continue;
    if (dir === 'milestones') {
      const child = rest.slice(slash + 1).split('/')[0];
      if (ARCHIVE_FOLDER.test(child)) continue;
    }
    dirs.add(dir);
  }
  const chips: WorkstreamFileChip[] = [];
  for (const file of SHARED_FILES) if (files.has(file)) chips.push({ label: file, url: files.get(file) ?? null });
  for (const dir of SHARED_DIRS) if (dirs.has(dir)) chips.push({ label: `${dir}/`, url: null });
  return chips;
}

/** `/workstreams/{name}` with the name as one encoded segment, so a crafted name can never open another path. */
export function workstreamScopeUrl(name: string): string {
  return `/workstreams/${encodeURIComponent(name)}`;
}

/** A workstream's own files in the order the sketch draws them, then the rest as the folder listed them. */
const OWN_ORDER = ['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md', 'phases', 'config.json'];
/** The files whose page the scoped presentation answers at their clean address. */
const OWN_PAGES: ReadonlySet<string> = new Set(['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md', 'config.json']);

function ownFileChips(entry: WorkstreamEntry): { files: WorkstreamFileChip[]; left: number } {
  const known = OWN_ORDER.filter((name) => entry.ownFiles.includes(name));
  const rest = entry.ownFiles.filter((name) => !OWN_ORDER.includes(name));
  const ordered = [...known, ...rest];
  const scope = workstreamScopeUrl(entry.name);
  const chips = ordered.map((name): WorkstreamFileChip => {
    if (name === 'phases') return { label: `phases/ (${entry.phaseCount})`, url: null };
    if (OWN_PAGES.has(name)) return { label: name, url: `${scope}${addressOfPath(`.planning/${name}`, null)}` };
    return { label: name, url: null };
  });
  return { files: chips.slice(0, MAX_OWN_CHIPS), left: Math.max(0, chips.length - MAX_OWN_CHIPS) };
}

function toneOf(entry: WorkstreamEntry): WorkstreamTone {
  if (!entry.hasRoadmap) return 'quiet';
  return /^complete/i.test(entry.status ?? '') ? 'complete' : 'in-flight';
}

function branchOf(entry: WorkstreamEntry, active: WorkstreamInventory['active']): WorkstreamBranch {
  if (entry.kind === 'file') {
    return {
      name: entry.name,
      url: null,
      active: false,
      dashed: true,
      dashedLabel: NOT_A_FOLDER_LABEL,
      status: null,
      phase: null,
      ring: null,
      plans: null,
      note: null,
      files: [],
      filesLeftOut: 0,
    };
  }
  const progress = entry.progress;
  const ring =
    entry.hasRoadmap && progress
      ? {
          done: progress.phasesDone,
          total: progress.phasesTotal,
          text: `${progress.phasesDone}/${progress.phasesTotal}`,
          label: `${progress.phasesDone} of ${progress.phasesTotal} ${progress.phasesTotal === 1 ? 'phase' : 'phases'} done`,
          fraction: progress.phasesTotal > 0 ? Math.min(1, progress.phasesDone / progress.phasesTotal) : 0,
        }
      : null;
  const plans = progress
    ? {
        done: progress.plansDone,
        total: progress.plansTotal,
        label: `${progress.plansDone} of ${progress.plansTotal} ${progress.plansTotal === 1 ? 'plan' : 'plans'}`,
      }
    : null;
  const note =
    progress && progress.plansTotal > 0 && progress.plansDone === progress.plansTotal && progress.phasesDone < progress.phasesTotal
      ? `Every plan is done; STATE marks ${progress.phasesDone} of ${progress.phasesTotal} phases complete.`
      : null;
  const { files, left } = ownFileChips(entry);
  return {
    name: entry.name,
    url: `${workstreamScopeUrl(entry.name)}/`,
    active: active.state === 'present' && active.name === entry.name,
    dashed: entry.dashed !== null,
    dashedLabel: entry.dashed === 'No roadmap yet' ? NO_ROADMAP_LABEL : entry.dashed,
    status: entry.status === null ? null : { word: entry.status, tone: toneOf(entry) },
    phase: entry.currentPhase ? { label: `Phase ${entry.currentPhase.number}`, name: entry.currentPhase.name } : null,
    ring,
    plans,
    note,
    files,
    filesLeftOut: left,
  };
}

function midMigrationNotice(rootFiles: string[]): string {
  const named = join(rootFiles.map((name) => (name === 'phases' ? 'phases/' : name)));
  return `This project has ${named} at the root beside workstreams/; GSD moves them into a workstream when it migrates, so each workstream below shows its own.`;
}

/** Builds the workstream index from the inventory and the project's own (root) presentation. Total. */
export function buildWorkstreamIndex(inventory: WorkstreamInventory, root: ProjectPresentation): WorkstreamIndexModel {
  const hasProject = root.artifacts.some((artifact) => artifact.kind === 'project' && artifact.location === 'root');
  const { name } = splitProjectTitle(hasProject ? root.projectName : null, root.rootPath);
  const pointer = pointerOf(inventory.active);
  const branches = inventory.entries.map((entry) => branchOf(entry, inventory.active));
  return {
    head: { eyebrow: WORKSTREAM_EYEBROW, name, lead: projectSectionLead(root, /^what this is\b/i) },
    pointer,
    countText: workstreamCountText(inventory),
    root: {
      label: ROOT_NODE_LABEL,
      name,
      files: sharedRootFiles(root.artifacts),
      pointerText: pointer.name === null ? 'no active-workstream file' : `active-workstream → ${pointer.name}`,
    },
    branches,
    completed:
      inventory.completed.length === 0
        ? null
        : {
            label: COMPLETED_LABEL,
            countText: plural(inventory.completed.length, 'workstream', 'workstreams'),
            rows: inventory.completed.map((row) => ({
              name: row.name,
              folder: row.folder,
              phasesText: `${plural(row.phasesArchived, 'phase', 'phases')} archived`,
            })),
          },
    midMigration: inventory.midMigration === null ? null : midMigrationNotice(inventory.midMigration.rootFiles),
  };
}
