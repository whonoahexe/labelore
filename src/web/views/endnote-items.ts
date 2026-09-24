// The discussion-log endnotes (Claude's Discretion, Deferred Ideas) arrive as rendered markdown
// html. The endnotes sheet shows them as CONTEXT-brief-style panels: prose stays prose, the first
// top-level bullet list becomes divided rows, and a deferred idea's outcome ("→ Phase 3",
// "— offered, passed over", "— raised, not pursued") is lifted out into a chip. DOM-free so it is
// unit-testable; the html is our own pipeline's well-formed output, so a tag walk is enough.

export interface EndnoteBody {
  /** Html before the first top-level list ('' when none). */
  lead: string;
  /** Each top-level `<li>`'s inner html, or null when the body has no top-level list. */
  items: string[] | null;
  /** Html after that list ('' when none). */
  trailer: string;
}

const LIST_TAG = /<(\/?)(ul|ol)\b[^>]*>/gi;
const ITEM_TAG = /<(\/?)(li|ul|ol)\b[^>]*>/gi;

/** Splits a panel body around its first top-level `<ul>`/`<ol>`. */
export function splitEndnoteBody(html: string): EndnoteBody {
  LIST_TAG.lastIndex = 0;
  let depth = 0;
  let start = -1;
  let openEnd = -1;
  for (let match = LIST_TAG.exec(html); match; match = LIST_TAG.exec(html)) {
    if (match[1] === '') {
      if (depth === 0) {
        start = match.index;
        openEnd = LIST_TAG.lastIndex;
      }
      depth++;
    } else {
      depth--;
      if (depth === 0 && start !== -1) {
        return {
          lead: html.slice(0, start).trim(),
          items: listItems(html.slice(openEnd, match.index)),
          trailer: html.slice(LIST_TAG.lastIndex).trim(),
        };
      }
    }
  }
  return { lead: html.trim(), items: null, trailer: '' };
}

function listItems(inner: string): string[] {
  ITEM_TAG.lastIndex = 0;
  const items: string[] = [];
  let depth = 0;
  let itemStart = -1;
  for (let match = ITEM_TAG.exec(inner); match; match = ITEM_TAG.exec(inner)) {
    const closing = match[1] === '/';
    if (!closing) {
      if (depth === 0 && match[2]!.toLowerCase() === 'li') itemStart = ITEM_TAG.lastIndex;
      depth++;
    } else {
      depth--;
      if (depth === 0 && itemStart !== -1) {
        items.push(inner.slice(itemStart, match.index).trim());
        itemStart = -1;
      }
    }
  }
  return items;
}

export interface DeferredItem {
  html: string;
  outcome: string | null;
}

/** Trailing markup a match may sit before (a loose list wraps each item in `<p>`). */
const TAIL = String.raw`((?:\s*<\/p>)?\s*)$`;
const DASH = String.raw`\s+[—–-]\s+`;

const PASSED_OVER = new RegExp(`${DASH}offered,\\s*passed over\\.?${TAIL}`, 'i');
const NOT_PURSUED = new RegExp(`${DASH}raised,\\s*not pursued\\.?(?:;\\s*([\\s\\S]*?))?${TAIL}`, 'i');
const ARROW_PHASE = /\s*→\s*(Phase\s+\d+(?:\.\d+)*)/i;
const PAREN_PHASE = new RegExp(String.raw`\([^()]*?\b(Phase\s+\d+(?:\.\d+)*)\b[^()]*\)` + TAIL, 'i');

/** Lifts a deferred idea's recorded outcome into `outcome`, leaving the idea itself in `html`.
 * An item with no recognised outcome comes back unchanged with `outcome: null`. */
export function deferredOutcome(html: string): DeferredItem {
  const passed = PASSED_OVER.exec(html);
  if (passed) return { html: html.slice(0, passed.index) + passed[1], outcome: 'Passed over' };

  const pursued = NOT_PURSUED.exec(html);
  if (pursued) {
    const rest = pursued[1]?.trim();
    return {
      html: html.slice(0, pursued.index) + (rest ? ` — ${rest}` : '') + pursued[2],
      outcome: 'Not pursued',
    };
  }

  const arrow = ARROW_PHASE.exec(html);
  if (arrow) {
    return {
      html: html.slice(0, arrow.index) + html.slice(arrow.index + arrow[0].length),
      outcome: `→ ${capitalisePhase(arrow[1]!)}`,
    };
  }

  const paren = PAREN_PHASE.exec(html);
  if (paren) return { html, outcome: `→ ${capitalisePhase(paren[1]!)}` };

  return { html, outcome: null };
}

function capitalisePhase(value: string): string {
  return value.replace(/^phase/i, 'Phase').replace(/\s+/, ' ');
}
