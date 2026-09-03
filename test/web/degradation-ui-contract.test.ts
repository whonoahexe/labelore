// D-10 through D-13 source-text contract suite, in the style of test/web/shell-contract.test.ts
// and test/web/invalid-project-contract.test.ts. Web-layer files are read as raw text and never
// imported: tsconfig.server.json (which this test runs under) includes test/**/*.ts but excludes
// src/web/**, and sets no --jsx option.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('degradation UI contract (D-10, D-11, D-12, D-13)', () => {
  it('no persistent warning-notice row remains, and a Technical details disclosure exists instead (D-10, D-11)', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    // A className carrying both "notice" and "warning" is exactly the persistent-banner treatment
    // D-10 rejected — a single className string mixing both words, in either order.
    expect(page).not.toMatch(/className="[^"]*\bnotice\b[^"]*\bwarning\b[^"]*"/);
    expect(page).not.toMatch(/className="[^"]*\bwarning\b[^"]*\bnotice\b[^"]*"/);
    expect(page).toContain('<details className="warning-technical-details">');
    expect(page).toContain('Technical details');
  });

  it('renders one generic plain-language summary, never a per-parser-stage variant (D-11)', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain(
      "Some of this document's structured metadata could not be read. The document text below was recovered and is shown normally.",
    );
    // The summary string is never branched on a WarningStage literal.
    for (const stage of ['frontmatter', 'structured-extraction', 'assembly']) {
      expect(page).not.toMatch(new RegExp(`stage === '${stage}'`));
    }
  });

  it('renders all four ParseWarning fields verbatim in the technical-details disclosure (D-11)', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('{warning.path}');
    expect(page).toContain('{warning.stage}');
    expect(page).toContain('{warning.message}');
    expect(page).toContain('{warning.salvage}');
  });

  it('one Warning/Unreadable vocabulary spans the artifact badge, the tree indicator, and the search chip (D-12)', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    const tree = await source('src/web/components/tree-navigator.tsx');
    const search = await source('src/web/pages/search-page.tsx');

    expect(page).toContain('data-tone="warning"');
    expect(page).toMatch(/>\s*Warning\s*</);

    expect(tree).toContain('warningTone');
    expect(tree).toContain("'Warning'");
    expect(tree).toContain("'Unreadable'");

    expect(search).toContain('warningTone');
    expect(search).not.toContain('data-tone="quiet"');
  });

  it("tree-navigator.tsx's empty-group branch is untouched by this plan (D-06/D-08)", async () => {
    const tree = await source('src/web/components/tree-navigator.tsx');
    expect(tree).toContain('<p className="tree-group-label">{node.label}</p>');
    expect(tree).toContain('<p className="empty-note">Nothing here yet.</p>');
  });

  it('never renders a ParseWarning field through dangerouslySetInnerHTML (T-04-03-01)', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    const tree = await source('src/web/components/tree-navigator.tsx');

    const disclosureStart = page.indexOf('artifact-warning-disclosure');
    const disclosureEnd = page.indexOf('document-reader-layout');
    expect(disclosureStart).toBeGreaterThan(-1);
    expect(disclosureEnd).toBeGreaterThan(disclosureStart);
    const disclosureSource = page.slice(disclosureStart, disclosureEnd);
    expect(disclosureSource).not.toContain('dangerouslySetInnerHTML');

    expect(tree).not.toContain('dangerouslySetInnerHTML');
  });

  it('globals.css carries the new warning tone rule and wraps the disclosure fields instead of truncating (UI Considerations)', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(/\.status-chip\[data-tone='warning'\]\s*\{[^}]*color:\s*var\(--destructive\);[^}]*\}/);
    expect(css).toMatch(/\.artifact-warning-disclosure\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*\}/);
    expect(css).toMatch(/\.warning-fields dd\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*\}/);
  });
});
