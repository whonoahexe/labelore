// The TODO page's server-side join (quick-261023-61k, sketch 027 C): what a todo needs from elsewhere in
// the cached presentation, built once per document request - each source note with its in-app URL, date,
// title, promoted flag and text (the notes the shared relation in `todo-notes.ts` ties to the todo), and
// the closing quick task with a link to its SUMMARY (else PLAN) page when the project holds that file.
// Pure: it reads the cached `ProjectPresentation`, the reference registry and a body lookup (the artifact
// index, supplied by the server), never a file, and imports nothing from Node. It uses no regular
// expression and never throws on presentation data (T-61k-03, T-61k-05): every URL comes from the
// reference registry for a path that is already in the loaded project.
import { stampText } from '../planning-repo/handlers/todo-file.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { resolveArtifactReference } from './references.ts';
import type { ReferenceRegistry } from './references.ts';
import { buildTodoNoteIndex, isTodoArtifactPath } from './todo-notes.ts';
import type { TodoNoteVia } from './todo-notes.ts';

export interface TodoContextNote {
  path: string;
  /** The in-app route of the note's page, or null (a missing note, or one the registry did not resolve). */
  url: string | null;
  via: TodoNoteVia;
  exists: boolean;
  /** The note's frontmatter `date` as written ("2026-10-21 15:58", "2026-10-23"), or null. */
  date: string | null;
  /** The note's frontmatter `promoted` flag, or null when it carries none. */
  promoted: boolean | null;
  title: string | null;
  /** The note's body, trimmed and cut at MAX_TEXT on a word boundary; empty for a missing note. */
  text: string;
  /** True when `text` was cut. */
  cut: boolean;
}

export interface TodoClosedBy {
  id: string;
  /** "quick 260920-mzr". */
  label: string;
  /** The in-app route of the quick task's SUMMARY (else PLAN) page, or null when the project holds neither. */
  url: string | null;
}

export interface TodoContext {
  notes: TodoContextNote[];
  closedBy: TodoClosedBy | null;
}

const MAX_TEXT = 4000;
const MAX_NOTES = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSpaceCode(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13;
}

/** The text cut to at most MAX_TEXT characters, on a word boundary when one is near. */
function cutText(text: string): { text: string; cut: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_TEXT) return { text: trimmed, cut: false };
  let end = MAX_TEXT;
  while (end > MAX_TEXT - 300 && !isSpaceCode(trimmed.charCodeAt(end))) end -= 1;
  if (!isSpaceCode(trimmed.charCodeAt(end))) end = MAX_TEXT;
  return { text: trimmed.slice(0, end).trimEnd(), cut: true };
}

function folderOf(path: string): string {
  const slash = path.lastIndexOf('/');
  const parent = slash >= 0 ? path.slice(0, slash) : '';
  return parent.slice(parent.lastIndexOf('/') + 1);
}

function fileOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function buildTodoContext(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  bodyOf: (path: string) => string | null,
  todoPath: string,
): TodoContext {
  const empty: TodoContext = { notes: [], closedBy: null };
  try {
    if (!isTodoArtifactPath(todoPath)) return empty;
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const todo = artifacts.find((candidate) => candidate.path === todoPath);
    if (!todo) return empty;
    const byPath = new Map<string, (typeof artifacts)[number]>();
    for (const artifact of artifacts) if (typeof artifact?.path === 'string') byPath.set(artifact.path, artifact);

    const index = buildTodoNoteIndex(presentation, bodyOf);
    const notes: TodoContextNote[] = [];
    for (const link of index.notesOf(todoPath).slice(0, MAX_NOTES)) {
      const note = byPath.get(link.notePath);
      const frontmatter = note && isRecord(note.frontmatter) ? note.frontmatter : {};
      let body: string | null = null;
      if (link.exists) {
        try {
          body = bodyOf(link.notePath);
        } catch {
          body = null;
        }
      }
      const { text, cut } = cutText(typeof body === 'string' ? body : '');
      notes.push({
        path: link.notePath,
        url: link.exists ? (resolveArtifactReference(registry, link.notePath)?.url ?? null) : null,
        via: link.via,
        exists: link.exists,
        date: stampText(frontmatter.date),
        promoted: typeof frontmatter.promoted === 'boolean' ? frontmatter.promoted : null,
        title: typeof frontmatter.title === 'string' && frontmatter.title.trim() !== '' ? frontmatter.title.trim() : null,
        text,
        cut,
      });
    }

    let closedBy: TodoClosedBy | null = null;
    const structured = isRecord(todo.structured) ? todo.structured : {};
    const fields = isRecord(structured.todo) ? structured.todo : {};
    const id = typeof fields.quickTask === 'string' && fields.quickTask !== '' ? fields.quickTask : null;
    if (id !== null) {
      let target: string | null = null;
      for (const suffix of ['-SUMMARY.md', '-PLAN.md']) {
        if (target !== null) break;
        for (const artifact of artifacts) {
          if (typeof artifact?.path !== 'string') continue;
          if (fileOf(artifact.path) === `${id}${suffix}` && folderOf(artifact.path).startsWith(`${id}-`)) {
            target = artifact.path;
            break;
          }
        }
      }
      closedBy = {
        id,
        label: `quick ${id}`,
        url: target === null ? null : (resolveArtifactReference(registry, target)?.url ?? null),
      };
    }
    return { notes, closedBy };
  } catch {
    return empty;
  }
}
