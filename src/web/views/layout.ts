// sketch-004 B3 "folded chapters" layout contract and composer (quick-260922-3us). Pure: no DOM
// globals, no React — `layout-components.tsx` is the only file that renders this data. A manifest
// opts in by declaring `layout: DocumentLayoutSpec`; `composeDocumentLayout` walks it once against
// a concrete `ViewInput` into the cover/chapters/Also shape `artifact-page.tsx` renders.
import { countListItems, stripLeadingHeading, type DocumentSectionGroup } from './document-sections.ts';
import type { FrontmatterValueView } from '../../rendering/frontmatter-views.ts';
import { remainderOf, type ViewInput, type ViewManifest } from './manifest.ts';

/** The document-content tone vocabulary sketch-004 B3 draws from — deliberately excludes the two
 * parse-degradation tones (`destructive`/`warning`), which stay reserved for the artifact-parse
 * badge alone (docs/design-language.md's Tones table, UI-06). */
export type ChipTone = 'active' | 'complete' | 'quiet' | 'in-flight' | 'missing';

export interface Tally {
  label: string;
  tone: ChipTone;
  /** Roll-up wording override — falls back to `label.toLowerCase()` when absent. */
  rollup?: string;
}

export interface ItemDetail {
  label: string;
  rows?: { label?: string; text: string }[];
  html?: string;
  /** quick-260923-jxp (JXP-03/JXP-04): source-table options remaining after the chosen one, in
   * source order, each keeping its real 1-based table position. */
  options?: ItemOption[];
}

/** quick-260923-jxp (JXP-03/JXP-04): one option from a discussion question's source table — a
 * numbered, titled entry, with its description when the source table carries one. */
export interface ItemOption {
  number: number | null;
  title: string;
  description: string | null;
}

/** quick-260923-jxp (JXP-03/JXP-05): the answer card an item's state line can carry — the chosen
 * (or settled) option, a qualifier chip when the chosen cell carried one, and the user's own words
 * when they add something the option title doesn't already say. */
export interface ItemAnswer {
  option: ItemOption | null;
  qualifier: string | null;
  words: string | null;
}

/** quick-260923-jxp (JXP-06): a question's `**Notes:**` paragraph, behind a quiet toggle. Each
 * segment is plain text; a segment whose sentence started `"Accepted gap:"` carries that as its
 * `mark`, with the prefix removed from `text`. */
export interface ItemNote {
  label: string;
  segments: { text: string; mark: string | null }[];
}

export interface ChapterItem {
  key: string;
  ref: string | null;
  title: string;
  state: Tally | null;
  tally?: Tally;
  answer?: string | null;
  chips?: Tally[];
  detail?: ItemDetail | null;
  /** quick-260923-jxp (JXP-03/JXP-04/JXP-05): the chosen/settled/custom answer card. Absent (or
   * null) leaves the pre-existing `.document-item-state`/`.document-item-answer` markup untouched
   * — plan and verification items never set this. */
  answerCard?: ItemAnswer | null;
  /** quick-260923-jxp (JXP-06): the quiet note toggle. Absent (or null) renders no toggle at all. */
  note?: ItemNote | null;
}

export interface SelectedChapter {
  key: string;
  title: string;
  items: ChapterItem[];
  accountsFor?: DocumentSectionGroup[];
}

export type ChapterSpec =
  | { type: 'items'; id: string; select: (input: ViewInput) => SelectedChapter[] | null }
  | { type: 'section'; id: string; heading: string | RegExp; title?: string; all?: boolean };

export interface AlsoSpec {
  id: string;
  heading: string | RegExp;
  eyebrow: string;
  all?: boolean;
}

export interface CoverFact {
  label: string;
  value: string;
}

export interface CoverGlance {
  eyebrow: string;
  title: string;
  body: string | null;
  action: string;
  target: string;
}

export interface CoverData {
  status: Tally | null;
  facts: CoverFact[];
  headline: { value: string; label: string } | null;
  pills: { value: string; label: string }[];
  glance: CoverGlance | null;
}

export interface ComposedItem extends ChapterItem {
  id: string;
}

export interface ComposedChapter {
  id: string;
  specId: string;
  number: string;
  title: string;
  items: ComposedItem[] | null;
  html: string | null;
  rollup: { text: string; tone: ChipTone }[];
  count: number | null;
  anchorIds: string[];
}

