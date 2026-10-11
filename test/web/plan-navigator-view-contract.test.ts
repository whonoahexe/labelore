// quick-261006-iz6 (T-iz6-02, T-iz6-03, T-iz6-04, QKIZ6-09): source-text contract for the PLAN task
// navigator, in the ui-review-view-contract idiom (readFile + regex, no AST tooling). Only design-language
// tones and theme tokens colour document content; nothing renders raw HTML; no href is built from
// document text; the extractor, composer and context never build a regular expression; the git call
// stays read-only; and the additive CSS block is one contiguous, guarded region. The checks are small
// helpers with a positive control that runs them on planted in-memory strings.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261006-iz6:start */';
const END = '/* quick-261006-iz6:end */';

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

function writesLiteralTone(text: string): boolean {
  return /data-tone="[^"]*"/.test(text) || /data-tone=\{\s*['"`]/.test(text);
}

function writesForbiddenTone(text: string): boolean {
  return /['"](destructive|warning)['"]/.test(text);
}

function buildsHref(text: string): boolean {
  return /\bhref\s*=/.test(text) || /\bhref\s*:/.test(text);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

function runsAShell(text: string): boolean {
  return /\bexec\s*\(/.test(text) || /shell\s*:\s*true/.test(text);
}

function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  return found;
}

function planBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('plan navigator view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone("const t = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('const t = "warning";')).toBe(true);
    expect(buildsHref('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(runsAShell("exec('git log')")).toBe(true);
    expect(runsAShell('execFile(a, b, { shell: true })')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={chip.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = TYPE_INFO[type];')).toBe(false);
    expect(buildsHref('<span className="view-plan-nav-tref">{ref}</span>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(runsAShell("execFile('git', args, { cwd })")).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('plan navigator view contract', () => {
  it('the components never use the raw-HTML injection prop, a literal tone or an href', async () => {
    const components = await source('src/web/views/plan-navigator-components.tsx');
    expect(usesRawHtmlProp(components)).toBe(false);
    expect(writesLiteralTone(components)).toBe(false);
    expect(writesForbiddenTone(components)).toBe(false);
    expect(buildsHref(components)).toBe(false);
    expect(components).toContain('data-tone={chip.tone}');
  });

  it('the only Link targets are a dependency row url and the fixed traceability route', async () => {
    const components = await source('src/web/views/plan-navigator-components.tsx');
    const links = [...components.matchAll(/<Link\b[\s\S]*?>/g)].map((m) => m[0]);
    expect(links).toHaveLength(2);
    expect(links.some((link) => link.includes('to={dep.url}'))).toBe(true);
    expect(links.some((link) => link.includes('to={presentationRoutePatterns.traceability}'))).toBe(true);
  });

  it('the extractor, the composer and the context never build a regular expression', async () => {
    for (const file of [
      'src/planning-repo/handlers/plan-structure.ts',
      'src/web/views/plan-navigator.ts',
      'src/web/views/plan-context.ts',
    ]) {
      expect(buildsRegExp(await source(file)), file).toBe(false);
    }
  });

  it('the composer names no parse-degradation tone', async () => {
    const composer = await source('src/web/views/plan-navigator.ts');
    expect(writesForbiddenTone(composer)).toBe(false);
    expect(composer).toContain("TRACER_TONE: PlanTone = 'active'");
    expect(composer).toContain("CHECKPOINT_TONE: PlanTone = 'in-flight'");
    expect(composer).toContain("NEW_FILE_TONE: PlanTone = 'active'");
  });

  it('the manifest declares the planNavigator hook and keeps the B3 layout and the index as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('planNavigator: composePlanNavigator');
    expect(manifests).toContain('layout: planLayout');
    expect(manifests).toContain('planTaskIndexBlock');
  });

  it('the handler is registered before the generic one, which stays last', async () => {
    const index = await source('src/planning-repo/handlers/index.ts');
    const at = (name: string): number => index.indexOf(`  ${name},`);
    expect(at('PlanHandler')).toBeGreaterThan(-1);
    expect(at('PlanHandler')).toBeLessThan(at('GenericMarkdownHandler'));
    expect(at('GenericMarkdownHandler')).toBe(index.lastIndexOf('  GenericMarkdownHandler,'));
  });

  it('the page dispatches through the manifest hook, the context and the source-hit mark', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('manifest.planNavigator?.(viewInput)');
    expect(page).toContain('<PlanNavigatorView');
    expect(page).toContain('findPlanContext(');
    expect(page).toContain('data-source-hit');
    expect(page).toMatch(/if \(planNavigator && mode === 'view'\)/);
    // The early return shows the shared warning chip and adds no tone mapping of its own.
    const start = page.indexOf("if (planNavigator && mode === 'view')");
    const early = page.slice(start, page.indexOf('</main>', start));
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(early).not.toContain('data-tone');
  });

  it('the file dates run git read-only, without a shell', async () => {
    const dates = await source('src/server/file-dates.ts');
    expect(dates).toContain('GIT_OPTIONAL_LOCKS');
    expect(dates).toContain("'--'");
    expect(dates).toContain('core.fsmonitor=false');
    expect(runsAShell(dates)).toBe(false);
  });

  it('the 019 CSS block exists once, holds every .view-plan-nav- rule, and is free of forbidden things', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-261006-iz6:start').length - 1).toBe(1);
    expect(css.split('quick-261006-iz6:end').length - 1).toBe(1);
    const block = planBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    const rules = [...css.matchAll(/^\.view-plan-nav-[\w-]*/gm)].map((m) => m.index ?? -1);
    expect(rules.length).toBeGreaterThan(60);
    for (const index of rules) {
      expect(index).toBeGreaterThan(start);
      expect(index).toBeLessThan(end);
    }
    // The block sits right before the 527 block (one blank line between).
    expect(css.indexOf('/* quick-261003-527:start */')).toBe(end + `${END}\n\n`.length);
  });

  it('the tracer, checkpoints, selection and tabs read their tone tokens', async () => {
    const block = planBlock(await source('src/web/styles/globals.css'));
    const rule = (selector: string): string => {
      const at = block.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      return block.slice(at, block.indexOf('}', at));
    };
    expect(rule(".view-plan-nav-glyph[data-type='tracer']")).toContain('var(--primary)');
    expect(rule(".view-plan-nav-glyph[data-gate='true']")).toContain('var(--in-flight-fill)');
    expect(rule(".view-plan-nav-item[aria-selected='true']")).toContain('var(--primary)');
    expect(rule(".view-plan-nav-tabs button[aria-selected='true']")).toContain('var(--primary)');
    expect(rule(".view-plan-nav-stat b[data-tone='missing']")).toContain('var(--missing-fill)');
    expect(rule('.view-plan-nav-waits')).toContain('var(--in-flight-fill)');
    expect(rule(".view-plan-nav-option p[data-kind='con']::before")).toContain('var(--missing-fill)');
    expect(rule(".artifact-document .plan-section[data-source-hit='true']")).toContain('var(--primary-tint)');
  });
});
