// Photographs Labelore pages (and sketch winners) in a real browser, so a build is checked beside its
// sketch before it is called done (D-14). Run by hand or from a plan's verify step:
//
//   node test/helpers/shoot-pages.ts --root <project folder> --out <folder> --name <prefix> \
//        --address / --address /codebase [--sketch <path to a sketch's index.html>[#variant]]
//
// It serves the built ./dist (run `npm run build` first) with NODE_ENV=production on the first free port
// of 4191-4194, on an isolated settings directory (LABELORE_CONFIG_DIR), so it never reads or writes the
// user's real settings file and never touches a running instance. The browser is the system Chrome
// (LABELORE_E2E_CHROME, else /usr/bin/google-chrome) in new headless mode, because Playwright's bundled
// chromium is not installed here. Every address and sketch is shot at 1280x800 and 390x844, light and
// dark, into --out as {name}-{address-slug}-{width}-{theme}.png.
//
// Each project address is also checked: it prints "FAIL {reason}" and the run exits 1 when the page answers
// an error status, raises a page error, has other than one <h1>, or scrolls sideways at 390px. Sketches are
// reference mock-ups, not built pages, so they are photographed but only checked for loading. The server is
// always stopped, however the run ends.
//
// A sketch with no #variant opens the variant its README's `winner:` names (matched against the sketch's
// own `data-variant` tabs); with no winner, or a winner that matches no tab (a synthesis, "none"), every
// tab is shot.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

const REPO = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');
// 4190 is on the fetch standard's blocked-port list (ManageSieve): node's fetch and Chrome both refuse it.
const FIRST_PORT = 4191;
const LAST_PORT = 4194;
const THEME_STORAGE_KEY = 'labelore-theme';
const SIZES = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
] as const;
const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

interface Options {
  root: string;
  out: string;
  name: string;
  addresses: string[];
  sketches: string[];
}

function parseArgs(argv: string[]): Options {
  const options: Options = { root: '', out: '', name: 'shot', addresses: [], sketches: [] };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`${flag} needs a value`);
    index++;
    if (flag === '--root') options.root = resolve(value);
    else if (flag === '--out') options.out = resolve(value);
    else if (flag === '--name') options.name = value;
    else if (flag === '--address') options.addresses.push(value.startsWith('/') ? value : `/${value}`);
    else if (flag === '--sketch') options.sketches.push(value);
    else throw new Error(`unknown option ${flag}`);
  }
  if (options.root === '') throw new Error('--root is required');
  if (options.out === '') throw new Error('--out is required');
  if (options.addresses.length === 0 && options.sketches.length === 0) {
    throw new Error('give at least one --address or --sketch');
  }
  return options;
}

function portIsFree(port: number): Promise<boolean> {
  return new Promise((done) => {
    const probe = createServer();
    probe.once('error', () => done(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => done(true)));
  });
}

async function firstFreePort(): Promise<number> {
  for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
    if (await portIsFree(port)) return port;
  }
  throw new Error(`no free port in ${FIRST_PORT}-${LAST_PORT}`);
}

interface RunningServer {
  base: string;
  slug: string;
  stop(): Promise<void>;
}

async function startServer(root: string): Promise<RunningServer> {
  const port = await firstFreePort();
  const base = `http://127.0.0.1:${port}`;
  const configDir = mkdtempSync(join(tmpdir(), 'shoot-pages-config-'));
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  env.NODE_ENV = 'production';
  env.LABELORE_CONFIG_DIR = configDir;
  const child: ChildProcess = spawn(process.execPath, ['src/server/index.ts', root, '--port', String(port)], {
    cwd: REPO,
    stdio: 'ignore',
    env,
  });
  const cleanup = (): void => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    rmSync(configDir, { recursive: true, force: true });
  };
  process.once('exit', cleanup);
  const stop = async (): Promise<void> => {
    process.removeListener('exit', cleanup);
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((done) => child.once('exit', () => done()));
      child.kill('SIGTERM');
      const timer = setTimeout(cleanup, 3000);
      await exited;
      clearTimeout(timer);
    }
    rmSync(configDir, { recursive: true, force: true });
  };

  const deadline = Date.now() + 60_000;
  let slug = '';
  while (Date.now() < deadline && slug === '' && child.exitCode === null) {
    try {
      const response = await fetch(`${base}/api/projects`);
      if (response.status === 200) {
        const body = (await response.json()) as { projects: { slug: string }[] };
        slug = body.projects[0]?.slug ?? '';
      }
    } catch {
      /* not listening yet */
    }
    if (slug === '') await new Promise((done) => setTimeout(done, 300));
  }
  if (slug === '') {
    await stop();
    throw new Error('the server did not become ready');
  }
  return { base, slug, stop };
}

const addressSlug = (address: string): string => address.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'home';

async function newPage(browser: Browser, width: number, height: number, theme: Theme): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
  await context.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* a page with no storage */
      }
    },
    [THEME_STORAGE_KEY, theme],
  );
  return context.newPage();
}

