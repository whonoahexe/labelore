// The NAV-07 prose scanner and decision-mention index (plan 01-04, D-13–D-16). Called from
// snapshot.ts's refresh(), after handler dispatch (registry.ts's parseWithRegistry) and after
// assembleDomainModel returns — never alongside discovery.ts. Resolving a hyphenated single-letter
// `D` token correctly as a decision, scoped by the artifact it was found in (D-14's "never a single
// global namespace" instruction), needs each artifact's resolved `kind`, which parseWithRegistry
// already produces — this is why scanMentions takes the flat ParsedArtifact[] straight from
// dispatch, not the assembled domain graph, where a Plan/PlanSummary no longer carries a raw body.
//
// scanMentions() is a pure function of its input and returns a brand-new MentionIndex every call;
// snapshot.ts assigns the result rather than merging into a previous one, so an index that quietly
// accumulates across refreshes — the exact failure mode a future file watcher would surface — cannot
// happen structurally.
import type { ParsedArtifact } from './types.ts';
import type { IdScheme, Mention, MentionIndex } from '../domain/model.ts';

// Re-exported so callers of this module never need to import from '../domain/model.ts' just to name
// these types — mirrors crossref.ts's `Reference` re-export. See domain/model.ts's own comment on
// Mention/MentionIndex for why the types are defined there instead of here.
export type { IdScheme, Mention, MentionIndex } from '../domain/model.ts';

// D-13's four schemes — exactly what NAV-02, NAV-03, and NAV-07 consume. Everything else in
// GSD-DOMAIN.md's nine-scheme inventory (threat ids, wave numbers, windows-ledger integers) is read
// only from structured frontmatter, never scanned out of prose — those are precisely the schemes with
// no distinctive shape, where a bare integer would match any number in any document.
//
// T-01-11 (DoS): every pattern below is anchored on a word boundary with bounded quantifiers and no
// nested unbounded groups, so none of them can exhibit catastrophic backtracking regardless of input
// size or shape. The combined scan (collectRawMatches) also walks the text exactly once per scheme,
// never composing these expressions into one another.
export const ID_PATTERNS: Record<IdScheme, RegExp> = {
  // A prefix of two-or-more uppercase/digit characters (must start with a letter), a hyphen, then
  // two-or-more digits. Deliberately requires >=2 prefix characters — `[A-Z][A-Z0-9]+`, not `*` — so a
  // single-letter `D-NN` token can never match here. That precedence is what keeps decision ids and
  // requirement ids from colliding (D-14), with no reliance on expression ordering.
  requirement: /\b[A-Z][A-Z0-9]+-\d{2,}\b/g,
  // Literally the letter D, per GSD-DOMAIN.md's confirmed `D-NN` decision-id grammar. A summary
  // coverage deliverable id (`D1`, `D2` — no hyphen) can never match this pattern: the hyphen is what
  // separates the two `D`-prefixed namespaces, not artifact context.
  decision: /\bD-\d+\b/g,
  // A phase-plan pair (`01-02`). The leading negative lookbehind and the two lookaheads reject every
  // fragment of an ISO date (`2026-08-23`): a first numeric group of four-or-more digits is rejected
  // outright by `(?!\d{4}-)`, and a candidate match immediately preceded by a digit-hyphen pair
  // (`(?<!\d-)`) or immediately followed by a further hyphen-digit group (`(?!-\d)`) — i.e. the rest of
  // that same date — is rejected too, so no inner fragment of a longer numeric run can be mistaken for
  // a plan id.
  plan: /(?<!\d-)\b(?!\d{4}-)\d{2,3}-\d{2,3}\b(?!-\d)/g,
  // The word "Phase" followed by a number token: digits, an optional single-letter variant suffix, and
  // optional dotted sub-phase segments. Case-insensitive (GSD headers capitalize it, prose is not
  // always consistent). Carries the `d` (hasIndices) flag so the number group's OWN span — not the
  // whole "Phase N" match — can be recovered; the reported mention id and offset are the number alone,
  // never the word "Phase".
  phase: /\bPhase\s+(\d+[A-Z]?(?:\.\d+)*)\b/gid,
};

/**
 * D-15: blanks every fenced code block and inline code span with an equal-length run of spaces, so
 * the returned string is exactly the same length as `markdown` and every offset into it still indexes
 * to the same position in the original document. Fenced blocks are blanked first, then inline spans,
 * so a backtick pair inside a fence — already replaced with spaces — is never mistaken for a span
 * delimiter by the second pass.
 *
 * Accepted, known cost (D-15): an id quoted in backticks (`` `AUTH-01` ``) is missed. GSD authors do
 * this constantly; the corpus is dense with code that trips these patterns (constants, hyphenated
 * names, branch names), and prose mentions are what the linking requirements are about.
 */
export function stripCodeForScanning(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length)).replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

const EXCERPT_MAX_LENGTH = 160;

interface LineIndex {
  content: string;
  /** Zero-based offset of the start of each line, index 0 is always the document start (line 1). */
  starts: number[];
}

function buildLineIndex(content: string): LineIndex {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') starts.push(i + 1);
  }
  return { content, starts };
}

