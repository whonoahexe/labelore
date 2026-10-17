// The dashboard ledger (quick-261018-4tb, sketch 026 B + P1): everything the dashboard shows below
// the project head, built once per snapshot from the in-memory domain model. Nothing here touches
// the filesystem, and every extractor is total: an unknown or malformed file gives an empty
// section, never a throw.
//
// T-4tb-02 (denial of service): section and entry text is capped before any regex runs
// (MAX_SECTION_CHARS, MAX_ENTRIES, MAX_ENTRY_CHARS) and only linear or bounded regexes are used.
// T-4tb-03: every function below is total; the tests cover each degradation.
// T-4tb-04: links come from the source resolver (route builders over discovered artifacts).
import type { Project } from '../domain/model.ts';
import {
  createSourceResolver,
  type LedgerMentionDto,
  type LedgerSourceDto,
  type SourceGroup,
} from './document-sources.ts';

const MAX_SECTION_CHARS = 200_000;
const MAX_ENTRIES = 1_000;
const MAX_ENTRY_CHARS = 4_000;

export interface LedgerBlockerDto {
  key: string;
  /** The `**Group**` line the blocker sits under, without a trailing colon or full stop. */
  group: string | null;
  urgent: boolean;
  resolved: boolean;
  /** A caps lead such as `ACTIVE PAUSE`, or the resolution word of a struck-through entry. */
  tag: string | null;
  title: string;
  why: string | null;
  /** The whitespace-collapsed entry, for the Copy text button. */
  text: string;
  sources: LedgerSourceDto[];
  mentions: LedgerMentionDto[];
  moreMentions: number;
}

export interface DashboardLedgerDto {
  blockers: LedgerBlockerDto[];
}

export function emptyLedger(): DashboardLedgerDto {
  return { blockers: [] };
}

interface Bullet {
  text: string;
  group: SourceGroup | null;
}

function sectionBody(project: Project, field: string): string | null {
  const state = Object.values(project.artifacts).find((artifact) => artifact.kind === 'state');
  const section = state?.structured[field];
  if (section === null || typeof section !== 'object') return null;
  const body = (section as { body?: unknown }).body;
  return typeof body === 'string' ? body.slice(0, MAX_SECTION_CHARS) : null;
}

const ABSENT_MARKERS = new Set(['none', 'none yet', '*(none)*', 'no blockers', 'n/a']);

function isPlaceholder(text: string): boolean {
  return ABSENT_MARKERS.has(text.trim().replace(/\.$/, '').toLowerCase());
}

/** Top-level bullets joined with their wrapped and nested continuation lines, each with the
 * `**Group**` line it sits under. A non-bullet bold line starts a group; a blank line closes the
 * entry being read. */
function readBullets(body: string): Bullet[] {
  const bullets: Bullet[] = [];
  let group: SourceGroup | null = null;
  let current: Bullet | null = null;
  for (const line of body.split('\n')) {
    const bold = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (bold && !/^ ?[-*+]\s/.test(line)) {
      group = { name: bold[1].replace(/[:.]$/, ''), note: bold[2].slice(0, MAX_ENTRY_CHARS) || null };
      current = null;
      continue;
    }
    const bullet = line.match(/^ ?[-*+]\s+(.*)$/);
    if (bullet) {
      if (bullets.length >= MAX_ENTRIES) break;
      current = { text: bullet[1].slice(0, MAX_ENTRY_CHARS), group };
      bullets.push(current);
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      if (current.text.length < MAX_ENTRY_CHARS) {
        current.text = `${current.text} ${line.trim().replace(/^[-*+]\s+/, '')}`.slice(0, MAX_ENTRY_CHARS);
      }
    } else if (!line.trim()) {
      current = null;
    }
  }
  return bullets
    .map((bullet) => ({ ...bullet, text: bullet.text.replace(/\s+/g, ' ').trim() }))
    .filter((bullet) => bullet.text.length > 0 && !isPlaceholder(bullet.text));
}

/** "**Lead.** rest", else "title — why", else the whole thing as the title. */
function splitTitle(text: string): { title: string; why: string | null } {
  const bold = text.match(/^\*\*(.+?)\*\*[\s:—-]*(.*)$/);
  if (bold) return { title: bold[1].replace(/[.:]$/, ''), why: bold[2] || null };
  const dash = text.indexOf(' — ');
  if (dash > 0) return { title: text.slice(0, dash), why: text.slice(dash + 3) };
  return { title: text, why: null };
}

/** Strips leading whitespace, symbols and emoji, and collapses whitespace. */
function cleanText(text: string): string {
  return text
    .replace(/^(?:[\s☀-➿\u{1F300}-\u{1FAFF}]|️)+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ParsedBlocker {
  urgent: boolean;
  resolved: boolean;
  tag: string | null;
  title: string;
  why: string | null;
}

function parseBlocker(raw: string): ParsedBlocker {
  const urgent = /^\s*⚠/.test(raw) || /\bexpires?\b|\bbefore 20\d\d-\d\d-\d\d/.test(raw);
  let text = cleanText(raw);
  let tag: string | null = null;
  // "~~old~~ **RESOLVED 2026-06-30:** how": struck through and marked resolved in place.
  const struck = text.match(/^~~(.+?)~~\s*\*\*([A-Z][A-Z +]+?)(?:\s+[\d-]+)?:?\*\*:?\s*(.*)$/);
  if (struck) {
    return {
      urgent: false,
      resolved: true,
      tag: struck[2].split(/\s*\+\s*/)[0],
      title: struck[1].replace(/^[A-Z][A-Z ]+ — /, ''),
      why: struck[3] || null,
    };
  }
  // "**ACTIVE PAUSE — title:** rest": the caps lead is a tag.
  const lead = text.match(/^\*\*([A-Z][A-Z ]{2,}?)(?: — |\s+(?=[a-z]))/);
  if (lead) {
    tag = lead[1].trim();
    text = `**${text.slice(lead[0].length)}`;
  }
  const resolved = /\b(COMPLETE|RESOLVED|CLOSED)\b/.test(text.slice(0, 120));
  const parts = splitTitle(text.replace(/^\*\*(.)/, (_match, first: string) => `**${first.toUpperCase()}`));
  // A long plain blocker: its first sentence is the title, the rest is the detail.
  if (!parts.why && text.length > 140) {
    const sentence = text.match(/^(.{30,}?[.!?])\s+(.+)$/);
    if (sentence) return { urgent, resolved, tag, title: sentence[1], why: sentence[2] };
  }
  return { urgent, resolved, tag, ...parts };
}

export function buildDashboardLedger(project: Project): DashboardLedgerDto {
  const resolver = createSourceResolver(project);
  const blockersBody = sectionBody(project, 'blockersConcerns');
  const blockers = blockersBody
    ? readBullets(blockersBody).map((bullet, index): LedgerBlockerDto => {
        const parsed = parseBlocker(bullet.text);
        const trail = resolver.sourcesOf(bullet.text, bullet.group);
        return {
          key: `blocker-${index}`,
          group: bullet.group?.name ?? null,
          ...parsed,
          text: bullet.text,
          ...trail,
        };
      })
    : [];
  return { blockers };
}
