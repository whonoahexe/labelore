// quick-261017-k45: side-by-side captures - sketch 024 variant E on the left, the build on the right -
// for the synthetic file, studio-portal phase 1 and the dense fixture's two files, plus interaction,
// dark and narrow captures. gsd-browser was not connected in this session, so the same steps run
// through Playwright's own chromium. The build is served by read-only servers this script starts
// itself, on free ports in 5310-5319 only (never 4173 / 4174, which are the user's running
// instances): the LEARNINGS fixture server (synthetic, studio-portal phase 1 and the dense root file),
// a scratch server on fixtures/dense, and `python3 -m http.server` for the sketch. Every child is
// stopped by PID at the end. PNGs and report.json land in the (gitignored) test/e2e/screenshots/k45.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';

const REPO = '/home/noah/Work/Personal/labelore';
const require = createRequire(`${REPO}/package.json`);
const { chromium } = require('@playwright/test');
const { startLearningsFixtureServer } = await import(`${REPO}/test/e2e/learnings-fixture-server.ts`);

const OUT = `${REPO}/test/e2e/screenshots/k45`;

const portIsFree = (port) =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
const taken = new Set();
async function freePort() {
  for (let port = 5310; port <= 5319; port++) {
    if (taken.has(port) || !(await portIsFree(port))) continue;
    taken.add(port); // a child binds a moment later, so remember the choice
    return port;
  }
  throw new Error('no free port in 5310-5319');
}

const children = [];
function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'ignore', ...options });
  children.push(child);
  return child;
}
async function waitFor(url) {
  for (let i = 0; i < 300; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`not ready: ${url}`);
}

// doc -> which build server and which artifact path ends the same way
const DOCS = {
  sp01: { project: 'fixture', needle: '01-portal-owned-identity-sessions/01-LEARNINGS.md' },
  syn: { project: 'fixture', needle: '05-per-type-document-views/05-LEARNINGS.md' },
  fx: { project: 'dense', needle: 'phases/01-identity-slice/01-LEARNINGS.md' },
  fxp: { project: 'dense', needle: '.planning/LEARNINGS.md' },
};

// id, doc, theme, width, action
const CAPTURES = [
  ['sp01-light', 'sp01', 'light', 1440],
  ['syn-light', 'syn', 'light', 1440],
  ['fx-light', 'fx', 'light', 1440],
  ['fxp-light', 'fxp', 'light', 1440],
  ['sp01-dark', 'sp01', 'dark', 1440],
  ['syn-dark', 'syn', 'dark', 1440],
  ['sp01-surprises', 'sp01', 'light', 1440, 'surprises'],
  ['sp01-filter-04', 'sp01', 'light', 1440, 'filter-04'],
  ['sp01-filter-review', 'sp01', 'light', 1440, 'filter-review'],
  ['sp01-1024', 'sp01', 'light', 1024],
  ['sp01-820', 'sp01', 'light', 820],
  ['sp01-390', 'sp01', 'light', 390],
];

const metrics = (S) => (page) => page.evaluate((S) => {
  const all = (s) => [...document.querySelectorAll(s)];
  const q = (s) => document.querySelectorAll(s).length;
  const t = (s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  const entries = all(S.entry);
  const root = document.querySelector(S.root);
  return {
    h1: `${q('h1')}:${t('h1')}`,
    eyebrow: t(S.eyebrow),
    date: t(S.date),
    lede: t(S.lede),
    missing: t(S.missing),
    segments: all(S.segments).map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
    filterline: t(S.filterline),
    tabs: all(S.tabs).map((e) => `${e.textContent.replace(/\s+/g, ' ').trim()}${e.disabled ? ' [disabled]' : ''}${e.getAttribute('aria-selected') === 'true' ? ' [selected]' : ''}`),
    chapterCount: t(S.chapterCount),
    entryNumbers: entries.map((e) => e.querySelector(S.no)?.textContent.trim()),
    entriesWithBody: entries.filter((e) => e.querySelector(S.main)?.children.length > 1).length,
    sideNotes: entries.filter((e) => e.querySelector(S.side)).length,
    graduated: q(S.graduated),
    alsoChips: all(S.also).map((e) => e.textContent.trim()),
    overflow: root ? root.scrollWidth > root.clientWidth + 1 : null,
  };
}, S);

const BUILD_METRICS = metrics({
  root: 'main',
  entry: '.view-learnings-entry',
  eyebrow: '.view-learnings-meta-left .eyebrow',
  date: '.view-learnings-date',
  lede: '.view-learnings-lede',
  missing: '.view-learnings-missing',
  segments: '.view-learnings-segment',
  filterline: '.view-learnings-filterline',
  tabs: '.view-learnings-tab',
  chapterCount: '.view-learnings-count',
  no: '.view-learnings-no',
  main: '.view-learnings-main',
  side: '.view-learnings-side',
  graduated: '.view-learnings-graduated',
  also: '.view-learnings-also .status-chip',
});
const SKETCH_METRICS = metrics({
  root: '#root .page',
  entry: '.entry',
  eyebrow: '.meta-left .eyebrow',
  date: '.meta-left .date',
  lede: '.lede',
  missing: '.missing-note',
  segments: '.trailbar button',
  filterline: '.filterline',
  tabs: '.chtabs button',
  chapterCount: '.chapter > header .kicker',
  no: '.no',
  main: '.main',
  side: '.side',
  graduated: '.grad',
  also: '.source-only .chip',
});

async function routes(bases) {
  const out = {};
  const cache = {};
  for (const [id, doc] of Object.entries(DOCS)) {
    cache[doc.project] ??= await (await fetch(`${bases[doc.project]}/api/presentation`)).json();
    const found = cache[doc.project].artifacts.find((a) => a.path.endsWith(doc.needle));
    if (found) out[id] = found.key;
    else console.log(`no artifact ${doc.needle}`);
  }
  return out;
}

async function grow(page, width, selector) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const height = await page.evaluate(
    (sel) => Math.min(16000, Math.ceil(Math.max(document.documentElement.scrollHeight, (document.querySelector(sel) || document.body).getBoundingClientRect().bottom + window.scrollY) + 40)),
    selector,
  );
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.scrollTo(0, 0));
}

