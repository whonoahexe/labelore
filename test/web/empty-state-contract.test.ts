// D-06 through D-09 source-text contract suite, in the style of test/web/shell-contract.test.ts
// and test/web/degradation-ui-contract.test.ts. Web-layer files are read as raw text and never
// imported: tsconfig.server.json (which this test runs under) includes test/**/*.ts but excludes
// src/web/**, and sets no --jsx option.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('empty-state contract (D-06, D-07, D-08, D-09)', () => {
  it('declares EMPTY_STATE_MESSAGE byte-identical to the string tree-navigator.tsx already renders for an empty group (D-08)', async () => {
    const emptyState = await source('src/web/components/empty-state.tsx');
    const tree = await source('src/web/components/tree-navigator.tsx');
    expect(emptyState).toContain("export const EMPTY_STATE_MESSAGE = 'Nothing here yet.';");
    expect(tree).toContain('<p className="empty-note">Nothing here yet.</p>');
  });

  it('is imported by every optional-content surface, none of which re-types the message literal directly (D-08)', async () => {
    const roadmap = await source('src/web/pages/roadmap-page.tsx');
    const traceability = await source('src/web/pages/traceability-page.tsx');
    const artifact = await source('src/web/pages/artifact-page.tsx');

    for (const [name, page] of [
      ['roadmap-page.tsx', roadmap],
      ['traceability-page.tsx', traceability],
      ['artifact-page.tsx', artifact],
    ] as const) {
      expect(page, name).toContain("import { EmptyState } from '../components/empty-state.tsx';");
      expect(page, name).not.toContain('Nothing here yet.');
    }
  });

  it("removes roadmap-page.tsx's six former bespoke absence sentences, replaced by <EmptyState /> (D-08)", async () => {
    const roadmap = await source('src/web/pages/roadmap-page.tsx');
    const removedSentences = [
      'No success criteria authored.',
      'No requirements mapped.',
      'No plans are present for this phase.',
      'No phases in {milestone.name}',
      'This milestone has an authored identity but no phase rows yet.',
      'No active milestone exists in this snapshot.',
      'No archived milestones are present in this snapshot.',
    ];
    for (const sentence of removedSentences) {
      expect(roadmap, sentence).not.toContain(sentence);
    }
    expect((roadmap.match(/<EmptyState/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it("removes traceability-page.tsx's former no-requirements sentence, but keeps its filter-result sentence (D-08, scope rule)", async () => {
    const traceability = await source('src/web/pages/traceability-page.tsx');
    expect(traceability).not.toContain('No requirements are present in this snapshot.');
    expect(traceability).toContain('No requirements match the current filter.');
    expect(traceability).toContain('<EmptyState />');
  });

  it('adds <EmptyState /> to artifact-page.tsx for a document with no structured metadata, replacing the old silent null (D-08)', async () => {
    const artifact = await source('src/web/pages/artifact-page.tsx');
    expect(artifact).toMatch(/\{panels\.length > 0 \? \([\s\S]*?\) : \(\s*<EmptyState \/>\s*\)\}/);
  });

  it('leaves dashboard-page.tsx untouched — its two all-clear sentences and on-deck sentence still exist (scope rule)', async () => {
    const dashboard = await source('src/web/pages/dashboard-page.tsx');
    expect(dashboard).toContain(
      'No dependency-ready work is reported in the active milestone.',
    );
    expect(dashboard).toContain(
      'No discrepancy, blocker, dependency wait, or human gate needs attention.',
    );
    expect(dashboard).toContain('No additional work is queued after this item.');
    expect(dashboard).not.toContain('EmptyState');
  });

  it('globals.css carries the quiet-toned generic empty-state icon rule alongside the original accent-colored rule, scoped by data-tone (D-09)', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(
      /\.quiet-state svg,\s*\n\.empty-flow svg\s*\{[^}]*color:\s*var\(--primary\);[^}]*\}/,
    );
    expect(css).toMatch(
      /\.empty-flow\[data-tone='quiet'\]\s*svg\s*\{\s*color:\s*var\(--muted-foreground\);\s*\}/,
    );
  });

  it('empty-state.tsx never references the accent color or applies a destructive/warning data-tone — absence must not read as damage (D-09)', async () => {
    const emptyState = await source('src/web/components/empty-state.tsx');
    expect(emptyState).not.toContain('var(--primary)');
    expect(emptyState).not.toContain("data-tone='destructive'");
    expect(emptyState).not.toContain('data-tone="destructive"');
    expect(emptyState).not.toContain("data-tone='warning'");
    expect(emptyState).not.toContain('data-tone="warning"');
    expect(emptyState).toContain('data-tone="quiet"');
  });
});
