// quick-261023-61k: side-by-side captures - sketch 027 variant C (the lifecycle) on the left, the build on
// the right - for all eleven sketch todos, plus interaction, dark and narrow captures. The same steps run
// through Playwright's own chromium. The build is served by the read-only todo fixture server this script
// starts itself, on a free port in 5310-5319 only (never 4173 / 4174, which are the user's running
// instances), and `python3 -m http.server` serves the sketch on another. Every child is stopped by PID at
// the end. The browser context is Asia/Kolkata with the clock fixed at the sketch's NOW (23 Oct 2026
// 12:00). PNGs and report.json (both sides' values and the differences found) land in the (gitignored)
// test/e2e/screenshots/61k.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';

const REPO = '/home/noah/Work/Personal/labelore';
const require = createRequire(`${REPO}/package.json`);
const { chromium } = require('@playwright/test');
const { startTodoFixtureServer } = await import(`${REPO}/test/e2e/todo-fixture-server.ts`);

const OUT = `${REPO}/test/e2e/screenshots/61k`;
const NOW = new Date('2026-10-23T12:00:00+05:30');

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

// sketch key -> which artifact path ends the same way on the build side
const DOCS = {
  dcrop: 'todos/completed/2026-10-21-add-crop-and-round-profile-photos.md',
  dsfx: 'todos/completed/2026-10-20-sound-effects.md',
  dcall: 'todos/completed/2026-10-20-call-debug-logging.md',
  sretry: 'todos/pending/2026-10-12-retry-queue-dead-letter.md',
  srec: 'todos/pending/2026-10-15-reconcile-report-pdf.md',
  star: 'todos/pending/004-tariff-note-tooltips.md',
  sport: 'todos/completed/2026-10-02-port-timezone-table.md',
  pcheck: 'todos/pending/pre-milestone-hardware-and-tier-cleanup.md',
  pdev: 'todos/completed/portal-detect-vanished-tier-device.md',
  lfig: 'todos/pending/lifted-figures-everywhere.md',
  ldrift: 'todos/done/artifact-chrome-drift.md',
};

// id, doc, theme, width, action
const CAPTURES = [
  ...Object.keys(DOCS).map((doc) => [`${doc}-light`, doc, 'light', 1440]),
  ['dcrop-dark', 'dcrop', 'dark', 1440],
  ['sretry-dark', 'sretry', 'dark', 1440],
  ['ldrift-dark', 'ldrift', 'dark', 1440],
  ['dcrop-unfold', 'dcrop', 'light', 1440, 'unfold'],
  ['ldrift-fold', 'ldrift', 'light', 1440, 'fold'],
  ['pcheck-now', 'pcheck', 'light', 1440, 'now'],
  ...['1024', '820', '390'].flatMap((w) => [
    [`dcrop-${w}`, 'dcrop', 'light', Number(w)],
    [`pcheck-${w}`, 'pcheck', 'light', Number(w)],
  ]),
];

const collect = (S) => (page) =>
  page.evaluate((S) => {
    const all = (s, root = document) => [...root.querySelectorAll(s)];
    const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
    const one = (s, root = document) => txt(root.querySelector(s));
    const root = document.querySelector(S.root);
    return {
      h1: `${document.querySelectorAll('h1').length}:${one('h1')}`,
      eyebrow: one(S.eyebrow),
      created: one(S.created),
      chips: all(S.chips).map((e) => ({ text: txt(e), tone: e.getAttribute('data-tone') ?? e.getAttribute('data-sev') ?? e.getAttribute('data-severity') ?? null })),
      steps: all(S.steps).map((e) => ({ key: one(S.stepKey, e), value: one(S.stepValue, e), sub: one(S.stepSub, e), state: e.getAttribute(S.stepState), button: e.tagName === 'BUTTON' })),
      stages: all(S.stages).map((e) => ({ number: one(S.node, e), title: one('h2', e), kicker: one(S.stageKicker, e), state: e.getAttribute(S.stageState) })),
      notes: all(S.notes).map((e) => ({
        kickers: all(S.noteKickers, e).map(txt),
        clamped: e.querySelector(S.noteClamped) !== null,
        actions: all(S.noteActions, e).map(txt),
        start: (one(S.noteText, e) ?? '').slice(0, 60),
      })),
      pairKickers: all(S.pairKickers).map(txt),
      checks: all(S.checks).map((e) => e.getAttribute('data-done')),
      files: all(S.files).map(txt),
      filesKicker: one(S.filesKicker),
      folds: all(S.folds).map((e) => `${txt(e)}${e.parentElement.open || e.open ? ' [open]' : ''}`),
      close: (one(S.close) ?? '').slice(0, 80),
      commits: all(S.commits).map(txt),
      wait: one(S.wait),
      empty: one(S.empty),
      also: all(S.also).map(txt),
      overflow: root ? root.scrollWidth > root.clientWidth + 1 : null,
    };
  }, S);