const SKETCH_ACTIONS = {
  surprises: async (page) => page.click('.chtabs button[data-tab="surprise"]'),
  'filter-04': async (page) => page.click('.trailbar button[data-srcf="01-04-SUMMARY.md"]'),
  'filter-review': async (page) => page.click('.trailbar button[data-srcf="01-REVIEW.md"]'),
};
const BUILD_ACTIONS = {
  surprises: async (page) => page.click('.view-learnings-tab[data-kind="surprise"]'),
  'filter-04': async (page) => page.click('.view-learnings-segment[title^="01-04-SUMMARY.md"]'),
  'filter-review': async (page) => page.click('.view-learnings-segment[title^="01-REVIEW.md"]'),
};

async function captureSketch(browser, sketch, [id, doc, theme, width, action]) {
  const page = await browser.newPage({ viewport: { width: width <= 820 ? width : 1440, height: 1000 } });
  await page.goto(`${sketch}?v=e&doc=${doc}&theme=${theme}`);
  await page.waitForSelector('#root .page');
  await page.evaluate(() => document.fonts.ready);
  if (action) await SKETCH_ACTIONS[action](page);
  await page.addStyleTag({ content: '#variant-nav, #sketch-tools, .shell-header, .toast { display: none !important; } * { animation: none !important; transition: none !important; }' });
  const out = await SKETCH_METRICS(page);
  await grow(page, Math.min(width, 1440), '#root .page');
  await page.locator('#root .page').screenshot({ path: `${OUT}/${id}-sketch.png` });
  await page.close();
  return out;
}

async function captureBuild(browser, base, route, [id, , theme, width, action]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${base}${route}`);
  await page.waitForSelector('.view-learnings-head');
  await page.evaluate(() => document.fonts.ready);
  if (action) await BUILD_ACTIONS[action](page);
  await grow(page, width, 'main');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('main')) continue;
      const p = getComputedStyle(el).position;
      if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden';
    }
  });
  const out = await BUILD_METRICS(page);
  await page.locator('main').screenshot({ path: `${OUT}/${id}-build.png` });
  await page.close();
  return out;
}

async function pair(browser, id, width) {
  const w = Math.min(width, 1440);
  const page = await browser.newPage({ viewport: { width: w * 2 + 64, height: 1000 } });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 024 E</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
  const file = `${OUT}/${id}-pair.html`;
  writeFileSync(file, html);
  await page.goto(`file://${file}`);
  await page.waitForSelector('img');
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: `${OUT}/${id}-pair.png`, fullPage: true });
  await page.close();
}

const wanted = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let fixture = null;
let browser = null;
try {
  fixture = await startLearningsFixtureServer();
  taken.add(Number(new URL(fixture.base).port));
  const densePort = await freePort();
  start('node', ['src/server/index.ts', 'fixtures/dense', '--port', String(densePort)], { cwd: REPO });
  const sketchPort = await freePort();
  start('python3', ['-m', 'http.server', String(sketchPort), '--bind', '127.0.0.1', '--directory', `${REPO}/.planning/sketches`]);
  const bases = { fixture: fixture.base, dense: `http://127.0.0.1:${densePort}` };
  const sketch = `http://127.0.0.1:${sketchPort}/024-learnings-page/`;
  await waitFor(`${bases.dense}/api/dashboard`);
  await waitFor(sketch);
  console.log(`ports: fixture ${fixture.base}, dense ${bases.dense}, sketch ${sketch}`);

  const map = await routes(bases);
  const report = {};
  browser = await chromium.launch();
  for (const capture of CAPTURES) {
    const [id, doc, , width] = capture;
    if (wanted.length > 0 && !wanted.includes(id)) continue;
    if (!map[doc]) {
      report[id] = { error: 'no route' };
      continue;
    }
    try {
      const left = await captureSketch(browser, sketch, capture);
      const right = await captureBuild(browser, bases[DOCS[doc].project], map[doc], capture);
      await pair(browser, id, width);
      report[id] = { sketch: left, build: right };
      console.log(`captured ${id}`);
    } catch (error) {
      report[id] = { error: String(error) };
      console.log(`failed ${id}: ${error}`);
    }
  }
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
} finally {
  if (browser) await browser.close();
  for (const child of children) child.kill('SIGTERM');
  if (fixture) await fixture.stop();
}
