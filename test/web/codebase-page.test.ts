// VIEW-13 (10-08): the Codebase page composer and its source-text contract. composeCodebase is pure: it merges the
// server's codebaseContext with the opened document's structured.codebase and section groups, so every case below
// builds a ViewInput over the committed Tidemark (complete) and Shapes (three of seven) maps through the real
// repository, with the section groups cut from the file's own `##` headings the way the page's splitter would.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCodebaseContext } from '../../src/presentation/codebase-map.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';
import {
  MAPPED_NOT_STARTED,
  MAPPED_NOT_STARTED_LEAD,
  NOT_MAPPED,
  composeCodebase,
} from '../../src/web/views/codebase-page.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { loadProject } from '../helpers/fixture-project.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const TIDEMARK_ROOT = fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)).replace(/[\\/]$/, '');
const KINDS = new Map([
  ['STACK', 'codebase-stack'],
  ['ARCHITECTURE', 'codebase-architecture'],
  ['CONCERNS', 'codebase-concerns'],
  ['CONVENTIONS', 'codebase-conventions'],
]);

/** The file's sections the way splitRenderedDocument cuts them: one group per `##`, the heading kept in the html. */
function groupsOf(markdown: string): DocumentSectionGroup[] {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');
  const groups: DocumentSectionGroup[] = [];
  let lead = '';
  for (const chunk of body.split(/^(?=## )/m)) {
    if (chunk.startsWith('## ')) {
      const heading = chunk.slice(3, chunk.indexOf('\n')).trim();
      groups.push({ id: heading.toLowerCase().replace(/[^a-z0-9]+/g, '-'), heading, html: `<h2>${heading}</h2><p>${heading} text</p>` });
    } else {
      lead += chunk;
    }
  }
  if (lead.replace(/^# .*$/m, '').trim() !== '') groups.unshift({ id: null, heading: null, html: '<p>lead</p>' });
  return groups;
}

async function inputFor(root: string, doc: string, folder = 'codebase'): Promise<ViewInput> {
  const { presentation } = await loadProject(root);
  const path = `.planning/${folder}/${doc}.md`;
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  if (!artifact) throw new Error(`fixture lacks ${path}`);
  const markdown = await readFile(join(root, path), 'utf8');
  return {
    kind: KINDS.get(doc) ?? `codebase-${doc.toLowerCase()}`,
    frontmatter: artifact.frontmatter,
    structured: artifact.structured,
    groups: groupsOf(markdown),
    planSegments: [],
    codebaseContext: buildCodebaseContext(presentation, path),
  };
}

describe('composeCodebase - the facts line', () => {
  it("says how many documents are mapped, the readiness chip, the newest date and the newest document's commit", async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'));
    expect(model?.facts.countText).toBe('7 of 7 documents mapped');
    expect(model?.facts.readiness).toEqual({ key: 'complete', label: 'Complete map', tone: 'complete', title: null });
    expect(model?.facts.mappedText).toBe('Mapped Oct 30, 2026');
    expect(model?.facts.commitText).toMatch(/^Commit [0-9a-f]{7}$/);
  });

  it('words a partial map without a readiness claim and gives the UI-SPEC tooltip verbatim', async () => {
    const model = composeCodebase(await inputFor(SHAPES_ROOT, 'STACK'));
    expect(model?.facts.countText).toBe('3 of 7 documents mapped');
    expect(model?.facts.readiness.label).toBe('Partial map');
    expect(model?.facts.readiness.tone).toBe('in-flight');
    expect(model?.facts.readiness.title).toBe('Some of the four core documents are missing; the map is not complete.');
  });

  it('words a fast map with its tooltip, and omits a missing date or commit silently', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const fast = composeCodebase({
      ...input,
      codebaseContext: input.codebaseContext
        ? { ...input.codebaseContext, mappedCount: 4, readiness: 'fast', mappedAt: null, commit: null }
        : null,
    });
    expect(fast?.facts.countText).toBe('4 of 7 documents mapped');
    expect(fast?.facts.readiness).toEqual({
      key: 'fast',
      label: 'Fast map',
      tone: 'in-flight',
      title: 'A fast map covers stack, integrations, architecture and structure; project setup needs the complete one.',
    });
    expect(fast?.facts.mappedText).toBeNull();
    expect(fast?.facts.commitText).toBeNull();
  });
});

describe('composeCodebase - the panel list', () => {
  it('words a missing document "Not mapped"', () => {
    expect(NOT_MAPPED).toBe('Not mapped');
  });

  it('holds seven entries in the fixed order, each numbered, the active one current', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'));
    expect(model?.panels.map((panel) => panel.label)).toEqual([
      'Stack',
      'Architecture',
      'Structure',
      'Conventions',
      'Testing',
      'Integrations',
      'Concerns',
    ]);
    expect(model?.panels.map((panel) => panel.no)).toEqual(['01', '02', '03', '04', '05', '06', '07']);
    expect(model?.panels.filter((panel) => panel.current).map((panel) => panel.key)).toEqual(['architecture']);
    expect(model?.panels.every((panel) => !panel.ghost && panel.url !== null)).toBe(true);
  });

  it("shows a document the folder lacks as a ghost with no address: Shapes' single mapped panel set and four ghosts", async () => {
    const model = composeCodebase(await inputFor(SHAPES_ROOT, 'STACK'));
    expect(model?.panels.filter((panel) => !panel.ghost).map((panel) => panel.key)).toEqual([
      'stack',
      'architecture',
      'conventions',
    ]);
    const ghosts = model?.panels.filter((panel) => panel.ghost) ?? [];
    expect(ghosts.map((panel) => panel.key)).toEqual(['structure', 'testing', 'integrations', 'concerns']);
    for (const ghost of ghosts) {
      expect(ghost.url).toBeNull();
      expect(ghost.keyText).toBeNull();
    }
  });

  it('carries the key number as text where the lift set one, and none where it did not', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'));
    expect(model?.panels.find((panel) => panel.key === 'stack')?.keyText).toBe('9');
    expect(model?.panels.find((panel) => panel.key === 'concerns')?.keyText).toBe('14');
    expect(model?.panels.find((panel) => panel.key === 'testing')?.keyText).toBeNull();
  });

  it("names the active panel's key number with a singular or plural noun", async () => {
    const concerns = composeCodebase(await inputFor(TIDEMARK_ROOT, 'CONCERNS'));
    expect(concerns?.active.keyPhrase).toBe('14 concerns');
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const one = composeCodebase({
      ...input,
      codebaseContext: input.codebaseContext
        ? {
            ...input.codebaseContext,
            panels: input.codebaseContext.panels.map((panel) =>
              panel.key === 'concerns' ? { ...panel, keyNumber: 1 } : panel,
            ),
          }
        : null,
    });
    expect(one?.active.keyPhrase).toBe('1 concern');
  });
});