const SKETCH_METRICS = collect({
  root: '#root .page',
  eyebrow: '.meta-left .eyebrow',
  created: '.meta-left .date',
  chips: '.c-head .chips > *',
  steps: '.c-step',
  stepKey: '.k',
  stepValue: 'b',
  stepSub: 'span.s',
  stepState: 'data-s',
  stages: '.stage',
  node: '.node',
  stageKicker: '.sh .kicker',
  stageState: 'data-s',
  notes: '.nprev',
  noteKickers: '.nh .kicker',
  noteClamped: '.nt.clamp3',
  noteActions: '.nf .link-btn',
  noteText: '.nt',
  pairKickers: '#st-todo .body > .c-pair .kicker, #st-todo .body > div:first-of-type > .kicker',
  checks: '#st-todo .ck',
  files: '.c-files .file',
  filesKicker: '.c-files .kicker',
  folds: 'details.fold > summary',
  close: '.c-close .md',
  commits: '.c-close .chip',
  wait: '.c-wait',
  empty: '#st-todo p.muted',
  also: '.source-only .chip',
});

const BUILD_METRICS = collect({
  root: 'main',
  eyebrow: '.view-todo-meta-left .eyebrow',
  created: '.view-todo-date',
  chips: '.view-todo-chips > *',
  steps: '.view-todo-step',
  stepKey: '.view-todo-step-key',
  stepValue: '.view-todo-step-value',
  stepSub: '.view-todo-step-sub',
  stepState: 'data-state',
  stages: '.view-todo-stage',
  node: '.view-todo-node',
  stageKicker: '.view-todo-stage-head .view-todo-kicker',
  stageState: 'data-state',
  notes: '.view-todo-note',
  noteKickers: '.view-todo-note-head .view-todo-kicker',
  noteClamped: '.view-todo-note-text[data-clamped="true"]',
  noteActions: '.view-todo-note-foot .view-todo-link',
  noteText: '.view-todo-note-text',
  pairKickers: '#todo-captured .view-todo-part > .view-todo-kicker',
  checks: '#todo-captured .view-todo-check',
  files: '.view-todo-files .view-todo-file',
  filesKicker: '.view-todo-files .view-todo-kicker',
  folds: '.view-todo-fold > summary',
  close: '.view-todo-close .view-todo-md',
  commits: '.view-todo-commit',
  wait: '.view-todo-wait',
  empty: '.view-todo-empty',
  also: '.view-todo-also .status-chip',
});

// The sketch's own wording for what the build changes on purpose: the eyebrow carries no project name, months
// use "Sep", the pip squares carry the written value in the same text, and the chip classes differ.
function normalise(side, value) {
  const fix = (s) => (typeof s === 'string' ? s.replace(/Sept\b/g, 'Sep') : s);
  const walk = (v) => (Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : fix(v));
  const out = walk(value);
  if (side === 'sketch' && typeof out.eyebrow === 'string') out.eyebrow = out.eyebrow.replace(/ · .*$/, '');
  if (side === 'sketch') {
    // The sketch's synthetic chip is sketch-only; its tone attributes use hi/mid/lo/none.
    out.chips = out.chips.filter((c) => c.text !== 'Synthetic').map((c) => ({ ...c, tone: { hi: 'high', mid: 'medium', lo: 'low', none: 'unrated' }[c.tone] ?? c.tone }));
  }
  return out;
}

