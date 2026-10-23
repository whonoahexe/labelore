// quick-261023-61l: side-by-side captures - sketch 028 variant A (annotated) on the left, the build on the
// right - for all ten sketch notes, plus dark, interaction and narrow captures. The same steps run through
// Playwright's own chromium. The build is served by the read-only note fixture server this script starts
// itself, on a free port in 5310-5319 only (never 4173 / 4174, which are the user's running instances), and
// `python3 -m http.server` serves the sketch on another. Every child is stopped by PID at the end. The
// browser context is Asia/Kolkata. PNGs and report.json (both sides' values and the differences found) land
// in the (gitignored) test/e2e/screenshots/61l.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';

const REPO = '/home/noah/Work/Personal/labelore';
const require = createRequire(`${REPO}/package.json`);
const { chromium } = require('@playwright/test');
const { startNoteFixtureServer } = await import(`${REPO}/test/e2e/note-fixture-server.ts`);

const OUT = `${REPO}/test/e2e/screenshots/61l`;

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
  dcrop: 'notes/2026-10-21-crop-images-and-profile-photos.md',
  dround: 'notes/2026-10-21-round-profile-photos.md',
  dsfx: 'notes/2026-10-20-sound-effects.md',
  dcall: 'notes/2026-10-20-call-debug-logging-webrtc-turn.md',
  dback: 'notes/2026-10-20-back-button-closes-app.md',
  pcap: 'notes/2026-10-21-raise-single-file-download-cap.md',
  star: 'notes/2026-10-16-tariff-note-tooltips.md',
  sundo: 'notes/2026-10-08-brokers-want-undo.md',
  pbrief: 'notes/2026-10-23-studio-media-workflow-milestone-brief.md',
  lperkind: 'notes/per-kind-artifact-rendering.md',
};

// id, doc, theme, width, action
const CAPTURES = [
  ...Object.keys(DOCS).map((doc) => [`${doc}-light`, doc, 'light', 1440]),
  ['dcrop-dark', 'dcrop', 'dark', 1440],
  ['pcap-dark', 'pcap', 'dark', 1440],
  ['lperkind-dark', 'lperkind', 'dark', 1440],
  ['dcrop-verbatim', 'dcrop', 'light', 1440, 'verbatim'],
  ['dcrop-ref', 'dcrop', 'light', 1440, 'ref'],
  ...['1024', '820', '390'].flatMap((w) => [
    [`dcrop-${w}`, 'dcrop', 'light', Number(w)],
    [`star-${w}`, 'star', 'light', Number(w)],
    [`lperkind-${w}`, 'lperkind', 'light', Number(w)],
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
      short: document.querySelector('h1')?.matches(S.shortTitle) ?? false,
      eyebrow: one(S.eyebrow),
      noted: one(S.noted),
      promoted: all(S.promoted).map((e) => ({ text: txt(e), tone: e.getAttribute('data-tone') })).filter((c) => c.text !== 'Synthetic'),
      toggle: all(S.toggle).map((e) => `${txt(e)}${e.getAttribute('aria-pressed') === 'true' ? ' [on]' : ''}`),
      rows: all(S.rows).map((e) => ({
        gutter: one(S.gutter, e),
        tone: e.querySelector(S.gutterTone)?.getAttribute('data-tone') ?? null,
        start: (one(S.rowText, e) ?? '').slice(0, 50),
        refs: all(S.rowRefs, e).length,
        idents: all(S.rowIdents, e).length,
      })),
      whole: one(S.whole),
      verbatim: (one(S.verbatim) ?? '').slice(0, 60),
      mentions: all(S.mentions).map((e) => txt(e)),
      pressed: all(S.pressed).length,
      cards: all(S.cards).map((e) => ({
        status: e.getAttribute(S.cardStatus),
        top: all(S.cardRow, e).map((x) => ({ text: txt(x), tone: x.getAttribute('data-tone') ?? x.getAttribute('data-level') ?? x.getAttribute('data-sev') })),
        title: one(S.cardTitle, e),
        via: one(S.cardVia, e),
        resolution: (one(S.cardRes, e) ?? '').slice(0, 60),
        none: one(S.cardNone, e),
        batched: all(S.cardBatched, e).map(txt),
        open: one(S.cardOpen, e),
      })),
      contents: all(S.contents).map(txt),
      lede: (one(S.lede) ?? '').slice(0, 60),
      also: all(S.also).map(txt),
      overflow: root ? root.scrollWidth > root.clientWidth + 1 : null,
    };
  }, S);