describe('composeCodebase - the lifted part', () => {
  it('lifts the Stack chips in the sketch groups: Languages, Runtime, Frameworks', async () => {
    const lifted = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'))?.active.lifted;
    expect(lifted?.kind).toBe('stack');
    if (lifted?.kind !== 'stack') return;
    expect(lifted.groups.map((group) => group.label)).toEqual(['Languages', 'Runtime', 'Frameworks']);
    const languages = lifted.groups[0];
    expect(languages.sets.map((set) => set.label)).toEqual(['Primary', 'Secondary']);
    expect(languages.sets[0].chips).toEqual([{ name: 'TypeScript', version: '5.6' }]);
    expect(languages.sets[1].chips.map((chip) => chip.name)).toEqual(['SQL', 'Shell']);
    expect(lifted.groups[2].sets.map((set) => set.label)).toEqual(['Core', 'Testing', 'Build and dev']);
  });

  it('lifts the Concerns counts: the total, Security first, a zero as a dashed quiet row', async () => {
    const lifted = composeCodebase(await inputFor(TIDEMARK_ROOT, 'CONCERNS'))?.active.lifted;
    expect(lifted?.kind).toBe('concerns');
    if (lifted?.kind !== 'concerns') return;
    expect(lifted.totalText).toBe('14 concerns');
    expect(lifted.counts[0]).toEqual({ label: 'Security Considerations', count: 2, tone: 'in-flight' });
    expect(lifted.counts.map((row) => row.count)).toEqual([2, 3, 1, 2, 3, 2, 0, 1, 0]);
    expect(lifted.counts.find((row) => row.count === 0)?.tone).toBe('quiet');
    expect(lifted.counts.find((row) => row.label === 'Tech Debt')?.tone).toBeNull();
  });

  it('shows a known concern section the document lacks as a 0 row, and a one-concern total in the singular', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const codebase = input.structured.codebase as { concerns: { sections: unknown[]; total: number; missing: string[] } };
    const trimmed = {
      ...input,
      structured: {
        ...input.structured,
        codebase: {
          ...codebase,
          concerns: {
            sections: [{ key: 'tech-debt', heading: 'Tech Debt', count: 1 }],
            total: 1,
            missing: ['security-considerations'],
          },
        },
      },
    };
    const lifted = composeCodebase(trimmed)?.active.lifted;
    expect(lifted?.kind === 'concerns' ? lifted.totalText : null).toBe('1 concern');
    expect(lifted?.kind === 'concerns' ? lifted.counts[0] : null).toEqual({
      label: 'Security Considerations',
      count: 0,
      tone: 'quiet',
    });
  });

  it('lifts nothing for a panel with no designed form yet', async () => {
    expect(composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'))?.active.lifted).toBeNull();
  });
});

