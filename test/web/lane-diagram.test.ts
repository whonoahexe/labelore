// quick-260930-mp6 (W-lanes, W-nodes, K-fallback): static markup for LaneDiagramFigure against the
// studio-portal fixtures, and the RESEARCH view drawing labelore v1.0/02 as lanes. The renderer is
// exercised with renderToStaticMarkup (the clean-tree.test.ts idiom); geometry is covered by
// test/rendering/lane-layout.test.ts, and clicks by the narrow research-briefing e2e spec.
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { tryParseFrontmatter } from '../../src/planning-repo/frontmatter.ts';
import { extractResearchBriefing } from '../../src/planning-repo/handlers/research-briefing.ts';
import { LANE_ORDER } from '../../src/rendering/lane-layout.ts';
import { LaneDiagramFigure } from '../../src/web/components/lane-diagram.tsx';
import { composeResearchBriefing } from '../../src/web/views/research-briefing.ts';
import { ResearchBriefingView } from '../../src/web/views/research-briefing-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const fixture = (name: string): Promise<string> => readFile(new URL(`../rendering/fixtures/${name}-diagram.txt`, import.meta.url), 'utf8');
const STORAGE = await fixture('sp-v1-02-storage-health');
const FILE_BROWSING = await fixture('sp-v1-03-file-browsing');

const figure = (text: string): string => renderToStaticMarkup(createElement(LaneDiagramFigure, { text, title: 'System architecture' }));
const count = (html: string, pattern: RegExp): number => (html.match(pattern) ?? []).length;

describe('LaneDiagramFigure — storage health (drawn)', () => {
  const html = figure(STORAGE);

  it('renders nine node buttons, six lane bands with heads in LANE_ORDER, and exactly one Client node', () => {
    expect(count(html, /<button type="button" class="lane-diagram-node"/g)).toBe(9);
    expect(count(html, /class="lane-diagram-lane"/g)).toBe(6);
    const heads = [...html.matchAll(/<span class="lane-diagram-lane-head">.*?<\/svg>([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(heads).toEqual(['Client', 'Service', 'Worker', 'Channel', 'Data', 'External']);
    const lower = heads.map((h) => h.toLowerCase());
    expect(lower).toEqual(LANE_ORDER.filter((k) => lower.includes(k)));
    expect(count(html, /data-kind="client"/g)).toBe(1);
  });

  it('draws ten wires in an aria-hidden svg, and offers Shown as drawn (not pressed)', () => {
    expect(html).toMatch(/<svg class="lane-diagram-wires"[^>]*aria-hidden="true"/);
    expect(count(html, /class="lane-diagram-wire"/g)).toBe(10);
    expect(html).toMatch(/<button type="button" class="status-chip" aria-pressed="false">Shown as drawn<\/button>/);
    expect(html).not.toContain('lifted-diagram-card');
  });

  it('marks the narrow nodes compact at the default budget', () => {
    expect(count(html, /data-compact="true"/g)).toBe(9);
  });

  it('never uses the destructive or warning tone, or raw HTML injection', () => {
    expect(html).not.toMatch(/data-tone="(destructive|warning)"/);
  });
});

describe('LaneDiagramFigure — a thin graph keeps the author layout (K-fallback)', () => {
  it('file browsing: the quiet fallback chip over the lifted figure, and no lane nodes', () => {
    const html = figure(FILE_BROWSING);
    expect(html).toContain('<span class="status-chip" data-tone="quiet">Shown as drawn</span>');
    expect(html).toContain("This figure keeps the author&#x27;s layout.");
    expect(html).toContain('lifted-diagram-card');
    expect(html).not.toContain('lane-diagram-node');
    // No toggle button: the figure is already as drawn.
    expect(html).not.toMatch(/<button[^>]*aria-pressed="(true|false)">Shown as drawn/);
  });
});

describe('ResearchBriefingView — labelore v1.0/02 as lanes', () => {
  it('draws 23 lane nodes inside #research-architecture', () => {
    const LB02 = new URL('../../.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md', import.meta.url);
    const briefing = extractResearchBriefing(tryParseFrontmatter(readFileSync(LB02, 'utf8')).body);
    const input: ViewInput = {
      kind: 'research',
      frontmatter: {},
      structured: { briefing },
      groups: briefing.sections.map((s) => ({ id: s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-'), heading: s.heading, html: 'x' })),
      planSegments: [],
    };
    const composed = composeResearchBriefing(input);
    expect(composed).not.toBeNull();
    const html = renderToStaticMarkup(
      createElement(ResearchBriefingView, { briefing: composed as NonNullable<typeof composed>, onShowSource: () => {}, title: 'Research' }),
    );
    const start = html.indexOf('id="research-architecture"');
    expect(start).toBeGreaterThan(-1);
    const chapter = html.slice(start);
    expect(count(chapter.slice(0, chapter.indexOf('</section>')), /class="lane-diagram-node"/g)).toBe(23);
  });
});
