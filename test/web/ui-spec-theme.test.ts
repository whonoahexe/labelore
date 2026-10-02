// quick-261002-li5: token-only UI-SPEC colour roles painted from the target project's own stylesheet.
// The tracer path end to end (real PlanningRepository -> composeUiSpec -> rendered markup), then the
// compose step on literal ViewInputs: the document wins, the theme fills token-only swatches, a
// token group splits per token, no theme leaves the output unchanged, and a hostile theme payload
// is rejected client-side.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { extractUiSpec } from '../../src/planning-repo/handlers/ui-spec-contract.ts';
import { composeUiSpec } from '../../src/web/views/ui-spec.ts';
import type { ComposedColourRole, ComposedUiSpec } from '../../src/web/views/ui-spec.ts';
import { UiSpecView } from '../../src/web/views/ui-spec-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const SPEC_PATH = '.planning/phases/01-demo/01-UI-SPEC.md';
const SPEC = [
  '# Phase 1 - UI Design Contract',
  '',
  '## Color',
  '',
  '| Role | Value | Usage |',
  '|------|-------|-------|',
  '| Dominant (60%) | `--background` | Page background |',
  '| Secondary (30%) | `--card` / `--border` | Cards and borders |',
  '| Accent (10%) | `--primary` | Primary action |',
  '| Destructive | `--destructive` | Delete |',
  '',
].join('\n');

const STYLESHEET = `
@custom-variant dark (&:is(.dark *));
@theme inline { --color-card: var(--card); }
:root {
  --background: oklch(1 0 0);
  --card: var(--background);
  --border: oklch(0.922 0 0);
  --primary: oklch(0.553 0.195 38.402);
}
.dark {
  --background: oklch(0.145 0 0);
  --border: oklch(1 0 0 / 10%);
}
`;

const TREE = {
  '.planning/STATE.md': '---\nstatus: ok\n---\n# State\n',
  [SPEC_PATH]: SPEC,
};

type StructuredHolder = { structured?: Record<string, unknown> };

async function loadArtifact(
  files: Record<string, string>,
  path: string,
  options?: ConstructorParameters<typeof PlanningRepository>[2],
): Promise<StructuredHolder | undefined> {
  const repo = new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project', options);
  const snapshot = await repo.load();
  const project = snapshot.project;
  const found = project?.artifacts[path] ?? project?.phases.map((p) => p.artifacts[path]).find((a) => a !== undefined);
  return found as StructuredHolder | undefined;
}

function inputOf(uiSpec: unknown, theme?: unknown): ViewInput {
  return {
    kind: 'ui-spec',
    frontmatter: {},
    structured: theme === undefined ? { uiSpec } : { uiSpec, uiSpecTheme: theme },
    groups: [],
    planSegments: [],
  };
}

function composed(markdown: string, theme?: unknown): ComposedUiSpec {
  const out = composeUiSpec(inputOf(extractUiSpec(markdown), theme));
  expect(out).not.toBeNull();
  return out as ComposedUiSpec;
}

function roleOf(spec: ComposedUiSpec, name: string): ComposedColourRole {
  const role = spec.colour?.roles.find((r) => r.name === name);
  expect(role, name).toBeDefined();
  return role as ComposedColourRole;
}

function render(spec: ComposedUiSpec): string {
  return renderToStaticMarkup(createElement(UiSpecView, { spec, onShowSource: () => {}, title: 'Doc' }));
}

const THEME = {
  source: 'app/globals.css',
  light: { '--background': 'oklch(1 0 0)', '--card': 'oklch(1 0 0)', '--border': 'oklch(0.922 0 0)', '--primary': 'oklch(0.553 0.195 38.402)' },
  dark: { '--background': 'oklch(0.145 0 0)', '--card': 'oklch(0.145 0 0)', '--border': 'oklch(1 0 0 / 10%)', '--primary': 'oklch(0.553 0.195 38.402)' },
};

describe('the tracer: stylesheet -> repository -> composer -> markup', () => {
  it('attaches structured.uiSpecTheme to the UI-SPEC artifact with the stylesheet path as source', async () => {
    const artifact = await loadArtifact({ ...TREE, 'app/globals.css': STYLESHEET }, SPEC_PATH);
    const theme = artifact?.structured?.uiSpecTheme as { source: string } | undefined;
    expect(theme?.source).toBe('app/globals.css');
  });

  it('paints a token-only role through the real repository, a var() chain and the dark inheritance', async () => {
    const artifact = await loadArtifact({ ...TREE, 'app/globals.css': STYLESHEET }, SPEC_PATH);
    const out = composeUiSpec({
      kind: 'ui-spec',
      frontmatter: {},
      structured: artifact?.structured ?? {},
      groups: [],
      planSegments: [],
    });
    expect(out).not.toBeNull();
    const spec = out as ComposedUiSpec;

    const [dominant] = roleOf(spec, 'Dominant').swatches;
    expect(dominant).toMatchObject({ light: 'oklch(1 0 0)', dark: 'oklch(0.145 0 0)', resolvedFrom: 'app/globals.css' });

    const secondary = roleOf(spec, 'Secondary').swatches;
    expect(secondary.map((s) => s.tokens)).toEqual([['--card'], ['--border']]);
    expect(secondary[0]).toMatchObject({ light: 'oklch(1 0 0)', dark: 'oklch(0.145 0 0)' });
    expect(secondary[1]).toMatchObject({ light: 'oklch(0.922 0 0)', dark: 'oklch(1 0 0 / 10%)' });

    const [destructive] = roleOf(spec, 'Destructive').swatches;
    expect(roleOf(spec, 'Destructive').swatches).toHaveLength(1);
    expect(destructive).toMatchObject({ light: null, dark: null, resolvedFrom: null });

    const markup = render(spec);
    expect(markup).toContain('--swatch-light:oklch(1 0 0)');
    expect(markup).toContain('Value not in doc');
  });

  it('adds no key without a stylesheet, with the loader disabled, or on a non-UI-SPEC artifact', async () => {
    const bare = await loadArtifact(TREE, SPEC_PATH);
    expect(bare?.structured).toBeDefined();
    expect('uiSpecTheme' in (bare?.structured ?? {})).toBe(false);

    const off = await loadArtifact({ ...TREE, 'app/globals.css': STYLESHEET }, SPEC_PATH, { loadTheme: null });
    expect('uiSpecTheme' in (off?.structured ?? {})).toBe(false);

    const state = await loadArtifact({ ...TREE, 'app/globals.css': STYLESHEET }, '.planning/STATE.md');
    expect(state).toBeDefined();
    expect('uiSpecTheme' in (state?.structured ?? {})).toBe(false);
  });

  it('an injected loader that throws leaves the snapshot without a theme', async () => {
    const artifact = await loadArtifact(TREE, SPEC_PATH, {
      loadTheme: async () => {
        throw new Error('boom');
      },
    });
    expect(artifact).toBeDefined();
    expect('uiSpecTheme' in (artifact?.structured ?? {})).toBe(false);
  });
});

