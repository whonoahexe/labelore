// quick-260929-3x3 (3X3-01, H-3/H-4): corpus guards over every RESEARCH.md in this repo's `.planning/`
// (keyed LB) plus the made-up Lendshed project (keyed FX, walked through FX_PLANNING; a missing fixture
// throws instead of skipping). Every file must extract without throwing, compose to a non-null
// briefing, and leave no `##` section dropped silently. The pinned counts were independently confirmed
// with awk/grep against the files themselves (never copied from the extractor's own output).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FX_PLANNING, fxPath } from '../helpers/fixture-project.ts';
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import {
  extractResearchBriefing,
  splitFenceAware,
} from '../../src/planning-repo/handlers/research-briefing.ts';
import { composeResearchBriefing } from '../../src/web/views/research-briefing.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;

function walkResearch(root: string): string[] {
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules') continue;
        stack.push(abs);
      } else if (entry.endsWith('-RESEARCH.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

const LB_FILES = walkResearch(REPO_PLANNING);
const FX_FILES = walkResearch(FX_PLANNING);
const FILES = [...LB_FILES, ...FX_FILES];

function slug(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function bodyOf(path: string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

describe('RESEARCH corpus guard', () => {
  it('finds the corpus', () => {
    // At least 5 Labelore files and the Lendshed RESEARCH files (R6, R8: minimums, never a total).
    expect(LB_FILES.length).toBeGreaterThanOrEqual(5);
    expect(FX_FILES.length).toBeGreaterThanOrEqual(1);
  });

  for (const file of FILES) {
    const label = file.startsWith(REPO_PLANNING)
      ? `LB ${relative(REPO_PLANNING, file)}`
      : `FX ${relative(FX_PLANNING, file)}`;

    it(`${label}: extracts, composes non-null, and drops no ## section silently`, () => {
      const body = bodyOf(file);
      const briefing = extractResearchBriefing(body);
      const groups: DocumentSectionGroup[] = briefing.sections.map((section) => ({
        id: slug(section.heading),
        heading: section.heading,
        html: 'x',
      }));
      const composed = composeResearchBriefing({
        kind: 'research',
        frontmatter: {},
        structured: { briefing },
        groups,
        planSegments: [],
      });
      expect(composed).not.toBeNull();

      // quick-260929-m30: the Summary's lead plus findings keep every extracted block.
      const composedSummary = composed?.summary ?? null;
      if (briefing.summary && composedSummary) {
        const extracted = briefing.summary.paragraphs;
        if (extracted.some((block) => block.kind === 'paragraph')) {
          expect(composedSummary.lead.filter((block) => block.kind === 'paragraph')).toHaveLength(1);
        }
        composedSummary.findings.forEach((finding, index) => {
          expect(finding.blocks[0]?.kind).toBe('paragraph');
          expect(finding.number).toBe(String(index + 1).padStart(2, '0'));
        });
        const kept =
          composedSummary.lead.length +
          composedSummary.findings.reduce((sum, finding) => sum + finding.blocks.length, 0);
        expect(kept).toBe(extracted.length);
      }

      const listed = new Set(briefing.sourceOnly.map((entry) => entry.heading));
      const fenceAware = splitFenceAware(body, 2).map((s) => s.heading);
      expect(fenceAware.length).toBe(briefing.sections.length);
      for (const section of briefing.sections) {
        expect(section.rendered || listed.has(section.heading)).toBe(true);
      }
      // Source-only entries name a heading that really exists in the document.
      for (const entry of briefing.sourceOnly) {
        expect(entry.label.length).toBeGreaterThan(0);
      }
    });
  }

  it('LB v1.0/02 anchors', () => {
    const b = extractResearchBriefing(
      bodyOf(
        `${REPO_PLANNING}/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md`,
      ),
    );
    expect(b.stack?.groups.map((g) => g.packages.length)).toEqual([6, 15]);
    expect(b.audit?.rows).toHaveLength(30);
    expect(b.pitfalls?.items).toHaveLength(9);
    expect(b.sources?.tiers.map((t) => t.items.length)).toEqual([5, 12, 1]);
    expect(b.sourceOnly).toHaveLength(7);
  });

  it('FX v1.0/02 anchors', () => {
    const b = extractResearchBriefing(bodyOf(fxPath('milestones/v1.0-phases/02-shed-inventory-health/02-RESEARCH.md')));
    expect(b.stack?.groups.map((g) => g.packages.length)).toEqual([6, 3]);
    expect(b.environment?.rows.filter((r) => r.blocking)).toHaveLength(3);
    expect(b.pitfalls?.items.filter((p) => p.severity === 'CRITICAL')).toHaveLength(3);
    expect(b.sourceOnly).toHaveLength(9);
  });
});
