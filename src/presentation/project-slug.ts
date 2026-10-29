// NAV-09: the one URL segment that names the open project. Derived from the target path on the
// server and carried on the presentation payload, so the web never re-derives it. With several
// projects the registry persists the slug (08-16, through 08-04's settings store); slugOf only
// proposes the first candidate and allocateSlug makes it unique.
import { RESERVED_SLUGS } from './reserved.ts';

/** The shape of a persisted slug: lower-case ASCII words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True for a slug a project may carry: the pattern, and not a reserved word. */
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

/** `base` when it is free, else the first free of `base-2`, `base-3`, and so on (D-11). */
export function allocateSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

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
