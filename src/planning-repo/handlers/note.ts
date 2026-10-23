// Notes (`.planning/notes/<anything>.md`) - discovery gives them kind 'note' by directory position
// (quick-261023-61l, sketch 028 A; quick-261023-u13, sketch 029 A). Like the debug handler it lifts the frontmatter as an open map and
// keeps the body verbatim (the dashboard's Notes list reads both), and adds `structured.note`: the
// tolerant note projection `composeNotePage` reads client-side (quick-261023-u13: the file-name title and the
// file's line count ride along, since the view has neither). The extraction is guarded by a try/catch
// so a throw only omits `note` - the page then falls back to the promoted-section view and the title,
// body and frontmatter survive (T-61l-04).
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractNote } from './note-lift.ts';

/** The file's line count: a final newline does not start a line. */
function lineCountOf(content: string): number {
  if (typeof content !== 'string' || content === '') return 0;
  let lines = 0;
  for (let at = content.indexOf('\n'); at >= 0; at = content.indexOf('\n', at + 1)) lines += 1;
  return content.endsWith('\n') ? lines : lines + 1;
}

export const NoteHandler: ArtifactHandler = {
  kind: 'note',
  match: (ref) => ref.kind === 'note',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let note;
    try {
      const framed = typeof fm.data?.title === 'string' && fm.data.title.trim() !== '';
      note = extractNote(fm.body, { titled: framed, path: ref.path, lines: lineCountOf(raw.content) });
    } catch {
      note = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: note === undefined ? {} : { note },
    };
  },
};