describe('composeColour with a theme', () => {
  it('a value the document states wins over the theme', () => {
    const md = '## Color\n\n| Role | Value | Usage |\n|---|---|---|\n| Dominant (60%) | `--background` #FFFFFF light | page |\n';
    const spec = composed(md, { ...THEME, light: { '--background': 'oklch(0.5 0 0)' } });
    expect(roleOf(spec, 'Dominant').swatches[0]).toMatchObject({ light: '#FFFFFF', resolvedFrom: null });
  });

  it('fills a token-only swatch and splits a token group per token', () => {
    const spec = composed(SPEC, THEME);
    expect(roleOf(spec, 'Dominant').swatches[0]).toMatchObject({ tokens: ['--background'], resolvedFrom: 'app/globals.css' });
    expect(roleOf(spec, 'Secondary').swatches).toHaveLength(2);
    expect(roleOf(spec, 'Accent').swatches[0]).toMatchObject({ light: 'oklch(0.553 0.195 38.402)' });
  });

  it('a group where no token resolves stays one hatched swatch', () => {
    const spec = composed(SPEC, { ...THEME, light: {}, dark: {} });
    const secondary = roleOf(spec, 'Secondary').swatches;
    expect(secondary).toHaveLength(1);
    expect(secondary[0]).toMatchObject({ tokens: ['--card', '--border'], light: null, dark: null, resolvedFrom: null });
  });

  it('with no theme the output is unchanged apart from the null provenance fields', () => {
    const spec = composed(SPEC);
    const colour = spec.colour;
    expect(colour?.paintedWith).toBe("painted with the doc's own values");
    for (const role of colour?.roles ?? []) {
      for (const swatch of role.swatches) {
        expect(swatch.resolvedFrom).toBeNull();
        expect(swatch.light).toBeNull();
      }
    }
    expect(roleOf(spec, 'Secondary').swatches).toHaveLength(1);
    for (const share of colour?.split ?? []) expect(share.resolvedFrom).toBeNull();
  });

  it('a hostile theme payload is rejected client-side and the swatch stays hatched', () => {
    const spec = composed(SPEC, {
      source: 'app/globals.css',
      light: { '--background': 'url(javascript:alert(1))', '--card': 'red;background:url(x)', '--primary': 'oklch(1 0 0) url(x)' },
      dark: { '--background': 'expression(alert(1))' },
    });
    for (const role of ['Dominant', 'Secondary', 'Accent']) {
      for (const swatch of roleOf(spec, role).swatches) expect(swatch).toMatchObject({ light: null, dark: null });
    }
    expect(render(spec)).not.toContain('url(');
  });

  it('a malformed theme payload is ignored', () => {
    for (const bad of [
      { source: 'app/globals.css', light: 'nope', dark: {} },
      { source: 7, light: {}, dark: {} },
      { source: '', light: {}, dark: {} },
      null,
      [],
    ]) {
      const spec = composed(SPEC, bad);
      expect(roleOf(spec, 'Dominant').swatches[0]).toMatchObject({ light: null, resolvedFrom: null });
    }
  });

  it('a prototype-named token in the payload is not read through the prototype chain', () => {
    const spec = composed(SPEC, { source: 'app/globals.css', light: {}, dark: {} });
    expect(roleOf(spec, 'Dominant').swatches[0].light).toBeNull();
  });

  it('shares carry resolvedFrom and paintedWith names the source in its three variants', () => {
    const resolved = composed(SPEC, THEME).colour;
    const dominant = resolved?.split.find((s) => s.name === 'Dominant');
    expect(dominant?.resolvedFrom).toBe('app/globals.css');
    // The Destructive role has no percentage, so every share is resolved.
    expect(resolved?.paintedWith).toBe('painted from app/globals.css');

    const mixedMd =
      '## Color\n\n| Role | Value | Usage |\n|---|---|---|\n| Dominant (60%) | `--background` #FFFFFF light | page |\n| Secondary (30%) | `--card` | cards |\n';
    expect(composed(mixedMd, THEME).colour?.paintedWith).toBe("painted with the doc's own values, tokens from app/globals.css");

    const ownMd = '## Color\n\n| Role | Value | Usage |\n|---|---|---|\n| Dominant (60%) | `--background` #FFFFFF light | page |\n';
    expect(composed(ownMd, THEME).colour?.paintedWith).toBe("painted with the doc's own values");
  });
});