export interface ComposedAlsoPanel {
  id: string;
  specId: string;
  eyebrow: string;
  html: string;
  count: number | null;
  /** quick-260923-jxp (JXP-07): the panel's own group heading (e.g. "Claude's Discretion") —
   * `ALSO_CHAPTER_TITLE`-style panels never needed this; the endnotes sheet's subsection heading
   * does. */
  heading: string;
  /** quick-260923-jxp (JXP-07): `stripLeadingHeading(html)` — the endnotes sheet renders its own
   * `<h3>` from `heading`, so the panel body must not repeat it. */
  bodyHtml: string;
}

/** quick-260923-jxp (JXP-02): a declined-area row — greyed, non-expandable, placed after the real
 * chapters. `key` names the declined area (also its React key upstream); `title` is the display
 * name; `label` is the quiet chip text ("Not discussed"). */
export interface GhostChapter {
  key: string;
  title: string;
  label: string;
}

export interface ComposedGhost extends GhostChapter {
  id: string;
}

export interface ComposedAlsoChapter {
  id: 'chapter-also';
  number: string;
  panels: ComposedAlsoPanel[];
  remainder: DocumentSectionGroup[];
  rollup: { text: string; tone: ChipTone }[];
  /** quick-260923-jxp (JXP-07): 'fold' (default, plan/verification's folded "Also in this
   * document" chapter, unchanged) or 'endnotes' (the discussion-log's always-open back-matter
   * sheet). */
  style: 'fold' | 'endnotes';
  title: string;
}

export interface DocumentLayoutSpec {
  chapters: readonly ChapterSpec[];
  also?: readonly AlsoSpec[];
  cover: (
    input: ViewInput,
    parts: { chapters: ComposedChapter[]; also: ComposedAlsoPanel[]; ghosts: ComposedGhost[] },
  ) => CoverData;
  /** quick-260923-jxp (JXP-02): declined-area ghost rows, derived from `input`. Null/`[]` (the
   * default when omitted) composes zero ghosts; ghosts alone never make a layout — a manifest with
   * zero real chapters still composes to `null` even when `ghosts` would be non-empty. */
  ghosts?: (input: ViewInput) => GhostChapter[] | null;
  /** quick-260923-jxp (JXP-07): 'fold' (default) or 'endnotes'. Only the discussion-log layout
   * opts into 'endnotes' — plan and verification are untouched. */
  alsoStyle?: 'fold' | 'endnotes';
}

export interface ComposedDocumentLayout {
  cover: CoverData;
  chapters: ComposedChapter[];
  also: ComposedAlsoChapter | null;
  /** quick-260923-jxp (JXP-02): composed declined-area ghost rows — `[]` when the spec has none. */
  ghosts: ComposedGhost[];
}

export const ALSO_CHAPTER_TITLE = 'Also in this document';
/** quick-260923-jxp (JXP-07): the discussion-log's endnotes-style Also chapter title. */
export const ENDNOTES_TITLE = 'Endnotes';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Lowercases, collapses every non-alphanumeric run to a single hyphen, and trims leading/trailing
 * hyphens — used to build stable DOM ids from item/chapter keys and headings. Never empty: an
 * all-punctuation input falls back to `'item'`. */
function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'item';
}

/** Local copy of `manifest.ts`'s (unexported) `headingMatches` — string compare is
 * case-insensitive on trimmed text, a `RegExp` uses `.test`. */
function headingMatches(heading: string | RegExp, group: DocumentSectionGroup): boolean {
  if (group.heading === null) return false;
  if (typeof heading === 'string') {
    return heading.trim().toLowerCase() === group.heading.trim().toLowerCase();
  }
  return heading.test(group.heading);
}

function htmlHasId(html: string, id: string): boolean {
  return html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
}

/** Groups `items` by `(tally ?? state)`'s `label`+`tone` pair, in first-seen order, into
 * `"N wording"` chips — `wording` is the tally's own `rollup` override when present, otherwise its
 * `label` lowercased. Every item carrying neither a `tally` nor a `state` collapses into one
 * trailing-or-interleaved (by first-seen position) quiet `"N items"` group instead of being
 * dropped. */
