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
import { liftDiagram } from '../../src/rendering/ascii-lift.ts';
import { buildDiagramGraph } from '../../src/rendering/ascii-graph.ts';
import type { DiagramGraph } from '../../src/rendering/ascii-graph.ts';
import { LaneDiagram, LaneDiagramFigure, NodeDetails } from '../../src/web/components/lane-diagram.tsx';
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

const graphOf = (text: string): DiagramGraph => buildDiagramGraph(liftDiagram(text) as NonNullable<ReturnType<typeof liftDiagram>>);

describe('NodeDetails — the panel beside the diagram (W-nodes)', () => {
  const graph = graphOf(STORAGE);
  const registry = graph.nodes.find((n) => n.label.main === 'Health registry');
  const html = renderToStaticMarkup(createElement(NodeDetails, { graph, id: registry?.id ?? -1, onClose: () => {} }));

  it('shows Details, From with wire labels, To with its wire label, and As written', () => {
    expect(html).toMatch(/<aside class="lane-diagram-panel"/);
    expect(html).toContain('Details');
    expect(html).toContain('<pre class="lane-diagram-panel-pre">');
    const from = html.slice(html.indexOf('>From<'), html.indexOf('>To<'));
    for (const prober of ['Prober thread:stage', 'Prober thread:cloud', 'Prober thread:vault', 'Prober thread:archive']) {
      expect(from, prober).toContain(prober);
    }
    expect(from).toContain('<li>Prober thread:stage — <em>mpsc/watch');
    const to = html.slice(html.indexOf('>To<'), html.indexOf('>As written<'));
    expect(to).toContain('Broadcast bus');
    expect(to).toContain('Event::TierHealth { tier, state, .. , probed_at }');
    expect(html.slice(html.indexOf('>As written<'))).toContain(registry?.label.full ?? 'missing');
  });

  it('carries a Close status chip and a paragraph title, not a heading', () => {
    expect(html).toMatch(/<button type="button" class="status-chip">Close<\/button>/);
    expect(html).toMatch(/<p class="lane-diagram-panel-title"/);
    expect(html).not.toMatch(/<h[1-6]/);
  });

  it('renders nothing for a node that is not in the graph', () => {
    expect(renderToStaticMarkup(createElement(NodeDetails, { graph, id: 999, onClose: () => {} }))).toBe('');
  });
});

describe('LaneDiagram — groups, wire labels, stage semantics (W-wires)', () => {
  it('studio-portal v1.0/01: exactly one dashed group labelled Auth middleware', async () => {
    const html = renderToStaticMarkup(
      createElement(LaneDiagram, { graph: graphOf(await fixture('sp-v1-01-identity')), fit: false, label: 'System architecture' }),
    );
    expect(count(html, /class="lane-diagram-group"/g)).toBe(1);
    expect(html).toMatch(/class="lane-diagram-group-label"[^>]*>Auth middleware/);
  });

  it('storage health: the stage counts 9 nodes and 10 wires, and the fan-out wire label carries a title', () => {
    const html = renderToStaticMarkup(createElement(LaneDiagram, { graph: graphOf(STORAGE), fit: false, label: 'System architecture' }));
    expect(html).toMatch(/role="group" aria-label="System architecture: 9 nodes, 10 wires"/);
    expect(html).toMatch(/<span class="lane-diagram-wire-label"[^>]*title="fan-out"[^>]*>fan-out<\/span>/);
    expect(count(html, /class="lane-diagram-wire-label"/g)).toBe(4);
    expect(count(html, /data-compact="true"/g)).toBe(9);
    // Nothing is selected at first: no panel, no hot wire, no dimming.
    expect(html).not.toContain('lane-diagram-panel');
    expect(html).not.toContain('data-selecting');
    expect(html).not.toContain('data-hot');
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