describe('composeCodebase - plain sections drop nothing', () => {
  it("keeps Tidemark's added API Architecture section among the plain sections, in document order", async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'));
    const headings = model?.active.plainSections ?? [];
    expect(headings).toContain('API Architecture');
    expect(headings.indexOf('Pattern Overview')).toBeLessThan(headings.indexOf('API Architecture'));
    expect(headings.indexOf('API Architecture')).toBeLessThan(headings.indexOf('Data Flow'));
    expect(model?.active.plain.map((section) => section.heading).filter((heading) => heading !== null)).toEqual(headings);
  });

  it('shows every section plain when the document has no heading the page knows', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'CONVENTIONS');
    const groups: DocumentSectionGroup[] = [
      { id: 'one', heading: 'Notes on yachts', html: '<h2>Notes on yachts</h2><p>a</p>' },
      { id: 'two', heading: 'Harbour fees', html: '<h2>Harbour fees</h2><p>b</p>' },
    ];
    const model = composeCodebase({ ...input, groups });
    expect(model?.active.plainSections).toEqual(['Notes on yachts', 'Harbour fees']);
    expect(model?.active.plain.map((section) => section.html)).toEqual(groups.map((group) => group.html));
  });

  it('keeps the text before the first heading, without a heading of its own', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const model = composeCodebase({
      ...input,
      groups: [{ id: null, heading: null, html: '<p>lead</p>' }, ...input.groups],
    });
    expect(model?.active.plain[0]).toMatchObject({ heading: null, html: '<p>lead</p>' });
    expect(model?.active.plainSections).not.toContain(null);
  });

  it('leaves out a blank group', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const model = composeCodebase({ ...input, groups: [{ id: 'x', heading: 'Empty', html: '  ' }, ...input.groups] });
    expect(model?.active.plainSections).not.toContain('Empty');
  });
});

