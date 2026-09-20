// A reusable, kind-agnostic promoted block: pick a fixed ordered set of frontmatter keys and
// render whichever of them are actually present and non-empty as a labeled fact list (dt/dd
// rows). Used by the VERIFICATION manifest's "Verdict" block (Task 1), the PLAN manifest's
// "Plan facts" block (Task 2), and reusable by any later manifest that just wants "these N
// frontmatter fields, if present" without a bespoke block component.
import { humanizeKey, toFrontmatterValueView } from '../../rendering/frontmatter-views.ts';
import type { FrontmatterValueView } from '../../rendering/frontmatter-views.ts';
import type { PromotedBlock } from './manifest.ts';

export interface Fact {
  key: string;
  label: string;
  value: FrontmatterValueView;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/** Preserves `keys`' own order (not the frontmatter's) and skips any key that is absent or
 * empty (D-06) — returns `null` when nothing matched, so `composeView` skips the block. */
export function selectFacts(
  frontmatter: Record<string, unknown>,
  keys: readonly string[],
): Fact[] | null {
  const facts: Fact[] = [];
  for (const key of keys) {
    if (!Object.hasOwn(frontmatter, key)) continue;
    const raw = frontmatter[key];
    if (isEmptyValue(raw)) continue;
    facts.push({ key, label: humanizeKey(key), value: toFrontmatterValueView(raw) });
  }
  return facts.length > 0 ? facts : null;
}

export function factsBlock(id: string, label: string, keys: readonly string[]): PromotedBlock {
  return {
    type: 'data',
    id,
    label,
    component: 'fact-list',
    select: (input) => selectFacts(input.frontmatter, keys),
  };
}
