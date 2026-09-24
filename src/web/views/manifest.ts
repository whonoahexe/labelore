// The view registry's shared shapes and its pure composer. A manifest declares, in
// `promote` order (D-04), which sections/data a view pulls out of the document; `composeView`
// walks that list once against a concrete `ViewInput` and returns the ordered blocks plus
// whatever the manifest left unconsumed (D-02's collapsed remainder).
import type { DocumentSectionGroup, PlanSegmentAttributes } from './document-sections.ts';
// Type-only import — erased at compile time, so this never creates a runtime import cycle with
// layout.ts (which itself imports the runtime `remainderOf` value below from this module).
import type { DocumentLayoutSpec } from './layout.ts';
// Type-only import — mirrors the DocumentLayoutSpec pattern above so `brief` below introduces no
// runtime cycle with context-brief.ts (quick-260923-lju, sketch-006 D1).
import type { ComposedContextBrief } from './context-brief.ts';

/** Declared now so 05-05 can add components without widening this union a second time — only
 * `discussion-questions` has a real component in this plan (see `blocks.tsx`). */
export type BlockComponentKey =
  | 'discussion-questions'
  | 'verification-checks'
  | 'plan-task-index'
  | 'fact-list';

export type PromotedBlock =
  | {
      type: 'section';
      /** String compare is case-insensitive on trimmed text; a `RegExp` uses `.test`. */
      heading: string | RegExp;
      label?: string;
      /** When true, every matching group is promoted (in document order); otherwise only the
       * first unconsumed match. */
      all?: boolean;
    }
  | {
      type: 'data';
      id: string;
      label: string;
      component: BlockComponentKey;
      /** Returning `null`, `undefined`, or an empty array skips the block entirely (D-06). */
      select: (input: ViewInput) => unknown;
      /** Marks document-section groups this data block already accounts for, so they drop out of
       * the D-02 remainder instead of being shown twice. */
      consumes?: (group: DocumentSectionGroup, selected: unknown) => boolean;
    };

export interface ViewManifest {
  kind: string;
  /** One sentence of per-type header copy (UI-SPEC § Per-Type Header Copy), verbatim. */
  lead: string;
  promote: readonly PromotedBlock[];
  /** sketch-004 B3 (quick-260922-3us): the cover/chapter-index/folded-chapter layout a manifest
   * opts into by declaring one of these — absent for every kind that keeps the pre-existing
   * promoted-block view. */
  layout?: DocumentLayoutSpec;
  /** quick-260923-lju (sketch-006 D1): the layout a manifest opts into instead of `promote` —
   * currently only `context`. Returns `null` when the input can't compose a brief, and the page
   * falls back to the promoted-block view. */
  brief?: (input: ViewInput) => ComposedContextBrief | null;
}

export interface ViewInput {
  kind: string;
  frontmatter: Record<string, unknown>;
  structured: Record<string, unknown>;
  groups: DocumentSectionGroup[];
  planSegments: PlanSegmentAttributes[];
  /** sketch-004 B3: the paired plan-summary status, matched generically in artifact-page.tsx by
   * `path` (no new `artifact.kind === '` branch) — `null` when the artifact isn't a plan, or a
   * plan with no paired summary yet. */
  planProgress?: { complete: boolean; summaryStatus: string | null } | null;
  /** quick-260923-lju: the phase's own ROADMAP requirement IDs (in ROADMAP order), matched
   * generically by path — `null`/absent when the artifact isn't phase-scoped or the phase carries
   * none. Feeds the CONTEXT brief intro's "Covers …" note. */
  phaseRequirementIds?: string[] | null;
}

export type ComposedBlock = { id: string; label: string } & (
  | { kind: 'section'; group: DocumentSectionGroup }
  | { kind: 'data'; component: BlockComponentKey; data: unknown }
);

export interface ComposedView {
  blocks: ComposedBlock[];
  remainder: DocumentSectionGroup[];
}

export interface OutlineEntry {
  id: string;
  label: string;
}

export const INTRODUCTION_LABEL = 'Introduction';

function headingMatches(heading: string | RegExp, group: DocumentSectionGroup): boolean {
  if (group.heading === null) return false;
  if (typeof heading === 'string') {
    return heading.trim().toLowerCase() === group.heading.trim().toLowerCase();
  }
  return heading.test(group.heading);
}

/** Every unconsumed, non-blank group, in original document order, with the leading (no-heading)
 * group relabelled `INTRODUCTION_LABEL` — extracted out of `composeView` so `composeDocumentLayout`
 * (sketch-004 B3, quick-260922-3us) can compute the exact same D-02 remainder rule against its own
 * `consumed` set (section chapters, `accountsFor`, and Also panels) without re-deriving it. */
export function remainderOf(
  groups: DocumentSectionGroup[],
  consumed: ReadonlySet<DocumentSectionGroup>,
): DocumentSectionGroup[] {
  return groups
    .filter((group) => !consumed.has(group) && group.html.trim() !== '')
    .map((group) => (group.heading === null ? { ...group, heading: INTRODUCTION_LABEL } : group));
}

/**
 * Walks `manifest.promote` in order (D-04), emitting one block per match/non-empty selection and
 * marking every group it accounts for as consumed. Block ids are `view-block-` + the 1-based
 * position among emitted blocks (not among promote entries — a `section` entry with `all: true`
 * can emit several). Remainder is every unconsumed, non-blank group, in original document order,
 * with the leading (no-heading) group relabelled `INTRODUCTION_LABEL`.
 */
export function composeView(manifest: ViewManifest, input: ViewInput): ComposedView {
  const consumed = new Set<DocumentSectionGroup>();
  const blocks: ComposedBlock[] = [];
  let position = 0;
  const nextId = (): string => {
    position += 1;
    return `view-block-${position}`;
  };

  for (const entry of manifest.promote) {
    if (entry.type === 'section') {
      const matches = input.groups.filter(
        (group) => !consumed.has(group) && headingMatches(entry.heading, group),
      );
      const selected = entry.all ? matches : matches.slice(0, 1);
      for (const group of selected) {
        consumed.add(group);
        blocks.push({
          id: nextId(),
          label: entry.label ?? group.heading ?? '',
          kind: 'section',
          group,
        });
      }
      continue;
    }

    const selected = entry.select(input);
    const isEmpty =
      selected === null || selected === undefined || (Array.isArray(selected) && selected.length === 0);
    if (isEmpty) continue;

    if (entry.consumes) {
      for (const group of input.groups) {
        if (!consumed.has(group) && entry.consumes(group, selected)) {
          consumed.add(group);
        }
      }
    }

    blocks.push({
      id: nextId(),
      label: entry.label,
      kind: 'data',
      component: entry.component,
      data: selected,
    });
  }

  const remainder = remainderOf(input.groups, consumed);

  return { blocks, remainder };
}

/** The outline's data source in View mode (D-11): the composed blocks in promotion order. The
 * remainder is not rendered in View mode (read it in Source), so it has no entry. */
export function outlineEntriesOf(view: ComposedView): OutlineEntry[] {
  return view.blocks.map((block) => ({ id: block.id, label: block.label }));
}
