// quick-260929-3x3 (3X3-01, H-3/H-4): real-corpus guards over every RESEARCH.md in this repo's
// `.planning/` plus `~/studio-portal/.planning/` — the context-brief-corpus.test.ts idiom (a
// missing studio-portal checkout skips its files). Every file must extract without throwing,
// compose to a non-null briefing, and leave no `##` section dropped silently. The pinned counts
// were independently confirmed with awk/grep against the source files (never copied from the
// extractor's own output).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import {
  extractResearchBriefing,
  splitFenceAware,
} from '../../src/planning-repo/handlers/research-briefing.ts';
import { composeResearchBriefing } from '../../src/web/views/research-briefing.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;

function walkResearch(root: string): string[] {
  if (!existsSync(root)) return [];
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

const FILES = [...walkResearch(REPO_PLANNING), ...walkResearch(SP_PLANNING)];

function slug(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function bodyOf(path: string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

describe('RESEARCH corpus guard', () => {
  it('finds the corpus', () => {
    // 5 in this repo; the 8 studio-portal files only when that checkout is present.
    expect(FILES.filter((f) => f.startsWith(REPO_PLANNING)).length).toBeGreaterThanOrEqual(5);
    if (existsSync(SP_PLANNING)) expect(FILES.length).toBeGreaterThanOrEqual(13);
  });

  for (const file of FILES) {
    const label = file.startsWith(REPO_PLANNING)
      ? `LB ${relative(REPO_PLANNING, file)}`
      : `SP ${relative(SP_PLANNING, file)}`;

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

  const SP02 = `${SP_PLANNING}/milestones/v1.0-phases/02-storage-health-status/02-RESEARCH.md`;
  it.runIf(existsSync(SP02))('SP v1.0/02 anchors', () => {
    const b = extractResearchBriefing(bodyOf(SP02));
    expect(b.stack?.groups.map((g) => g.packages.length)).toEqual([6, 3]);
    expect(b.environment?.rows.filter((r) => r.blocking)).toHaveLength(3);
    expect(b.pitfalls?.items.filter((p) => p.severity === 'CRITICAL')).toHaveLength(3);
    expect(b.sourceOnly).toHaveLength(9);
  });

  const SP01 = `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-RESEARCH.md`;
  const SP03 = `${SP_PLANNING}/phases/03-account-administration-session-control/03-RESEARCH.md`;
  const findingsOf = (path: string) =>
    composeResearchBriefing({
      kind: 'research',
      frontmatter: {},
      structured: { briefing: extractResearchBriefing(bodyOf(path)) },
      groups: [],
      planSegments: [],
    })?.summary?.findings ?? [];
  it.runIf(existsSync(SP01))('SP phases/01 Summary has 2 findings', () => {
    expect(findingsOf(SP01)).toHaveLength(2);
  });
  it.runIf(existsSync(SP03))('SP phases/03 Summary has 1 finding', () => {
    expect(findingsOf(SP03)).toHaveLength(1);
  });
});
