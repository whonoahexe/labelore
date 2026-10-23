// Todos (`.planning/todos/{pending,completed,done}/<anything>.md`) - discovery gives them kind 'todo' by
// directory position (quick-261023-61k, sketch 027 C). Like the debug handler it lifts the frontmatter as
// an open map and keeps the body verbatim (the dashboard's On deck list reads both), and adds
// `structured.todo`: the tolerant todo projection `composeTodoLifecycle` reads client-side. The extraction
// is guarded by a try/catch so a throw only omits `todo` - the page then falls back to the
// promoted-section view and the title, body and frontmatter survive (T-61k-04).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractTodoFile } from './todo-file.ts';

export const TodoHandler: ArtifactHandler = {
  kind: 'todo',
  match: (ref) => ref.kind === 'todo',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let todo;
    try {
      todo = extractTodoFile({ body: fm.body, frontmatter: fm.data, path: ref.path });
    } catch {
      todo = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: todo === undefined ? {} : { todo },
    };
  },
};
