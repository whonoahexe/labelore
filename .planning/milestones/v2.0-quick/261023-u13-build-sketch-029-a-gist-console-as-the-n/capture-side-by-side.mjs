// quick-261023-u13: side-by-side captures - sketch 029 variant A (gist console) on the left, the build on the
// right - for all twelve sketch notes, plus dark, interaction, tablet and phone captures. The same steps run
// through Playwright's own chromium. The build is served by the read-only note fixture server this script
// starts itself, on a free port in 5310-5319 only (never 4173 / 4174, which are the user's running
// instances), and `python3 -m http.server` serves the sketch on another. Every child is stopped by PID at the
// end. The browser context is Asia/Kolkata and the build's clock is fixed at the sketch's NOW (23 Oct 2026,
// 12:00 local) so the ages match. PNGs and report.json (both sides' values and the differences found) land in
// the (gitignored) test/e2e/screenshots/u13.
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

const OUT = `${REPO}/test/e2e/screenshots/u13`;
const NOW = '2026-10-23T12:00:00+05:30';

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
  lsketch: 'notes/2026-10-23-sketches-page-in-labelore.md',
  pbrief: 'notes/2026-10-23-studio-media-workflow-milestone-brief.md',
  lperkind: 'notes/per-kind-artifact-rendering.md',
  lsurvey: 'notes/artifact-structure-survey.md',
};

// id, doc, theme, width, action
const CAPTURES = [
  ...Object.keys(DOCS).map((doc) => [`${doc}-light`, doc, 'light', 1440]),
  ...['dcrop', 'pcap', 'lperkind', 'lsurvey'].map((doc) => [`${doc}-dark`, doc, 'dark', 1440]),
  ['dcrop-verbatim', 'dcrop', 'light', 1440, 'verbatim'],
  ['pbrief-read', 'pbrief', 'light', 1440, 'read'],
  ['dcrop-1024', 'dcrop', 'light', 1024],
  ['lperkind-1024', 'lperkind', 'light', 1024],
  ...['star', 'dcrop', 'lsketch', 'pbrief', 'lsurvey'].map((doc) => [`${doc}-390`, doc, 'light', 390]),
];

const collectSketch = (page) =>
  page.evaluate(() => {
    const all = (s, root = document) => [...root.querySelectorAll(s)];
    const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
    const one = (s, root = document) => txt(root.querySelector(s));
    const root = document.querySelector('#root .page');
    return {
      h1: `${document.querySelectorAll('h1').length}:${one('.a-rail h1')}`,
      eyebrow: one('.a-rail .eyebrow'),
      context: one('.a-rail .ctx'),
      stage: one('.a-rail .stage-chip'),
      stageKey: document.querySelector('.a-rail .stage-chip')?.getAttribute('data-stage') ?? null,
      bigValue: one('.bignum b'),
      bigLabel: one('.bignum .l'),
      bigSub: one('.bignum .s'),
      bigStage: document.querySelector('.bignum')?.getAttribute('data-stage') ?? null,
      stats: all('.stats > div').map((e) => [txt(e.querySelector('span')), txt(e.querySelector('b')), e.querySelector('b')?.getAttribute('data-tone') ?? null]),
      gist: (one('.gist .say') ?? '').slice(0, 60),
      gistLong: document.querySelector('.gist .say')?.classList.contains('long') ?? null,
      line: (one('.gist .shape') ?? '').slice(0, 80),
      ledgerHeads: all('.ledger-head').map((e) => [one('h2', e), one('.kicker', e)]),
      rows: all('.lrow').map((e) => ({
        ix: one('.ix', e),
        label: one('.g .lbl', e) ?? (one('.g .kicker', e) ? 'Then' : null),
        labelTone: e.querySelector('.g .lbl')?.getAttribute('data-tone') ?? null,
        mark: e.getAttribute('data-tone') || null,
        first: (one('.t .first', e) ?? '').slice(0, 40),
        refs: all('button.fref', e).length,
        idents: all('.idf', e).length,
      })),
      parts: all('.erow').map((e) => ({
        ix: one('.ix', e),
        title: one('h3', e),
        key: e.querySelector('.key') ? one('.key', e).slice(0, 40) : null,
        items: all('.items li', e).filter((li) => !li.querySelector('.muted')).map((li) => one('b', li) ?? ''),
        more: one('.items li .muted', e),
        flags: all('.flags p', e).map((p) => [one('.lbl', p), p.querySelector('.lbl')?.getAttribute('data-tone')]),
        figs: all('.fig-chip', e).map(txt),
        side: all('.side span', e).map(txt),
        read: one('.side .link-btn', e),
        open: !!e.querySelector('.full'),
      })),
      cards: all('.tcard').map((e) => ({ kicker: one('.kicker', e), status: e.getAttribute('data-s'), title: one('h3', e), none: one('.none', e), open: one('.link-btn', e) })),
      whole: one('.whole'),
      toggle: all('.seg[aria-label="Note view"] button').map((e) => `${txt(e)}${e.getAttribute('aria-pressed') === 'true' ? ' [on]' : ''}`),
      verbatim: (one('.verbatim') ?? '').slice(0, 60),
      mentions: all('.refl button').map(txt),
      also: all('.source-only .chip').map(txt),
      overflow: root ? root.scrollWidth > root.clientWidth + 1 : null,
    };
  });

