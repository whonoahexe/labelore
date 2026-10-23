// RETROSPECTIVE.md — the living retrospective, one `## Milestone: vX.Y — Name` section per shipped
// milestone. Each section's `### What Worked`, `### What Was Inefficient`, `### Patterns
// Established` and `### Key Lessons` subsections are lifted as point lists; every other subsection
// (What Was Built, Cost Observations, ...) and every non-milestone `##` section (Cross-Milestone
// Trends) is left to the rendered document.
//
// Every scan below is one linear pass over lines with bounded, single-line patterns, and section,
// entry and point sizes are capped before any of it runs.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections, splitSubsections } from './markdown-sections.ts';

const MAX_SECTION_CHARS = 100_000;
const MAX_ENTRIES = 200;
const MAX_POINTS = 200;
const MAX_TEXT_CHARS = 4_000;

export interface RetroPoint {
  /** The point's bold opening, `Data before pixels.`, or null when it has none. */
  lead: string | null;
  /** The rest of the point, wrapped lines joined by a space. */
  text: string;
}

export type RetroSectionKey = 'worked' | 'inefficient' | 'patterns' | 'lessons';

export interface RetrospectiveEntry {
  /** `v1.0`, as the heading wrote it. */
  version: string;
  /** The heading's name, without the version: `MVP`. */
  name: string;
  /** The `##` heading text as written, for anchoring a link to the section. */
  heading: string;
  /** Each lifted subsection's points; an absent subsection is an empty list. */
  sections: Record<RetroSectionKey, RetroPoint[]>;
}

// `Milestone: v1.0 — MVP`; the `Milestone:` prefix is optional. Both captures are bounded.
const ENTRY_HEADING_RE = /^(?:milestone:?\s+)?(v\d+(?:\.\d+){0,3})\b[\s:—–-]*(.{0,200}?)\s*$/i;
const ITEM_LINE_RE = /^\s*(?:[-*]|\d{1,3}[.)])\s+(.*)$/;
// `**Lead.** rest` — the lead is bounded and may not contain `*`.
const LEAD_RE = /^\*\*([^*]{1,300})\*\*\s*(.*)$/;

const SECTION_LABELS: Record<RetroSectionKey, RegExp> = {
  worked: /^what worked$/i,
  inefficient: /^what (?:was )?inefficient$/i,
  patterns: /^patterns established$/i,
  lessons: /^key lessons$/i,
};

function cap(text: string): string {
  return text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS - 1)}…` : text;
}

function readPoints(body: string): RetroPoint[] {
  const items: string[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const item = line.match(ITEM_LINE_RE);
    if (item) {
      if (items.length >= MAX_POINTS) break;
      items.push(item[1].trim());
    } else if (items.length > 0 && /^\s{2,}/.test(line)) {
      // An indented line under a point wraps that point.
      items[items.length - 1] = `${items[items.length - 1]} ${trimmed}`;
    }
  }
  return items.map((item) => {
    const lead = item.match(LEAD_RE);
    return lead ? { lead: cap(lead[1].trim()), text: cap(lead[2].trim()) } : { lead: null, text: cap(item) };
  });
}

function readEntry(heading: string, body: string): RetrospectiveEntry | null {
  const match = heading.match(ENTRY_HEADING_RE);
  if (!match) return null;
  const sections: Record<RetroSectionKey, RetroPoint[]> = { worked: [], inefficient: [], patterns: [], lessons: [] };
  const keys = Object.keys(SECTION_LABELS) as RetroSectionKey[];
  for (const sub of splitSubsections(body.slice(0, MAX_SECTION_CHARS))) {
    const key = keys.find((candidate) => SECTION_LABELS[candidate].test(sub.heading));
    // The first subsection of a kind wins a repeat.
    if (key && sections[key].length === 0) sections[key] = readPoints(sub.body);
  }
  return { version: match[1], name: match[2].trim(), heading, sections };
}

export function parseRetrospectiveEntries(body: string): RetrospectiveEntry[] {
  const entries: RetrospectiveEntry[] = [];
  for (const section of splitSections(body)) {
    if (entries.length >= MAX_ENTRIES) break;
    const entry = readEntry(section.heading, section.body);
    if (entry) entries.push(entry);
  }
  return entries;
}

export const RetrospectiveHandler: ArtifactHandler = {
  kind: 'retrospective',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'RETROSPECTIVE.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: { entries: parseRetrospectiveEntries(fm.body) },
    };
  },
};
