// The one todo<->note relation (quick-261023-61k, sketch 027 C; consumed by the TODO page here and by the
// NOTE page, quick-261023-61l): which notes a todo came from, and which todos a note became. Both
// directions come from one pass over the loaded presentation, so the two pages cannot disagree.
// A note is found four ways, from `structured.todo.noteRefs` (built by the todo handler): listed in the
// todo's frontmatter `notes:`, linked as `[[slug]]`, mentioned as `notes/<name>.md`, or promoted word for
// word (the todo's Goal text equals the note's body once runs of whitespace are collapsed). When one note
// is found more than one way it keeps its first position and takes the strongest way: promoted, then
// listed, then wiki, then mentioned. A `[[slug]]` or a mention counts only when that note exists in the
// loaded project; a listed entry that names a missing file is kept with `exists: false`.
// Notes are recognised by path (`.planning/notes/**.md`), not by kind, so the NOTE page can give them
// their own kind without touching this module.
// Pure: it reads the cached `ProjectPresentation` and a body lookup, never a file, and imports nothing
// from Node. It uses no regular expression, only string and character operations, and never throws on
// presentation data (T-61k-03). T-61k-05: a note path is matched exactly against paths already in the
// loaded project; nothing is resolved against the disk.
import type { ProjectPresentation } from '../server/project-presentation.ts';

export type TodoNoteVia = 'listed' | 'wiki' | 'mentioned' | 'promoted';

export interface TodoNoteLink {
  /** `.planning/notes/…md`. */
  notePath: string;
  via: TodoNoteVia;
  /** False only for a listed entry whose file is not in the project. */
  exists: boolean;
}

export interface NoteTodoLink {
  /** `.planning/todos/…md`. */
  todoPath: string;
  via: TodoNoteVia;
}

export interface TodoNoteIndex {
  /** The notes a todo came from, in the order found; `[]` for a path that is not a todo. */
  notesOf(todoPath: string): TodoNoteLink[];
  /** The todos that came from a note, in path order; `[]` for a path that is not a note. */
  todosOf(notePath: string): NoteTodoLink[];
}

const TODO_PREFIX = '.planning/todos/';
const NOTE_PREFIX = '.planning/notes/';
const MAX_TODOS = 2000;
const MAX_NOTES = 2000;
const MAX_LINKS = 100;
const MAX_COMPARE = 20000;

const STRENGTH: Record<TodoNoteVia, number> = { promoted: 0, listed: 1, wiki: 2, mentioned: 3 };

function isMarkdown(path: string): boolean {
  return path.toLowerCase().endsWith('.md');
}

export function isTodoArtifactPath(path: string): boolean {
  return typeof path === 'string' && path.startsWith(TODO_PREFIX) && isMarkdown(path);
}

export function isNoteArtifactPath(path: string): boolean {
  return typeof path === 'string' && path.startsWith(NOTE_PREFIX) && isMarkdown(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) if (typeof entry === 'string' && entry !== '') out.push(entry);
  return out;
}

/** Trims and collapses every run of whitespace to one space, without a pattern. */
export function collapseSpace(text: string): string {
  let out = '';
  let pendingSpace = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const space = ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v' || ch === ' ';
    if (space) {
      pendingSpace = out !== '';
      continue;
    }
    if (pendingSpace) out += ' ';
    pendingSpace = false;
    out += ch;
  }
  return out;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function buildTodoNoteIndex(
  presentation: ProjectPresentation,
  bodyOf: (path: string) => string | null,
): TodoNoteIndex {
  const byTodo = new Map<string, TodoNoteLink[]>();
  const byNote = new Map<string, NoteTodoLink[]>();
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    const notes = new Set<string>();
    const todos: { path: string; refs: Record<string, unknown> }[] = [];
    for (const artifact of artifacts) {
      const path = artifact?.path;
      if (typeof path !== 'string') continue;
      if (isNoteArtifactPath(path)) {
        if (notes.size < MAX_NOTES) notes.add(path);
        continue;
      }
      if (!isTodoArtifactPath(path) || todos.length >= MAX_TODOS) continue;
      const structured = isRecord(artifact.structured) ? artifact.structured : {};
      const todo = isRecord(structured.todo) ? structured.todo : null;
      if (todo === null) continue;
      todos.push({ path, refs: isRecord(todo.noteRefs) ? todo.noteRefs : {} });
    }
    todos.sort((left, right) => compareText(left.path, right.path));

    // Notes by their whitespace-collapsed body, built once and only when some todo was promoted.
    let promotedIndex: Map<string, string[]> | null = null;
    const promotedNotes = (text: string): string[] => {
      if (promotedIndex === null) {
        promotedIndex = new Map();
        for (const notePath of [...notes].sort(compareText)) {
          let body: string | null;
          try {
            body = bodyOf(notePath);
          } catch {
            body = null;
          }
          if (typeof body !== 'string' || body.length > MAX_COMPARE * 2) continue;
          const collapsed = collapseSpace(body);
          if (collapsed === '' || collapsed.length > MAX_COMPARE) continue;
          const bucket = promotedIndex.get(collapsed);
          if (bucket) bucket.push(notePath);
          else promotedIndex.set(collapsed, [notePath]);
        }
      }
      return promotedIndex.get(text) ?? [];
    };

    for (const todo of todos) {
      const links: TodoNoteLink[] = [];
      const at = new Map<string, number>();
      const add = (notePath: string, via: TodoNoteVia, exists: boolean): void => {
        const seen = at.get(notePath);
        if (seen !== undefined) {
          if (STRENGTH[via] < STRENGTH[links[seen].via]) links[seen] = { notePath, via, exists };
          return;
        }
        if (links.length >= MAX_LINKS) return;
        at.set(notePath, links.length);
        links.push({ notePath, via, exists });
      };
      for (const path of stringsOf(todo.refs.listed)) {
        if (isNoteArtifactPath(path)) add(path, 'listed', notes.has(path));
      }
      for (const slug of stringsOf(todo.refs.wiki)) {
        const path = `${NOTE_PREFIX}${slug}.md`;
        if (notes.has(path)) add(path, 'wiki', true);
      }
      for (const path of stringsOf(todo.refs.mentioned)) {
        if (isNoteArtifactPath(path) && notes.has(path)) add(path, 'mentioned', true);
      }
      const promoted = todo.refs.promotedText;
      if (typeof promoted === 'string' && promoted !== '') {
        const collapsed = collapseSpace(promoted);
        if (collapsed !== '' && collapsed.length <= MAX_COMPARE) {
          for (const path of promotedNotes(collapsed)) add(path, 'promoted', true);
        }
      }
      if (links.length === 0) continue;
      byTodo.set(todo.path, links);
      for (const link of links) {
        if (!link.exists) continue;
        const bucket = byNote.get(link.notePath);
        const entry: NoteTodoLink = { todoPath: todo.path, via: link.via };
        if (bucket) bucket.push(entry);
        else byNote.set(link.notePath, [entry]);
      }
    }
  } catch {
    byTodo.clear();
    byNote.clear();
  }
  return {
    notesOf: (todoPath) => (byTodo.get(todoPath) ?? []).map((link) => ({ ...link })),
    todosOf: (notePath) => (byNote.get(notePath) ?? []).map((link) => ({ ...link })),
  };
}
