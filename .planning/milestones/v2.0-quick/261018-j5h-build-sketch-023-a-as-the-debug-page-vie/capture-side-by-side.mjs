// quick-261018-j5h: side-by-side captures - sketch 023 variant A (the case file) on the left, the build on
// the right - for all six sketch sessions, plus interaction, dark and narrow captures. gsd-browser was not
// connected in this session, so the same steps run through Playwright's own chromium. The build is served
// by the read-only debug fixture server this script starts itself, on a free port in 5310-5319 only (never
// 4173 / 4174, which are the user's running instances), and `python3 -m http.server` serves the sketch on
// another. Every child is stopped by PID at the end. The sibling projects are only read (their sessions
// are copied out to the fixture server's temp project). PNGs and report.json land in the (gitignored)
// test/e2e/screenshots/j5h.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';

const REPO = '/home/noah/Work/Personal/labelore';
const require = createRequire(`${REPO}/package.json`);
const { chromium } = require('@playwright/test');
const { startDebugFixtureServer } = await import(`${REPO}/test/e2e/debug-fixture-server.ts`);

const OUT = `${REPO}/test/e2e/screenshots/j5h`;

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
    taken.add(port);
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

// doc -> which artifact path ends the same way on the build side
const DOCS = {
  lb: 'debug/resolved/loading-state-regression.md',
  dd: 'debug/mr-series-selection-picks-dwi.md',
  sa: 'debug/sfu-no-audio.md',
  rs: 'debug/resolved/heartbeat-stops-after-net-drop.md',
  sr: 'debug/sfu-reconnect-presence.md',
  syn: 'debug/search-index-goes-stale.md',
};

// id, doc, theme, width, action
const CAPTURES = [
  ['lb-light', 'lb', 'light', 1440],
  ['dd-light', 'dd', 'light', 1440],
  ['sa-light', 'sa', 'light', 1440],
  ['rs-light', 'rs', 'light', 1440],
  ['sr-light', 'sr', 'light', 1440],
  ['syn-light', 'syn', 'light', 1440],
  ['lb-dark', 'lb', 'dark', 1440],
  ['dd-dark', 'dd', 'dark', 1440],
  ['syn-dark', 'syn', 'dark', 1440],
  ['lb-rules-out', 'lb', 'light', 1440, 'rules-out'],
  ['lb-resolution', 'lb', 'light', 1440, 'resolution'],
  ['lb-more-code', 'lb', 'light', 1440, 'more-code'],
  ['rs-trigger', 'rs', 'light', 1440, 'trigger'],
  ['sr-all', 'sr', 'light', 1440, 'all'],
  ['lb-1024', 'lb', 'light', 1024],
  ['lb-820', 'lb', 'light', 820],
  ['lb-390', 'lb', 'light', 390],
  ['syn-1024', 'syn', 'light', 1024],
  ['syn-820', 'syn', 'light', 820],
  ['syn-390', 'syn', 'light', 390],
];
const MODAL_ACTIONS = new Set(['resolution', 'more-code']);

const metrics = (S) => (page) =>
  page.evaluate((S) => {
    const all = (s) => [...document.querySelectorAll(s)];
    const q = (s) => document.querySelectorAll(s).length;
    const txt = (e) => e.textContent.replace(/\s+/g, ' ').trim();
    const t = (s) => (document.querySelector(s) ? txt(document.querySelector(s)) : null);
    const root = document.querySelector(S.root);
    return {
      h1: `${q('h1')}:${t('h1')}`,
      eyebrow: t(S.eyebrow),
      dates: all(S.dates).map(txt),
      archived: all(S.chips).map(txt),
      status: t(S.status),
      reported: t(S.by),
      facts: t(S.facts),
      leadKicker: t(S.leadKicker),
      causeLabels: all(S.causeLabels).map(txt),
      fieldKickers: all(S.fieldKickers).map(txt),
      verification: all(S.vchips).map(txt),
      fileChips: q(S.files),
      symptomLabels: all(S.symptomLabels).map(txt),
      suspectColumns: all(S.columns).map(txt),
      filters: all(S.filters).map((e) => `${txt(e)}${e.getAttribute('aria-pressed') === 'true' ? ' [pressed]' : ''}`),
      entryNumbers: all(S.entryNumbers).map((e) => txt(e).split(' · ')[0]),
      rounds: all(S.rounds).map(txt),
      also: all(S.also).map(txt),
      overflow: root ? root.scrollWidth > root.clientWidth + 1 : null,
    };
  }, S);