const SKETCH_METRICS = collect({
  root: '#root .page',
  shortTitle: '.short',
  eyebrow: '.meta-left .eyebrow',
  noted: '.meta-left .date',
  promoted: '.meta-left .chip',
  toggle: '.verb-toggle button',
  rows: '.clause',
  gutter: '.g',
  gutterTone: '.lbl',
  rowText: '.t',
  rowRefs: 'button.fref',
  rowIdents: '.idf',
  whole: '.whole',
  verbatim: '.verbatim',
  mentions: '.refl button',
  pressed: '.refl button.on, button.fref.hl',
  cards: '.tcard',
  cardStatus: 'data-s',
  cardRow: '.row > *',
  cardTitle: 'h3',
  cardVia: '.row ~ span.kicker',
  cardRes: '.res',
  cardNone: '.none',
  cardBatched: '.sib button',
  cardOpen: '.link-btn',
  contents: '.toc button',
  lede: '.lede-ctx',
  also: '.source-only .chip',
});

const BUILD_METRICS = collect({
  root: 'main',
  shortTitle: '[data-short="true"]',
  eyebrow: '.view-note-meta-left .eyebrow',
  noted: '.view-note-date',
  promoted: '.view-note-meta-left .status-chip',
  toggle: '.view-note-toggle button',
  rows: '.view-note-clause',
  gutter: '.view-note-gutter',
  gutterTone: '.view-note-label',
  rowText: '.view-note-text',
  rowRefs: 'button.view-note-ref',
  rowIdents: '.view-note-ident',
  whole: '.view-note-whole',
  verbatim: '.view-note-verbatim',
  mentions: '.view-note-mention',
  pressed: '.view-note-mention[aria-pressed="true"], .view-note-ref[aria-pressed="true"]',
  cards: '.view-note-todo',
  cardStatus: 'data-status',
  cardRow: '.view-note-todo-row > *',
  cardTitle: '.view-note-todo-title',
  cardVia: '.view-note-via',
  cardRes: '.view-note-resolution',
  cardNone: '.view-note-none',
  cardBatched: '.view-note-sibling',
  cardOpen: '.view-note-open',
  contents: '.view-note-contents button',
  lede: '.view-note-lede',
  also: '.view-note-also .status-chip',
});

// What the build changes on purpose: the eyebrow carries no project name, months use "Sep", the empty card of
// a promoted note says "Promoted, but untraced", the batched row's stamp carries its year, and the sketch
// has a Synthetic chip and writes the sketch's own weight text for an unrated todo.
function normalise(side, value) {
  const fix = (s) =>
    typeof s === 'string'
      ? s.replace(/Sept\b/g, 'Sep').replace(/(\d+ \w{3}) 2026 · (\d\d:\d\d)/g, '$1 $2').replace(/^Promoted, but untraced$/, 'Promoted')
      : s;
  const walk = (v) => (Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : fix(v));
  const out = walk(value);
  if (side === 'sketch' && typeof out.eyebrow === 'string') out.eyebrow = out.eyebrow.replace(/ · .*$/, '');
  // The sketch's chips without a tone attribute are the build's quiet chips; the sketch's pips use hi/mid/lo/none.
  for (const card of out.cards) card.top = card.top.map((t) => ({ ...t, tone: t.tone === 'quiet' ? null : ({ hi: 'high', mid: 'medium', lo: 'low', none: 'unrated' }[t.tone] ?? t.tone) }));
  out.promoted = out.promoted.map((c) => ({ ...c, tone: c.tone === 'quiet' ? null : c.tone }));
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
  verbatim: (page) => page.click('[data-verb="1"]'),
  ref: (page) => page.locator('.refl button').first().click(),
};
const BUILD_ACTIONS = {
  verbatim: (page) => page.getByRole('button', { name: 'As written', exact: true }).click(),
  ref: (page) => page.locator('.view-note-mention').first().click(),
};

async function newPage(browser, viewport) {
  const context = await browser.newContext({ viewport, timezoneId: 'Asia/Kolkata', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  return { page, context };
}

async function captureSketch(browser, sketch, [id, doc, theme, width, action]) {
  const { page, context } = await newPage(browser, { width: width <= 820 ? width : Math.min(width, 1440), height: 1000 });
  await page.goto(`${sketch}?v=a&doc=${doc}&theme=${theme}`);
  await page.waitForSelector('#root .page');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '#variant-nav, #sketch-tools, .shell-header, .toast { display: none !important; } * { animation: none !important; transition: none !important; }' });
  if (action) await SKETCH_ACTIONS[action](page);
  await page.evaluate(() => document.querySelectorAll('body > div[style*="position:fixed"]').forEach((e) => e.remove()));
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
  await page.waitForSelector('.view-note-head');
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
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 028 A</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
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
  fixture = await startNoteFixtureServer();
  taken.add(Number(new URL(fixture.base).port));
  const sketchPort = await freePort();
  start('python3', ['-m', 'http.server', String(sketchPort), '--bind', '127.0.0.1', '--directory', `${REPO}/.planning/sketches`]);
  const sketch = `http://127.0.0.1:${sketchPort}/028-note-page/`;
  await waitFor(sketch);
  console.log(`ports: fixture ${fixture.base}, sketch ${sketch}`);

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
