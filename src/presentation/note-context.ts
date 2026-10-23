// The NOTE page's server-side join (quick-261023-61l, sketch 028 A): the todos a note became or is related
// to, each with its status (from its folder), weight, area, title, resolution excerpt, in-app URL and the
// other notes batched into the same todo. A note never records which todo it became (only `promoted:
// true`), so the page looks the relation up the other way, from the todos, through the shared relation in
// `todo-notes.ts` that the TODO page (quick-261023-61k) reads in the other direction: the two pages cannot
// disagree about a link.
// Became = the todo names the note in its frontmatter `notes:` or was promoted from it word for word;
// Related = it links `[[slug]]` or mentions `notes/...md`. When several apply, the relation's precedence
// (promoted, listed, wiki, mentioned) decides.
// Pure: it reads the cached `ProjectPresentation`, the reference registry and a body lookup (the artifact
// index, supplied by the server), never a file, and imports nothing from Node. It scans with indexOf /
// slice and character loops only - no regular expression is built from document text - and never throws
// on presentation data (T-61l-05). Every URL comes from the reference registry for a path already in the
// loaded project, or is null (T-61l-06). Caps: 20 todos per note, 20 batched rows per todo, a note text
// of 110 characters, a resolution of 600 characters, and the bodies it reads are bounded.
import { levelOf, stampText } from '../planning-repo/handlers/todo-file.ts';
import type { TodoLevel } from '../planning-repo/handlers/todo-file.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { resolveArtifactReference } from './references.ts';
import type { ReferenceRegistry } from './references.ts';
import { buildTodoNoteIndex, collapseSpace, isNoteArtifactPath, isTodoArtifactPath } from './todo-notes.ts';
import type { TodoNoteVia } from './todo-notes.ts';

export type NoteTodoRelation = 'became' | 'related';
export type NoteTodoVia = 'frontmatter' | 'wiki link' | 'mentioned' | 'promoted';
export type NoteTodoStatus = 'pending' | 'done' | 'unfiled';

export interface NoteBatchedRow {
  path: string;
  /** The sibling note's in-app route, or null when the registry did not resolve it. */
  url: string | null;
  /** The sibling's frontmatter `date` as written ("2026-10-21 15:58"), or null. */
  date: string | null;
  /** Its frontmatter title, else its body's first 110 characters ("..." when longer). */
  text: string;
}

export interface NoteTodo {
  path: string;
  url: string | null;
  title: string;
  status: NoteTodoStatus;
  /** The severity as written, else the priority, else null. */
  weight: string | null;
  weightKind: 'severity' | 'priority' | null;
  level: TodoLevel;
  /** The area, else the theme. */
  area: string | null;
  relation: NoteTodoRelation;
  via: NoteTodoVia;
  /** The `## Resolution` section with list markers joined by " · ", at most 600 characters, or null. */
  resolution: string | null;
  batchedWith: NoteBatchedRow[];
}

export interface NoteContext {
  todos: NoteTodo[];
}

const MAX_TODOS = 20;
const MAX_BATCHED = 20;
const MAX_NOTE_TEXT = 110;
const MAX_RESOLUTION = 600;
const MAX_BODY_SCAN = 200000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function viaName(via: TodoNoteVia): NoteTodoVia {
  if (via === 'listed') return 'frontmatter';
  if (via === 'wiki') return 'wiki link';
  return via;
}

function statusOf(path: string): NoteTodoStatus {
  const segments = path.split('/');
  const at = segments.indexOf('todos');
  if (at < 0 || at + 2 >= segments.length) return 'unfiled';
  const folder = segments[at + 1];
  if (folder === 'pending') return 'pending';
  if (folder === 'completed' || folder === 'done') return 'done';
  return 'unfiled';
}

function fileStem(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  return name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name;
}

/** The text cut to `max` characters on a word boundary when one is near, with an ellipsis. */
function cutWords(text: string, max: number): string {
  if (text.length <= max) return text;
  let end = max;
  while (end > max - 60 && text[end] !== ' ') end -= 1;
  if (text[end] !== ' ') end = max;
  return `${text.slice(0, end).trimEnd()}…`;
}

