// The browser tab names the project open in it: "{name} · Labelore", and plain "Labelore" when none is open.
// The title is kept at project level on purpose; per-page titles are not part of it. The name is written
// through the `title` property, a plain-text sink, so a project name is never parsed as markup.
import { useEffect } from 'react';

/** The same text as the static <title> in index.html, so the pre-JS title and the restored title match. */
export const BASE_TAB_TITLE = 'Labelore';

/** "{name} · Labelore" for a non-empty name, otherwise the plain base title. */
export function tabTitle(name: string | null): string {
  const trimmed = name?.trim() ?? '';
  return trimmed === '' ? BASE_TAB_TITLE : `${trimmed} · ${BASE_TAB_TITLE}`;
}

/** Sets the title and returns the restore. It restores the base title, never a "previous" value: with
 * StrictMode's double effect and project-to-project switches, the previous value could be the last project's name. */
export function applyTabTitle(target: { title: string }, name: string | null): () => void {
  target.title = tabTitle(name);
  return () => {
    target.title = BASE_TAB_TITLE;
  };
}

/** Names the open project in the tab. `document` is touched only inside the effect, so a static render in
 * node (which never runs effects) never reaches it. */
export function useTabTitle(name: string | null): void {
  useEffect(() => applyTabTitle(document, name), [name]);
}
