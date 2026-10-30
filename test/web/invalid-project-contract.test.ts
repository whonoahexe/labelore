// D-14 through D-17 source-text contract suite, in the style of test/web/shell-contract.test.ts.
// Web-layer files are read as raw text and never imported: tsconfig.server.json (which this test
// runs under) includes test/**/*.ts but excludes src/web/**, and sets no --jsx option.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('invalid-project screen contract', () => {
  it('is mounted by project-layout.tsx above AppShell, reading presentations only through api.ts (D-14)', async () => {
    const layout = await source('src/web/pages/project-layout.tsx');
    expect(layout).toContain('<InvalidProjectScreen loadStatus={loaded.loadStatus} />');
    expect(layout).toContain("import { InvalidProjectScreen } from './invalid-project-screen.tsx';");
    expect(layout).toContain('fetchPresentation');

    const router = await source('src/web/app-router.tsx');
    expect(router).toContain('element: <ProjectRoute />');
    expect(router).not.toContain('element: <AppShell');
    expect(router).not.toContain('ProjectGate');
    // No second fetcher declared for the same endpoint: it lives only in api.ts.
    expect(router).not.toMatch(/function fetchPresentation/);
    expect(await source('src/web/components/app-shell.tsx')).not.toMatch(/function fetchPresentation/);
    expect(await source('src/web/api.ts')).toMatch(/export async function fetchPresentation\(slug: string\)/);
  });

  it('renders exactly one generic heading for every failure kind, never a per-status heading (D-15)', async () => {
    const screen = await source('src/web/pages/invalid-project-screen.tsx');
    expect(screen).toContain('Project could not be loaded.');
    for (const statusLiteral of ['path-not-found', 'not-a-gsd-project', 'permission-denied']) {
      expect(screen).not.toContain(statusLiteral);
    }
    // The `ok` status is never named either — this screen only ever receives a FailedLoadStatus.
    expect(screen).not.toMatch(/['"]ok['"]/);
  });

  it("renders the server's own loadStatus.message verbatim, never re-deriving or re-wording it (D-15)", async () => {
    const screen = await source('src/web/pages/invalid-project-screen.tsx');
    expect(screen).toContain('{loadStatus.message}');
  });

  it('shows the checked path in a copyable field, with distinct As typed / Resolved to labels when they differ (D-16)', async () => {
    const screen = await source('src/web/pages/invalid-project-screen.tsx');
    expect(screen).toContain('Path checked');
    expect(screen).toContain('As typed');
    expect(screen).toContain('Resolved to');
  });

  it('offers a copyable restart command and one way back to the project list (D-07, D-17)', async () => {
    const screen = await source('src/web/pages/invalid-project-screen.tsx');
    expect(screen).toContain('npm run dev -- /path/to/your/project');
    expect(screen).toContain('Restart with a corrected path');
    expect(screen).not.toContain('navigate(');
    expect(screen).not.toMatch(/picker/i);

    // Exactly one AppLink to '/', carrying the fixed copy, and it comes before the restart field.
    expect(screen.match(/<AppLink\b/g)).toHaveLength(1);
    expect(screen).toMatch(/<AppLink\b[^>]*\bto="\/"[^>]*>\s*Choose another project\s*<\/AppLink>/);
    expect(screen.match(/Choose another project/g)).toHaveLength(1);
    expect(screen.indexOf('Choose another project')).toBeLessThan(
      screen.indexOf('label="Restart with a corrected path"'),
    );
  });

  it('copies to the clipboard via a silent try/catch mirroring copyHeadingUrl, and raises no toast', async () => {
    const screen = await source('src/web/pages/invalid-project-screen.tsx');
    expect(screen).toContain('navigator.clipboard.writeText');
    expect(screen).toMatch(/try\s*\{[\s\S]*navigator\.clipboard\.writeText[\s\S]*\}\s*catch\s*\{/);
    expect(screen).not.toContain('Toast');
    expect(screen).not.toContain('useToastManager');
  });

  it('never renders attacker-influenced path text through dangerouslySetInnerHTML (T-04-02-01)', async () => {
    const screen = await source('src/web/pages/invalid-project-screen.tsx');
    const withoutComments = screen
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
    expect(withoutComments).not.toContain('dangerouslySetInnerHTML');
  });

  it('centers a full-viewport panel with no shell chrome, and never truncates a long path (UI Considerations)', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(/\.invalid-project-screen\s*\{[^}]*min-height:\s*100vh;[^}]*place-items:\s*center;/s);
    expect(css).toMatch(/\.copy-field-value\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  });

  it('reaches the failure state only through InvalidProjectScreen from dashboard-page.tsx (D-15)', async () => {
    const dashboard = await source('src/web/pages/dashboard-page.tsx');
    expect(dashboard).toContain('<InvalidProjectScreen loadStatus={view.loadStatus} />');
    const loadStatusBranch = dashboard.slice(dashboard.indexOf('view.loadStatus.status !== '));
    expect(loadStatusBranch).not.toContain('notice destructive');
  });
});