const collectBuild = (page) =>
  page.evaluate(() => {
    const all = (s, root = document) => [...root.querySelectorAll(s)];
    const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
    const one = (s, root = document) => txt(root.querySelector(s));
    const root = document.querySelector('main');
    return {
      h1: `${document.querySelectorAll('h1').length}:${one('.view-note-rail h1')}`,
      eyebrow: one('.view-note-rail .eyebrow'),
      context: one('.view-note-context'),
      stage: one('.view-note-stage'),
      stageKey: document.querySelector('.view-note-stage')?.getAttribute('data-stage') ?? null,
      bigValue: one('.view-note-big b'),
      bigLabel: one('.view-note-big-label'),
      bigSub: one('.view-note-big-sub'),
      bigStage: document.querySelector('.view-note-big')?.getAttribute('data-stage') ?? null,
      stats: all('.view-note-stats > div').map((e) => [txt(e.querySelector('dt')), txt(e.querySelector('dd')), e.querySelector('dd')?.getAttribute('data-tone') ?? null]),
      gist: (one('.view-note-say') ?? '').slice(0, 60),
      gistLong: document.querySelector('.view-note-say')?.getAttribute('data-long') === 'true',
      line: (one('.view-note-line') ?? '').slice(0, 80),
      ledgerHeads: all('.view-note-ledger-head').map((e) => [one('h2', e), one('.view-note-kicker', e)]),
      rows: all('.view-note-row').map((e) => ({
        ix: one('.view-note-index', e),
        label: one('.view-note-label', e) ?? (one('.view-note-then', e) ? 'Then' : null),
        labelTone: e.querySelector('.view-note-label')?.getAttribute('data-tone') ?? null,
        mark: e.getAttribute('data-tone') || null,
        first: (one('.view-note-first', e) ?? '').slice(0, 40),
        refs: all('button.view-note-ref', e).length,
        idents: all('.view-note-ident', e).length,
      })),
      parts: all('.view-note-part').map((e) => ({
        ix: one('.view-note-index', e),
        title: one('.view-note-part-title', e),
        key: e.querySelector('.view-note-part-key') ? one('.view-note-part-key', e).slice(0, 40) : null,
        items: all('.view-note-items li', e).filter((li) => !li.classList.contains('view-note-more')).map((li) => one('b', li) ?? ''),
        more: one('.view-note-more', e),
        flags: all('.view-note-flags p', e).map((p) => [one('.view-note-label', p), p.querySelector('.view-note-label')?.getAttribute('data-tone')]),
        figs: all('.view-note-figure', e).map(txt),
        side: all('.view-note-side > span', e).map(txt),
        read: one('.view-note-read', e),
        open: !!e.querySelector('.view-note-full'),
      })),
      cards: all('.view-note-todo').map((e) => ({ kicker: one('.view-note-kicker', e), status: e.getAttribute('data-status'), title: one('.view-note-todo-title', e), none: one('.view-note-none', e), open: one('.view-note-open', e) })),
      whole: one('.view-note-whole'),
      toggle: all('.view-note-toggle button').map((e) => `${txt(e)}${e.getAttribute('aria-pressed') === 'true' ? ' [on]' : ''}`),
      verbatim: (one('.view-note-verbatim') ?? '').slice(0, 60),
      mentions: all('.view-note-mention').map((e) => txt(e.querySelector('span:first-child')) + (e.querySelector('.view-note-count') ? txt(e.querySelector('.view-note-count')) : '')),
      also: all('.view-note-also .status-chip').map(txt),
      overflow: root ? root.scrollWidth > root.clientWidth + 1 : null,
    };
  });

// What the build changes on purpose (see the SUMMARY): no project name in the eyebrow, "Sep" for "Sept", the
// real todo for the sketches note, the file's own line count, singulars, the explore toggle, "Copied" inline,
// the card kicker of a promoted note with no todo and the sketch-only Synthetic chip.
function normalise(side, value) {
  const fix = (s) =>
    typeof s === 'string'
      ? s.replace(/Sept\b/g, 'Sep').replace(/(\d+ \w{3}) 2026 · (\d\d:\d\d)/g, '$1 $2')
      : s;
  const walk = (v) => (Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : fix(v));
  const out = walk(value);
  if (side === 'sketch' && typeof out.eyebrow === 'string') out.eyebrow = out.eyebrow.replace(/ · .*$/, '');
  if (side === 'sketch') {
    out.stats = out.stats.map(([l, v, t]) => (l === 'Lines' ? [l, '(lines)', t] : [l, v, t]));
    out.mentions = out.mentions.map((m) => m.replace(/(\S)×/, '$1×'));
  } else out.stats = out.stats.map(([l, v, t]) => (l === 'Lines' ? [l, '(lines)', t] : [l, v, t]));
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
  read: (page) => page.locator('[data-open="a0"]').click(),
};
const BUILD_ACTIONS = {
  verbatim: (page) => page.getByRole('button', { name: 'As written', exact: true }).click(),
  read: (page) => page.locator('.view-note-read').first().click(),
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
  await page.addStyleTag({ content: '#variant-nav, #sketch-tools, .shell-header, .toast, .variant-tab { display: none !important; } * { animation: none !important; transition: none !important; }' });
  if (action) await SKETCH_ACTIONS[action](page);
  await page.evaluate(() => document.querySelectorAll('body > div[style*="position:fixed"]').forEach((e) => e.remove()));
  const out = await collectSketch(page);
  await grow(page, Math.min(width, 1440), '#root .page');
  await page.locator('#root .page').screenshot({ path: `${OUT}/${id}-sketch.png` });
  await context.close();
  return out;
}

async function captureBuild(browser, base, route, [id, , theme, width, action]) {
  const { page, context } = await newPage(browser, { width, height: 1000 });
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${base}${route}`);
  await page.waitForSelector('.view-note-rail');
  await page.evaluate(() => document.fonts.ready);
  if (action) await BUILD_ACTIONS[action](page);
  const out = await collectBuild(page);
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
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 029 A</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
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
  const sketch = `http://127.0.0.1:${sketchPort}/029-note-gist/`;
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