describe('composeCodebase - the map-only head (10-10)', () => {
  it('words the head with the two sentences verbatim', () => {
    expect(MAPPED_NOT_STARTED).toBe('Mapped, not started');
    expect(MAPPED_NOT_STARTED_LEAD).toBe('This project has a codebase map and no roadmap yet.');
  });

  it('gives a map-only project the head at every panel, and a project with a roadmap none', async () => {
    for (const doc of ['STACK', 'ARCHITECTURE', 'CONCERNS', 'CONVENTIONS']) {
      const head = composeCodebase(await inputFor(TIDEMARK_ROOT, doc))?.head;
      expect(head?.eyebrow, doc).toBe('Mapped, not started');
      expect(head?.lead, doc).toBe('This project has a codebase map and no roadmap yet.');
    }
    expect(composeCodebase(await inputFor(SHAPES_ROOT, 'STACK'))?.head).toBeNull();
  });

  it('lifts the stack into Languages, Runtime and Frameworks sets with versions, capped to a glance', async () => {
    const head = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'))?.head;
    expect(head?.stack.map((set) => set.label)).toEqual(['Languages', 'Runtime', 'Frameworks']);
    expect(head?.stack[0].chips[0]).toEqual({ name: 'TypeScript', version: '5.6' });
    for (const set of head?.stack ?? []) expect(set.chips.length).toBeGreaterThan(0);
    expect(head?.stack[0].chips.length).toBeLessThanOrEqual(4);
    expect(head?.stack[1].chips.length).toBeLessThanOrEqual(3);
    expect(head?.stack[2].chips.length).toBeLessThanOrEqual(5);
  });

  it('counts the concerns with short labels, Security first, the heading as the title and a zero as a quiet row', async () => {
    const concerns = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'))?.head?.concerns;
    expect(concerns?.total).toBe(14);
    expect(concerns?.noun).toBe('concerns');
    expect(concerns?.counts[0]).toEqual({
      label: 'Security',
      title: 'Security Considerations',
      count: 2,
      tone: 'in-flight',
    });
    expect(concerns?.counts.map((row) => row.count)).toEqual([2, 3, 1, 2, 3, 2, 0, 1, 0]);
    expect(concerns?.counts.find((row) => row.title === 'Tech Debt')?.label).toBe('Tech debt');
    expect(concerns?.counts.find((row) => row.count === 0)?.tone).toBe('quiet');
    expect(concerns?.counts.slice(1).every((row) => row.tone === null || row.tone === 'quiet')).toBe(true);
  });

  it('keeps a section the template does not know under its own heading', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const context = input.codebaseContext;
    const model = composeCodebase({
      ...input,
      codebaseContext: context
        ? {
            ...context,
            head: {
              nextStep: { command: '/gsd-new-project', reason: 'The map is complete. Next, set the project up.' },
              stack: null,
              concerns: { total: 3, entries: [{ key: null, heading: 'Repository Hygiene', count: 3 }] },
            },
          }
        : null,
    });
    expect(model?.head?.stack).toEqual([]);
    expect(model?.head?.concerns?.counts).toEqual([
      { label: 'Repository Hygiene', title: 'Repository Hygiene', count: 3, tone: null },
    ]);
  });
});