/** Opens one project address, shoots it and returns the reasons it failed its checks. */
async function shootAddress(
  browser: Browser,
  server: RunningServer,
  options: Options,
  address: string,
  width: number,
  height: number,
  theme: Theme,
): Promise<string[]> {
  const failures: string[] = [];
  const label = `${address} at ${width}px ${theme}`;
  const page = await newPage(browser, width, height, theme);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    const response = await page.goto(`${server.base}/${server.slug}${address}`, {
      waitUntil: 'networkidle',
    });
    if (response === null || response.status() >= 400) {
      failures.push(`${label}: the server answered ${response === null ? 'nothing' : response.status()}`);
    }
    await page.waitForSelector('h1', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForLoadState('networkidle');
    for (const message of pageErrors) failures.push(`${label}: page error: ${message}`);
    const headings = await page.locator('h1').count();
    if (headings !== 1) failures.push(`${label}: ${headings} h1 elements, expected 1`);
    if (width === 390) {
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      if (sideways) failures.push(`${label}: the page scrolls sideways`);
    }
    await page.screenshot({
      path: join(options.out, `${options.name}-${addressSlug(address)}-${width}-${theme}.png`),
      fullPage: true,
    });
  } finally {
    await page.context().close();
  }
  return failures;
}

/** The README's `winner:` value, or '' when it has none. */
function readWinner(folder: string): string {
  try {
    const text = readFileSync(join(folder, 'README.md'), 'utf8');
    const match = /^winner:\s*"?([^"\n]*)"?\s*$/m.exec(text);
    return match?.[1]?.trim() ?? '';
  } catch {
    return '';
  }
}

/** The variant names a sketch page offers: the data-variant of every tab button. */
async function variantsOf(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-variant]'))
      .map((element) => element.getAttribute('data-variant') ?? '')
      .filter((value, index, all) => value !== '' && all.indexOf(value) === index),
  );
}

/** Which tabs to shoot: the one the hash names, else the winner's, else all of them. */
function pickVariants(available: string[], hash: string, winner: string): string[] {
  const wanted = hash !== '' ? hash.toLowerCase() : winner.toLowerCase().split(/[^a-z0-9]/)[0] ?? '';
  if (wanted === '') return available;
  const exact = available.filter((variant) => variant.toLowerCase() === wanted);
  return exact.length > 0 ? exact : available;
}

async function shootSketch(
  browser: Browser,
  options: Options,
  sketch: string,
  width: number,
  height: number,
  theme: Theme,
): Promise<string[]> {
  const failures: string[] = [];
  const [file, hash = ''] = sketch.split('#');
  const path = resolve(file ?? '');
  const folderName = basename(dirname(path));
  const page = await newPage(browser, width, height, theme);
  try {
    // The sketches in this repository read `?theme=dark` themselves (the browser's colour scheme does not reach them).
    const response = await page.goto(`${pathToFileURL(path).href}?theme=${theme}`, { waitUntil: 'load' });
    if (response !== null && response.status() >= 400) failures.push(`${folderName}: could not load ${path}`);
    const available = await variantsOf(page);
    const variants = available.length === 0 ? [''] : pickVariants(available, hash, readWinner(dirname(path)));
    for (const variant of variants) {
      if (variant !== '') {
        // A sketch whose tabs are `a[data-tab]` links keeps `data-variant` on its (hidden) sections; click the tab then.
        const tab = page.locator(`[data-tab="${variant}"]`).first();
        if ((await tab.count()) > 0) await tab.click();
        else await page.locator(`[data-variant="${variant}"]`).first().click();
      }
      await page.waitForTimeout(200);
      const suffix = variant === '' ? 'sketch' : `sketch-${variant}`;
      await page.screenshot({
        path: join(options.out, `${options.name}-${folderName}-${suffix}-${width}-${theme}.png`),
        fullPage: true,
      });
    }
  } catch (error) {
    failures.push(`${folderName}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.context().close();
  }
  return failures;
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(options.out, { recursive: true });
  const executablePath = process.env.LABELORE_E2E_CHROME ?? '/usr/bin/google-chrome';
  const failures: string[] = [];
  let server: RunningServer | null = null;
  let browser: Browser | null = null;
  try {
    if (options.addresses.length > 0) server = await startServer(options.root);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--headless=new'] });
    for (const { width, height } of SIZES) {
      for (const theme of THEMES) {
        if (server !== null) {
          for (const address of options.addresses) {
            failures.push(...(await shootAddress(browser, server, options, address, width, height, theme)));
          }
        }
        for (const sketch of options.sketches) {
          failures.push(...(await shootSketch(browser, options, sketch, width, height, theme)));
        }
      }
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    if (browser !== null) await browser.close();
    if (server !== null) await server.stop();
  }
  for (const reason of failures) console.log(`FAIL ${reason}`);
  return failures.length === 0 ? 0 : 1;
}

process.exit(await main());
