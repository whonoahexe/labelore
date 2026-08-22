// REQUIREMENTS.md — requirement items (id, category, text, tier, checked), the Out of Scope
// table, and the Traceability table (the ready-made requirement-to-phase join source plan 01-04
// resolves against — not resolved here).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections, splitSubsections, parseMarkdownTable } from './markdown-sections.ts';

export interface RequirementItem {
  id: string;
  category: string;
  text: string;
  tier: string;
  checked: boolean | null;
}

// GSD-DOMAIN.md "Cross-Reference and ID Conventions": [A-Z][A-Z0-9]*-\d{2,}, e.g. AUTH-01, DL-09.
// A leading `[ ]`/`[x]` checkbox is present for v1 (actionable) requirements and absent for v2 /
// future ones — captured as an optional group so both forms parse without two separate regexes.
const REQUIREMENT_ITEM_RE = /^\s*-\s*(?:\[([ xX])\]\s*)?\*\*([A-Z][A-Z0-9]*-\d{2,})\*\*:\s*(.*)$/;

function tierOf(sectionHeading: string): string {
  if (/^v1\b/i.test(sectionHeading)) return 'v1';
  if (/^v2\b/i.test(sectionHeading)) return 'v2';
  if (/future/i.test(sectionHeading)) return 'future';
  return sectionHeading;
}

function parseRequirementItems(body: string): RequirementItem[] {
  const items: RequirementItem[] = [];
  for (const section of splitSections(body)) {
    if (!/requirement/i.test(section.heading)) continue;
    const tier = tierOf(section.heading);
    for (const category of splitSubsections(section.body)) {
      for (const line of category.body.split('\n')) {
        const m = line.match(REQUIREMENT_ITEM_RE);
        if (!m) continue;
        items.push({
          id: m[2],
          category: category.heading,
          text: m[3].trim(),
          tier,
          checked: m[1] === undefined ? null : m[1].toLowerCase() === 'x',
        });
      }
    }
  }
  return items;
}

interface OutOfScopeRow {
  feature: string;
  reason: string;
}

function parseOutOfScope(body: string): OutOfScopeRow[] {
  const section = splitSections(body).find((s) => /out of scope/i.test(s.heading));
  if (!section) return [];
  return parseMarkdownTable(section.body).map((row) => ({
    feature: row['Feature'] ?? '',
    reason: row['Reason'] ?? '',
  }));
}

interface TraceabilityRow {
  requirementId: string;
  phase: string;
  status: string;
}

function parseTraceability(body: string): TraceabilityRow[] {
  const section = splitSections(body).find((s) => /traceability/i.test(s.heading));
  if (!section) return [];
  return parseMarkdownTable(section.body).map((row) => ({
    requirementId: row['Requirement'] ?? '',
    phase: row['Phase'] ?? '',
    status: row['Status'] ?? '',
  }));
}

export const RequirementsHandler: ArtifactHandler = {
  kind: 'requirements',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'REQUIREMENTS.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: {
        items: parseRequirementItems(fm.body),
        outOfScope: parseOutOfScope(fm.body),
        traceability: parseTraceability(fm.body),
      },
    };
  },
};