describe('composeCodebase - never throws, falls through silently, holds no state', () => {
  it('returns null without a context or without structured.codebase', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    expect(composeCodebase({ ...input, codebaseContext: null })).toBeNull();
    expect(composeCodebase({ ...input, codebaseContext: undefined })).toBeNull();
    expect(composeCodebase({ ...input, structured: {} })).toBeNull();
    expect(composeCodebase({ ...input, structured: { codebase: 'odd' } })).toBeNull();
  });

  it('survives an odd stamp, odd chips and odd counts', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const odd = {
      ...input,
      structured: { codebase: { doc: 'stack', stamp: 7, sections: 'x', stack: { languages: 'no', runtime: [3], frameworks: null } } },
    };
    expect(() => composeCodebase(odd)).not.toThrow();
    expect(() => composeCodebase({ ...input, structured: { codebase: { doc: 'concerns', concerns: { sections: [null, 4] } } } })).not.toThrow();
  });

  it('gives the same output for two inputs composed alternately as for each alone', async () => {
    const stack = await inputFor(TIDEMARK_ROOT, 'STACK');
    const concerns = await inputFor(SHAPES_ROOT, 'ARCHITECTURE');
    const aloneStack = composeCodebase(stack);
    const aloneConcerns = composeCodebase(concerns);
    const first = composeCodebase(stack);
    const second = composeCodebase(concerns);
    const third = composeCodebase(stack);
    expect(first).toEqual(aloneStack);
    expect(second).toEqual(aloneConcerns);
    expect(third).toEqual(aloneStack);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The view contract: source-text checks in the coverage-view-contract idiom (readFile + regex, no AST tooling).
// ---------------------------------------------------------------------------------------------------------
async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-10-codebase:start */';
const END = '/* phase-10-codebase:end */';
const COMPOSER = 'src/web/views/codebase-page.ts';
const COMPONENTS = 'src/web/views/codebase-components.tsx';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)'];

function stripSourceComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function toneExpressions(text: string): string[] {
  return [...text.matchAll(/data-tone=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning|missing)['"]/.test(text) ||
    /data-tone="(destructive|warning|missing)"/.test(text) ||
    /'(destructive|warning|missing)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning|missing)'/.test(text)
  );
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

function usesRegexLiteral(text: string): boolean {
  return /\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\//.test(text);
}

function importsFilesystem(text: string): boolean {
  return /from 'node:(fs|path)|from 'fs'/.test(text);
}

function hasModuleLevelLet(text: string): boolean {
  return /^(export\s+)?let\s/m.test(text);
}

function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/@keyframes/.test(block)) found.push('keyframes');
  if (/\banimation\b/.test(block)) found.push('animation');
  if (/\btransition\b/.test(block)) found.push('transition');
  if (/:root/.test(block)) found.push(':root');
  return found;
}

function fontSizes(block: string): string[] {
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
}

function codebaseBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('codebase view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'missing';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="destructive" />')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(fontSizes('a { font-size: var(--fs-5); } b { font-size: 12px; }')).toEqual(['var(--fs-5)', '12px']);
  });

  it('passes clean strings', () => {
    expect(writesForbiddenTone("type CodebaseTone = 'complete' | 'in-flight' | 'quiet';")).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(hasModuleLevelLet('function f() {\n  let x = 1;\n  return x;\n}')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('codebase view contract - the real sources', () => {
  it('the components render no raw-HTML prop and write only documented tones, never destructive, warning or missing', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    for (const expression of toneExpressions(code)) {
      expect(['"complete"', '"in-flight"', '"quiet"', '{tone}', '{row.tone}', '{facts.readiness.tone}', '{readiness.tone}'], expression).toContain(expression);
    }
  });

  it('every link goes through the in-app Link to a payload address; a ghost entry is not interactive', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("import { Link } from '../nav.tsx';");
    expect(code).not.toMatch(/\bhref\s*=/);
    expect(code).not.toMatch(/<a[\s>]/);
    expect(code).toContain("data-ghost=\"true\"");
    expect(code).toContain('{NOT_MAPPED}');
  });

  it('lifted text is React text through ResearchInline, and plain sections go through the page\'s renderHtml callback', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('renderHtml');
    expect(code).toContain('ResearchInline');
  });

  it('the head is one block over the panel in the reading column, and its words are the eyebrow', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('model.head === null ? \'Codebase\' : model.head.eyebrow');
    expect(code).toContain('<Head head={model.head} />');
    expect(code.indexOf('<Head head={model.head} />')).toBeLessThan(code.indexOf('<article'));
    const css = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    expect(css).toContain('.view-codebase-head {\n    order: -1;');
  });

  it('the head\'s next step is the shared copy-command row, which imports no api module and never fetches', async () => {
    const components = stripSourceComments(await source(COMPONENTS));
    expect(components).toContain("import { CopyCommand } from '../components/copy-command.tsx';");
    expect(components).toContain('<CopyCommand command={head.next.command} />');
    const copy = stripSourceComments(await source('src/web/components/copy-command.tsx'));
    expect(copy).not.toMatch(/from\s+['"]\.\.\/api\.ts['"]/);
    expect(copy).not.toMatch(/\bfetch\b/);
    expect(await source(COMPOSER)).toContain('Labelore does not run commands. Paste it in your terminal.');
  });

  it('the composer builds no regular expression, uses no regex literal and imports no filesystem module', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(buildsRegExp(code)).toBe(false);
    expect(usesRegexLiteral(code)).toBe(false);
    expect(importsFilesystem(code)).toBe(false);
  });

  it('the composer holds no module-level mutable state', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(hasModuleLevelLet(code)).toBe(false);
    expect(code).not.toMatch(/^(export\s+)?var\s/m);
  });

  it('the CSS block exists once, holds every .view-codebase- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = codebaseBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-codebase-/);
    for (const selector of [
      '.view-codebase-page',
      '.view-codebase-rail',
      '.view-codebase-entry',
      '.view-codebase-panel',
      '.view-codebase-chip',
      '.view-codebase-count',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the CSS block renders only the four contracted font sizes', async () => {
    const block = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    const sizes = fontSizes(block);
    expect(sizes.length).toBeGreaterThan(8);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
  });

  it('maps the document outline and rendered-document sizes inside the four-size scale', async () => {
    const block = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    expect(block).toContain('.artifact-page:has(.view-codebase-page) .status-chip');
    expect(block).toContain('.view-codebase-plain-section');
  });

  it('reuses no research-* class unchanged and adds no history-prefixed or status-square rule', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).not.toMatch(/['"\s]research-[\w-]+/);
    const block = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    expect(block).not.toMatch(/\.history-[\w-]+/);
    expect(block).not.toMatch(/\.research-[\w-]+/);
    expect(block).not.toMatch(/\.status-square\s*\{/);
  });
});