function differences(sketch, build) {
  const a = normalise('sketch', sketch);
  const b = normalise('build', build);
  const out = [];
  for (const key of Object.keys(a)) {
    const x = JSON.stringify(a[key]);
    const y = JSON.stringify(b[key]);
    if (x !== y) out.push({ field: key, sketch: a[key], build: b[key] });
  }
  return out;
}

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
  unfold: (page) => page.click('.nprev [data-fold="n0"]'),
  fold: (page) => page.locator('details.fold > summary').last().click(),
  now: (page) => page.click('.c-step[data-jump="st-close"]'),
};
const BUILD_ACTIONS = {
  unfold: (page) => page.locator('.view-todo-note-foot button').first().click(),
  fold: (page) => page.locator('.view-todo-fold > summary').last().click(),
  now: (page) => page.locator('.view-todo-step').nth(2).click(),
};

async function newPage(browser, viewport) {
  const context = await browser.newContext({ viewport, timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  await page.clock.setFixedTime(NOW);
  return { page, context };
}

async function captureSketch(browser, sketch, [id, doc, theme, width, action]) {
  const { page, context } = await newPage(browser, { width: width <= 820 ? width : Math.min(width, 1440), height: 1000 });
  await page.goto(`${sketch}?v=c&doc=${doc}&theme=${theme}`);
  await page.waitForSelector('#root .page');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '#variant-nav, #sketch-tools, .shell-header, .toast { display: none !important; } * { animation: none !important; transition: none !important; }' });
  if (action) await SKETCH_ACTIONS[action](page);
  const out = await SKETCH_METRICS(page);
  await grow(page, Math.min(width, 1440), '#root .page');
  await page.locator('#root .page').screenshot({ path: `${OUT}/${id}-sketch.png` });
  await context.close();
  return out;
}

async function captureBuild(browser, base, route, [id, , theme, width, action]) {
  const { page, context } = await newPage(browser, { width, height: 1000 });
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${base}${route}`);
  await page.waitForSelector('.view-todo-head');
  await page.evaluate(() => document.fonts.ready);
  if (action) await BUILD_ACTIONS[action](page);
  const out = await BUILD_METRICS(page);
  await grow(page, width, 'main');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('main')) continue;
      const p = getComputedStyle(el).position;
      if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden';
    }
  });
  await page.locator('main').screenshot({ path: `${OUT}/${id}-build.png` });
  await context.close();
  return out;
}

async function pair(browser, id, width) {
  const w = Math.min(width, 1440);
  const page = await browser.newPage({ viewport: { width: w * 2 + 64, height: 1000 } });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 027 C</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
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
  fixture = await startTodoFixtureServer();
  taken.add(Number(new URL(fixture.base).port));
  const sketchPort = await freePort();
  start('python3', ['-m', 'http.server', String(sketchPort), '--bind', '127.0.0.1', '--directory', `${REPO}/.planning/sketches`]);
  const sketch = `http://127.0.0.1:${sketchPort}/027-todo-page/`;
  await waitFor(sketch);
  console.log(`ports: fixture ${fixture.base}, sketch ${sketch}; placed ${fixture.placed.join(',')}`);

  const map = await routes(fixture.base);
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
      const right = await captureBuild(browser, fixture.base, map[doc], capture);
      await pair(browser, id, width);
      report[id] = { sketch: left, build: right, differences: differences(left, right) };
      console.log(`captured ${id}${report[id].differences.length ? ` (${report[id].differences.map((d) => d.field).join(', ')} differ)` : ''}`);
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