export function rollupOf(items: readonly ChapterItem[]): { text: string; tone: ChipTone }[] {
  const order: string[] = [];
  const groups = new Map<string, { tone: ChipTone; wording: string; count: number }>();
  const NONE_KEY = '\u0000none';

  for (const item of items) {
    const tally = item.tally ?? item.state;
    const key = tally ? `${tally.label}\u0000${tally.tone}` : NONE_KEY;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groups.set(key, {
      tone: tally ? tally.tone : 'quiet',
      wording: tally ? (tally.rollup ?? tally.label.toLowerCase()) : 'items',
      count: 1,
    });
    order.push(key);
  }

  return order.map((key) => {
    const group = groups.get(key)!;
    return { text: `${group.count} ${group.wording}`, tone: group.tone };
  });
}

/** Flattens a scalar or a scalar-only list (comma-joined) into display text; returns `null` for a
 * record, an empty list, a list containing any non-scalar item, or an empty-string scalar. */
export function factValueText(value: FrontmatterValueView): string | null {
  if (value.kind === 'record') return null;
  if (value.kind === 'scalar') return value.value !== '' ? value.value : null;
  if (value.items.length === 0) return null;
  const parts: string[] = [];
  for (const item of value.items) {
    if (item.kind !== 'scalar') return null;
    parts.push(item.value);
  }
  return parts.join(', ');
}

/** Resolves an arbitrary id (a chapter id, an item id, an Also panel id, a chapter's own anchor id,
 * or an `id="…"` found embedded inside a chapter/item-detail/panel/remainder html blob) to the
 * chapter it lives in — `itemId` is set only when the match is more specific than "this chapter as
 * a whole" (an item, or a panel, or an embedded id inside an item's detail). Unknown ids (no match
 * anywhere) return `null`. */
export function chapterForTarget(
  layout: ComposedDocumentLayout,
  targetId: string,
): { chapterId: string; itemId: string | null } | null {
  for (const chapter of layout.chapters) {
    if (chapter.id === targetId) return { chapterId: chapter.id, itemId: null };
    if (chapter.anchorIds.includes(targetId)) return { chapterId: chapter.id, itemId: null };
    if (chapter.items) {
      const item = chapter.items.find((entry) => entry.id === targetId);
      if (item) return { chapterId: chapter.id, itemId: item.id };
      for (const entry of chapter.items) {
        if (entry.detail?.html && htmlHasId(entry.detail.html, targetId)) {
          return { chapterId: chapter.id, itemId: entry.id };
        }
      }
    }
    if (chapter.html && htmlHasId(chapter.html, targetId)) {
      return { chapterId: chapter.id, itemId: null };
    }
  }

  if (layout.also) {
    if (layout.also.id === targetId) return { chapterId: layout.also.id, itemId: null };
    for (const panel of layout.also.panels) {
      if (panel.id === targetId || htmlHasId(panel.html, targetId)) {
        return { chapterId: layout.also.id, itemId: panel.id };
      }
    }
    for (const group of layout.also.remainder) {
      if (group.id === targetId || htmlHasId(group.html, targetId)) {
        return { chapterId: layout.also.id, itemId: null };
      }
    }
  }

  return null;
}

/**
 * Composes `manifest.layout` against `input` into the cover/chapters/Also shape. Returns `null`
 * when the manifest carries no `layout`, or when every `ChapterSpec` drops out (a `select`
 * returning `null`/`[]`, or a `section` spec matching no group) — the page then falls back to the
 * pre-existing `ViewReader`/`ArtifactReader` split. Chapter numbers are two-digit, assigned in
 * spec order across every composed chapter; the Also chapter (panels + remainder) is always
 * numbered one past the last real chapter, and is itself `null` when it would hold neither a panel
 * nor a remainder group.
 */