/** Binary-searches for the one-based line number containing `offset`. */
function lineNumberAt(index: LineIndex, offset: number): number {
  let lo = 0;
  let hi = index.starts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (index.starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** The [start, end) byte range of the given one-based line, excluding its trailing newline. */
function lineBounds(index: LineIndex, oneBasedLine: number): { start: number; end: number } {
  const i = oneBasedLine - 1;
  const start = index.starts[i];
  const end = i + 1 < index.starts.length ? index.starts[i + 1] - 1 : index.content.length;
  return { start, end };
}

/** A bounded excerpt of the line containing [matchStart, matchEnd) — the whole line when short enough, otherwise a window centered on the match. */
function excerptFor(index: LineIndex, lineStart: number, lineEnd: number, matchStart: number, matchEnd: number): string {
  const line = index.content.slice(lineStart, lineEnd);
  if (line.length <= EXCERPT_MAX_LENGTH) return line.trim();
  const relStart = matchStart - lineStart;
  const relEnd = matchEnd - lineStart;
  const half = Math.max(0, Math.floor((EXCERPT_MAX_LENGTH - (relEnd - relStart)) / 2));
  let windowStart = Math.max(0, relStart - half);
  const windowEnd = Math.min(line.length, windowStart + EXCERPT_MAX_LENGTH);
  windowStart = Math.max(0, windowEnd - EXCERPT_MAX_LENGTH);
  return line.slice(windowStart, windowEnd).trim();
}

interface RawMatch {
  scheme: IdScheme;
  id: string;
  /** The full matched span, used only for overlap detection during selection. */
  fullStart: number;
  fullEnd: number;
  /** The reported span — for every scheme but phase this equals [fullStart, fullEnd). For phase it is the number token's own span, excluding the word "Phase". */
  idStart: number;
  idEnd: number;
}

type ExecWithIndices = RegExpExecArray & { indices?: Array<[number, number] | undefined> };

/**
 * Runs every scheme's pattern over `strippedText` once, then walks the combined match set left to
 * right, greedily keeping the longest match starting earliest and discarding anything overlapping an
 * already-kept match. This is the single combined pass D-14 calls for: a token is counted under
 * exactly one scheme, never two, and never by expression-ordering luck.
 */
function collectRawMatches(strippedText: string): RawMatch[] {
  const candidates: RawMatch[] = [];
  for (const scheme of Object.keys(ID_PATTERNS) as IdScheme[]) {
    const pattern = ID_PATTERNS[scheme];
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(strippedText)) !== null) {
      const fullStart = m.index;
      const fullEnd = m.index + m[0].length;
      let idText = m[0];
      let idStart = fullStart;
      let idEnd = fullEnd;
      if (scheme === 'phase') {
        idText = m[1];
        const groupIndices = (m as ExecWithIndices).indices?.[1];
        if (groupIndices) {
          idStart = groupIndices[0];
          idEnd = groupIndices[1];
        } else {
          // Defensive fallback if hasIndices is ever unavailable — locate the group text within the
          // full match rather than reporting the whole "Phase N" span as the id's position.
          const offsetWithinMatch = m[0].indexOf(idText);
          idStart = fullStart + (offsetWithinMatch >= 0 ? offsetWithinMatch : 0);
          idEnd = idStart + idText.length;
        }
      }
      candidates.push({ scheme, id: idText, fullStart, fullEnd, idStart, idEnd });
      if (m[0].length === 0) pattern.lastIndex += 1; // defensive: none of these patterns can match empty, but never loop forever
    }
  }

  candidates.sort((a, b) => {
    if (a.fullStart !== b.fullStart) return a.fullStart - b.fullStart;
    return b.fullEnd - b.fullStart - (a.fullEnd - a.fullStart); // longer match first at the same start
  });

  const selected: RawMatch[] = [];
  let cursor = -1;
  for (const candidate of candidates) {
    if (candidate.fullStart >= cursor) {
      selected.push(candidate);
      cursor = candidate.fullEnd;
    }
  }
  return selected;
}

/** Scans one already-parsed artifact's body for every id-shaped mention, in the context of its own resolved `kind` (D-14). */
function scanArtifact(artifact: ParsedArtifact): Mention[] {
  const { body, ref } = artifact;
  if (body.length === 0) return [];
  const stripped = stripCodeForScanning(body);
  const rawMatches = collectRawMatches(stripped);
  if (rawMatches.length === 0) return [];

  const lineIndex = buildLineIndex(body);
  return rawMatches.map((match): Mention => {
    const line = lineNumberAt(lineIndex, match.idStart);
    const { start: lineStart, end: lineEnd } = lineBounds(lineIndex, line);
    return {
      scheme: match.scheme,
      id: match.id,
      artifactPath: ref.path,
      artifactKind: ref.kind,
      position: { line, offset: match.idStart },
      excerpt: excerptFor(lineIndex, lineStart, lineEnd, match.idStart, match.idEnd),
    };
  });
}

/**
 * Builds the whole decision-mention index from scratch over every already-parsed artifact (D-16).
 * Pure: never mutates its input, never reads or writes any previous index. Grouped strictly by
 * `{scheme}:{id}` (D-14) — a bare-id index would let a decision id and a same-text requirement or
 * phase-number id collide.
 */
export function scanMentions(artifacts: ParsedArtifact[]): MentionIndex {
  const all: Mention[] = [];
  for (const artifact of artifacts) {
    all.push(...scanArtifact(artifact));
  }
  // Deterministic ordering so goldens are stable — by artifact path, then position within it.
  all.sort((a, b) => a.artifactPath.localeCompare(b.artifactPath) || a.position.offset - b.position.offset);

  const byId: Record<string, Mention[]> = {};
  for (const mention of all) {
    const key = `${mention.scheme}:${mention.id}`;
    const bucket = byId[key];
    if (bucket) bucket.push(mention);
    else byId[key] = [mention];
  }

  return { byId, all };
}
