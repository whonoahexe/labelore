// NAV-09: the one URL segment that names the open project. Derived from the target path on the
// server and carried on the presentation payload, so the web never re-derives it. Phase 8 (several
// projects) swaps the source of this value and nothing else.
import { RESERVED_SLUGS } from './reserved.ts';

/** The slug for a target root: its folder's basename (its parent's when the basename is
 * `.planning`; the last path segment of an ssh target's label), folded to ASCII, lower-cased, with
 * every run of other characters turned into one hyphen. Never empty; a reserved word gets the
 * `-project` suffix. */
export function slugOf(rootPath: string): string {
  const parts = rootPath.split(/[/\\:]/).filter((part) => part.length > 0);
  if (parts.length > 0 && parts[parts.length - 1] === '.planning') parts.pop();
  const last = parts[parts.length - 1] ?? '';
  const folded = last
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = folded.length === 0 ? 'project' : folded;
  return RESERVED_SLUGS.has(slug) ? `${slug}-project` : slug;
}