export function composeDocumentLayout(
  manifest: ViewManifest,
  input: ViewInput,
): ComposedDocumentLayout | null {
  const spec = manifest.layout;
  if (!spec) return null;

  const consumed = new Set<DocumentSectionGroup>();
  const chapters: ComposedChapter[] = [];
  let chapterNumber = 0;

  for (const chapterSpec of spec.chapters) {
    if (chapterSpec.type === 'items') {
      const selected = chapterSpec.select(input);
      if (!selected || selected.length === 0) continue;
      for (const sel of selected) {
        chapterNumber += 1;
        const chapterId =
          selected.length === 1
            ? `chapter-${chapterSpec.id}`
            : `chapter-${chapterSpec.id}-${slug(sel.key)}`;
        const items: ComposedItem[] = sel.items.map((item) => ({
          ...item,
          id: `${chapterId}-${slug(item.key)}`,
        }));
        const accountsFor = sel.accountsFor ?? [];
        for (const group of accountsFor) consumed.add(group);
        const anchorIds = accountsFor
          .map((group) => group.id)
          .filter((id): id is string => id !== null);
        chapters.push({
          id: chapterId,
          specId: chapterSpec.id,
          number: pad(chapterNumber),
          title: sel.title,
          items,
          html: null,
          rollup: rollupOf(items),
          count: items.length,
          anchorIds,
        });
      }
      continue;
    }

    // 'section'
    const matches = input.groups.filter(
      (group) => !consumed.has(group) && headingMatches(chapterSpec.heading, group),
    );
    const picked = chapterSpec.all ? matches : matches.slice(0, 1);
    if (picked.length === 0) continue;
    picked.forEach((group, index) => {
      consumed.add(group);
      chapterNumber += 1;
      const chapterId =
        picked.length === 1
          ? `chapter-${chapterSpec.id}`
          : `chapter-${chapterSpec.id}-${slug(group.heading ?? String(index))}`;
      chapters.push({
        id: chapterId,
        specId: chapterSpec.id,
        number: pad(chapterNumber),
        title: chapterSpec.title ?? group.heading ?? '',
        items: null,
        html: stripLeadingHeading(group.html),
        rollup: [],
        count: null,
        anchorIds: group.id !== null ? [group.id] : [],
      });
    });
  }

  if (chapters.length === 0) return null;

  const panels: ComposedAlsoPanel[] = [];
  const panelRollupSeeds: { count: number | null; heading: string }[] = [];
  for (const alsoSpec of spec.also ?? []) {
    const matches = input.groups.filter(
      (group) => !consumed.has(group) && headingMatches(alsoSpec.heading, group),
    );
    const picked = alsoSpec.all ? matches : matches.slice(0, 1);
    if (picked.length === 0) continue;
    picked.forEach((group, index) => {
      consumed.add(group);
      const panelId = index === 0 ? `also-${alsoSpec.id}` : `also-${alsoSpec.id}-${index + 1}`;
      const rawCount = countListItems(group.html);
      const count = rawCount > 0 ? rawCount : null;
      panels.push({
        id: panelId,
        specId: alsoSpec.id,
        eyebrow: alsoSpec.eyebrow,
        html: group.html,
        count,
        heading: group.heading ?? alsoSpec.eyebrow,
        bodyHtml: stripLeadingHeading(group.html),
      });
      panelRollupSeeds.push({ count, heading: group.heading ?? alsoSpec.eyebrow });
    });
  }

  const remainder = remainderOf(input.groups, consumed);

  let also: ComposedAlsoChapter | null = null;
  if (panels.length > 0 || remainder.length > 0) {
    const alsoRollup: { text: string; tone: ChipTone }[] = panelRollupSeeds.map((seed) => ({
      text: seed.count !== null ? `${seed.count} ${seed.heading}` : seed.heading,
      tone: 'quiet',
    }));
    if (remainder.length > 0) {
      alsoRollup.push({
        text: `${remainder.length} more section${remainder.length === 1 ? '' : 's'}`,
        tone: 'quiet',
      });
    }
    const alsoStyle = spec.alsoStyle ?? 'fold';
    also = {
      id: 'chapter-also',
      number: pad(chapters.length + 1),
      panels,
      remainder,
      rollup: alsoRollup,
      style: alsoStyle,
      title: alsoStyle === 'endnotes' ? ENDNOTES_TITLE : ALSO_CHAPTER_TITLE,
    };
  }

  // quick-260923-jxp (JXP-02): ghosts never make a layout on their own — computed only once at
  // least one real chapter exists (the `chapters.length === 0` guard above already returned).
  const ghostSpecs = spec.ghosts?.(input) ?? [];
  const ghosts: ComposedGhost[] = ghostSpecs.map((ghost) => ({ ...ghost, id: `ghost-${slug(ghost.key)}` }));

  const cover = spec.cover(input, { chapters, also: panels, ghosts });

  return { cover, chapters, also, ghosts };
}