function titleOf(frontmatter: Record<string, unknown>, body: string, path: string): string {
  const fromFrontmatter = textOf(frontmatter.title);
  if (fromFrontmatter !== null) return fromFrontmatter;
  for (const line of body.slice(0, MAX_BODY_SCAN).split('\n')) {
    if (line.startsWith('# ') && line.slice(2).trim() !== '') return line.slice(2).trim();
  }
  return fileStem(path);
}

/** The `## Resolution` section, list markers joined by " · " and newlines folded, cut at 600 characters. */
export function resolutionOf(body: string): string | null {
  const lines = body.slice(0, MAX_BODY_SCAN).split('\n');
  let at = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ') && line.slice(3).trim().toLowerCase() === 'resolution') {
      at = i;
      break;
    }
  }
  if (at < 0) return null;
  let out = '';
  for (let i = at + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.startsWith('## ')) break;
    const line = raw.trim();
    if (line === '') continue;
    const marked = line.startsWith('- ') || line.startsWith('* ');
    const piece = marked && out !== '' ? line.slice(2).trim() : line;
    if (out === '') out = piece;
    else out += marked ? ` · ${piece}` : ` ${piece}`;
    if (out.length > MAX_RESOLUTION * 2) break;
  }
  const folded = collapseSpace(out);
  return folded === '' ? null : cutWords(folded, MAX_RESOLUTION);
}

export function buildNoteContext(
  presentation: ProjectPresentation,
  registry: ReferenceRegistry,
  bodyOf: (path: string) => string | null,
  notePath: string,
): NoteContext {
  const empty: NoteContext = { todos: [] };
  try {
    if (!isNoteArtifactPath(notePath)) return empty;
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const byPath = new Map<string, (typeof artifacts)[number]>();
    for (const artifact of artifacts) if (typeof artifact?.path === 'string') byPath.set(artifact.path, artifact);

    const readBody = (path: string): string => {
      try {
        const body = bodyOf(path);
        return typeof body === 'string' ? body : '';
      } catch {
        return '';
      }
    };
    const frontmatterOf = (path: string): Record<string, unknown> => {
      const artifact = byPath.get(path);
      return artifact && isRecord(artifact.frontmatter) ? artifact.frontmatter : {};
    };

    const index = buildTodoNoteIndex(presentation, bodyOf);
    const todos: NoteTodo[] = [];
    for (const link of index.todosOf(notePath)) {
      if (todos.length >= MAX_TODOS) break;
      if (!isTodoArtifactPath(link.todoPath)) continue;
      const frontmatter = frontmatterOf(link.todoPath);
      const body = readBody(link.todoPath);

      const severity = textOf(frontmatter.severity);
      const priority = textOf(frontmatter.priority);
      const weight = severity ?? priority;

      const batchedWith: NoteBatchedRow[] = [];
      for (const other of index.notesOf(link.todoPath)) {
        if (batchedWith.length >= MAX_BATCHED) break;
        if (!other.exists || other.notePath === notePath) continue;
        const siblingFrontmatter = frontmatterOf(other.notePath);
        const title = textOf(siblingFrontmatter.title);
        const siblingBody = collapseSpace(readBody(other.notePath).slice(0, 600));
        batchedWith.push({
          path: other.notePath,
          url: resolveArtifactReference(registry, other.notePath)?.url ?? null,
          date: stampText(siblingFrontmatter.date),
          text: title ?? (siblingBody.length > MAX_NOTE_TEXT ? `${siblingBody.slice(0, MAX_NOTE_TEXT)}…` : siblingBody),
        });
      }

      todos.push({
        path: link.todoPath,
        url: resolveArtifactReference(registry, link.todoPath)?.url ?? null,
        title: titleOf(frontmatter, body, link.todoPath),
        status: statusOf(link.todoPath),
        weight,
        weightKind: severity !== null ? 'severity' : priority !== null ? 'priority' : null,
        level: levelOf(weight),
        area: textOf(frontmatter.area) ?? textOf(frontmatter.theme),
        relation: link.via === 'promoted' || link.via === 'listed' ? 'became' : 'related',
        via: viaName(link.via),
        resolution: resolutionOf(body),
        batchedWith,
      });
    }
    return { todos };
  } catch {
    return empty;
  }
}
