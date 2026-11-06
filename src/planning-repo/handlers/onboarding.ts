// The onboarding summary (Phase 11, 11-20, VIEW-18, D-03, RESEARCH C11): `onboarding/SUMMARY.md`, the one fixed
// file `/gsd-onboard` writes. Four `##` sections of plain `- label: value` bullets: Project State (one line per
// planning file, `present` or `missing`), Codebase Context (brownfield, map readiness, codebase map, fast map),
// Docs Context (a candidate count) and Recommended Next Step (one bullet holding a slash command).
//
// The handler claims kind `onboarding`, keeps the generic title, frontmatter, body and warning, and adds
// `structured.onboarding` from `extractOnboarding`. The command is carried as the writer wrote it, never
// validated, never replaced and never run: the page shows it beside the command Labelore computes for a map-only
// project (presentation/onboarding-context.ts), and the two are not merged. A body with none of the four known
// headings gives no structured key; a throw only omits it (the handler guards the call).
import type { ArtifactHandler } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import { capText, findSection, listItems, sectionLines } from './seed-thread-lift.ts';

export interface OnboardingFileRow {
  /** The planning file as written: `PROJECT.md`. */
  name: string;
  /** true for `present`, false for `missing`, null for any other word. */
  present: boolean | null;
}

export interface OnboardingCodebase {
  brownfield: boolean | null;
  /** The word as written: `none`, `fast` or `complete`. */
  readiness: string | null;
  /** The codebase map's path as written (`.planning/codebase/`); null for `missing` or no line. */
  mapPath: string | null;
  /** The parenthetical after the path (`7 documents`), else null. */
  mapDetail: string | null;
  fastMapAvailable: boolean | null;
}

export interface OnboardingLift {
  files: OnboardingFileRow[];
  codebase: OnboardingCodebase;
  /** The leading number of the Docs Context line; null when the line is absent or holds no number. */
  docsCount: number | null;
  /** The Recommended Next Step's first bullet, verbatim; null when the section or bullet is absent. */
  command: string | null;
}

const KNOWN_HEADINGS: ReadonlySet<string> = new Set([
  'project state',
  'codebase context',
  'docs context',
  'recommended next step',
]);

/** `label: value` split at the first colon; null when there is no colon. */
function splitLabel(item: string): { label: string; value: string } | null {
  const colon = item.indexOf(':');
  if (colon <= 0) return null;
  return { label: item.slice(0, colon).trim(), value: item.slice(colon + 1).trim() };
}

function yesNo(value: string): boolean | null {
  const lower = value.trim().toLowerCase();
  if (lower === 'yes') return true;
  if (lower === 'no') return false;
  return null;
}

function leadingNumber(value: string): number | null {
  let end = 0;
  while (end < value.length && end < 9 && value.charCodeAt(end) >= 48 && value.charCodeAt(end) <= 57) end += 1;
  return end === 0 ? null : Number(value.slice(0, end));
}

export function extractOnboarding(body: string): OnboardingLift | null {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);
  if (!sections.some((section) => section.level === 2 && KNOWN_HEADINGS.has(section.heading.trim().toLowerCase()))) return null;

  const items = (name: string): string[] => {
    const section = findSection(sections, 2, (h) => h === name);
    return section === undefined ? [] : listItems(sectionLines(lines, section));
  };

  const files: OnboardingFileRow[] = [];
  for (const item of items('project state')) {
    const parts = splitLabel(item);
    if (parts === null) continue;
    const lower = parts.value.toLowerCase();
    files.push({ name: capText(parts.label, 200), present: lower === 'present' ? true : lower === 'missing' ? false : null });
  }

  const codebase: OnboardingCodebase = { brownfield: null, readiness: null, mapPath: null, mapDetail: null, fastMapAvailable: null };
  for (const item of items('codebase context')) {
    const parts = splitLabel(item);
    if (parts === null) continue;
    switch (parts.label.toLowerCase()) {
      case 'brownfield repo':
        codebase.brownfield = yesNo(parts.value);
        break;
      case 'map readiness':
        codebase.readiness = parts.value === '' ? null : capText(parts.value, 100);
        break;
      case 'codebase map': {
        if (parts.value === '' || parts.value.toLowerCase() === 'missing') break;
        const open = parts.value.indexOf(' (');
        if (open > 0 && parts.value.endsWith(')')) {
          codebase.mapPath = capText(parts.value.slice(0, open).trim(), 500);
          const detail = parts.value.slice(open + 2, -1).trim();
          codebase.mapDetail = detail === '' ? null : capText(detail, 200);
        } else {
          codebase.mapPath = capText(parts.value, 500);
        }
        break;
      }
      case 'fast map available':
        codebase.fastMapAvailable = yesNo(parts.value);
        break;
      default:
        break;
    }
  }

  const docs = items('docs context');
  const docsParts = docs.length === 0 ? null : splitLabel(docs[0]);
  const next = items('recommended next step');

  return {
    files,
    codebase,
    docsCount: docsParts === null ? null : leadingNumber(docsParts.value),
    command: next.length === 0 ? null : capText(next[0], 200),
  };
}

export const OnboardingHandler: ArtifactHandler = {
  kind: 'onboarding',
  match: (ref) => ref.kind === 'onboarding',
  parse(raw, ref) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let onboarding: OnboardingLift | null | undefined;
    try {
      onboarding = extractOnboarding(fm.body);
    } catch {
      onboarding = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: onboarding === undefined || onboarding === null ? {} : { onboarding },
    };
  },
};