const BUILD_METRICS = metrics({
  root: 'main',
  eyebrow: '.view-debug-meta-left .eyebrow',
  dates: '.view-debug-date',
  chips: '.view-debug-meta-left .status-chip',
  status: '.view-debug-status',
  by: '.view-debug-by',
  facts: '.view-debug-facts',
  leadKicker: '.view-debug-lead > .view-debug-kicker:first-child',
  causeLabels: '.view-debug-cause-label',
  fieldKickers: '.view-debug-lead .view-debug-field > .view-debug-kicker',
  vchips: '.view-debug-vchip',
  files: '.view-debug-file',
  symptomLabels: '.view-debug-ea .view-debug-kicker, .view-debug-symptoms .view-debug-kicker',
  columns: '.view-debug-column > header',
  filters: '.view-debug-filter',
  entryNumbers: '.view-debug-ts',
  rounds: '.view-debug-round',
  also: '.view-debug-also .status-chip',
});
const SKETCH_METRICS = metrics({
  root: '#root .page',
  eyebrow: '.meta-left .eyebrow',
  dates: '.meta-left .date',
  chips: '.meta-left .chip',
  status: '.status-badge',
  by: '.quote-big .by',
  facts: '.facts-line',
  leadKicker: '.lead > .kicker:first-child',
  causeLabels: '.lead ol.causes .cl',
  fieldKickers: '.lead .field > .kicker',
  vchips: '.vchip',
  files: '.files code',
  symptomLabels: '.ea .kicker, .sym-more .kicker',
  columns: '.scol > header',
  filters: '.filters button',
  entryNumbers: '.ev .ts',
  rounds: '.round',
  also: '.source-only .chip',
});

async function routes(base) {
  const out = {};
  const presentation = await (await fetch(`${base}/api/presentation`)).json();
  for (const [id, needle] of Object.entries(DOCS)) {
    const found = presentation.artifacts.find((a) => a.path.endsWith(needle));
    if (found) out[id] = found.key;
    else console.log(`no artifact ${needle}`);
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
  'rules-out': (page) => page.click('.filters button[data-evf="eliminates"]'),
  resolution: (page) => page.click('button[data-modal="resolution"]'),
  'more-code': (page) => page.click('ol.causes li:has(.cl:text-is("CODE")) button[data-more]'),
  trigger: (page) => page.click('button[data-toggle="trig"]'),
  all: (page) => page.click('.filters button[data-evf="all"]'),
};
const BUILD_ACTIONS = {
  'rules-out': (page) => page.click('.view-debug-filter:has-text("Rules out")'),
  resolution: (page) => page.click('button.view-debug-link:has-text("The full root cause")'),
  'more-code': (page) => page.click('.view-debug-causes li:has(.view-debug-cause-label:text-is("CODE")) .view-debug-more'),
  trigger: (page) => page.click('.view-debug-by button'),
  all: (page) => page.click('.view-debug-filter:has-text("All")'),
};

async function captureSketch(browser, sketch, [id, doc, theme, width, action]) {
  const page = await browser.newPage({ viewport: { width: width <= 820 ? width : 1440, height: 1000 } });
  await page.goto(`${sketch}?v=a&doc=${doc}&theme=${theme}`);
  await page.waitForSelector('#root .page');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '#variant-nav, #sketch-tools, .shell-header, .toast { display: none !important; } * { animation: none !important; transition: none !important; }' });
  if (action) await SKETCH_ACTIONS[action](page);
  const out = await SKETCH_METRICS(page);
  if (MODAL_ACTIONS.has(action)) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${OUT}/${id}-sketch.png` });
  } else {
    await grow(page, Math.min(width, 1440), '#root .page');
    await page.locator('#root .page').screenshot({ path: `${OUT}/${id}-sketch.png` });
  }
  await page.close();
  return out;
}

async function captureBuild(browser, base, route, [id, , theme, width, action]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${base}${route}`);
  await page.waitForSelector('.view-debug-head');
  await page.evaluate(() => document.fonts.ready);
  if (action) await BUILD_ACTIONS[action](page);
  const out = await BUILD_METRICS(page);
  if (MODAL_ACTIONS.has(action)) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${OUT}/${id}-build.png` });
  } else {
    await grow(page, width, 'main');
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('main')) continue;
        const p = getComputedStyle(el).position;
        if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden';
      }
    });
    await page.locator('main').screenshot({ path: `${OUT}/${id}-build.png` });
  }
  await page.close();
  return out;
}

async function pair(browser, id, width, modal) {
  const w = modal ? 1440 : Math.min(width, 1440);
  const page = await browser.newPage({ viewport: { width: w * 2 + 64, height: 1000 } });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 023 A</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
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
  fixture = await startDebugFixtureServer();
  taken.add(Number(new URL(fixture.base).port));
  const sketchPort = await freePort();
  start('python3', ['-m', 'http.server', String(sketchPort), '--bind', '127.0.0.1', '--directory', `${REPO}/.planning/sketches`]);
  const sketch = `http://127.0.0.1:${sketchPort}/023-debug-page/`;
  await waitFor(sketch);
  console.log(`ports: fixture ${fixture.base}, sketch ${sketch}; placed ${fixture.placed.join(',')}`);

  const map = await routes(fixture.base);
  const report = {};
  browser = await chromium.launch();
  for (const capture of CAPTURES) {
    const [id, doc, , width, action] = capture;
    if (wanted.length > 0 && !wanted.includes(id)) continue;
    if (!map[doc]) {
      report[id] = { error: 'no route' };
      continue;
    }
    try {
      const left = await captureSketch(browser, sketch, capture);
      const right = await captureBuild(browser, fixture.base, map[doc], capture);
      await pair(browser, id, width, MODAL_ACTIONS.has(action));
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
