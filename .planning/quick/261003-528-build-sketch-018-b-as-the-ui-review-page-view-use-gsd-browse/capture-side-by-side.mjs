// quick-261003-528: gsd-browser side-by-side captures — sketch 018 variant B on the left, the build
// on the right — for the five sketch docs. Headless, session `ui-review`, the build served by one
// scratch server on port 5281 (TARGET holds byte-identical copies of the five docs' phase
// directories); the sketch served on 4174. PNGs land in the (gitignored) screenshots directory of
// the main checkout so they survive worktree removal.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every pair)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = '/home/cinedise/labelore/test/e2e/screenshots/528';
const BUILD = 'http://127.0.0.1:5281';
const SKETCH = 'http://127.0.0.1:4174/018-ui-review-page/';
const SESSION = 'ui-review';
const NEEDLE = {
  syn: '06-run-sheet-views/06-UI-REVIEW.md',
  lb05: '05-per-type-document-views/05-UI-REVIEW.md',
  sp03: '03-account-administration-session-control/03-UI-REVIEW.md',
  lb03: '03-search-browsing-traceability/03-UI-REVIEW.md',
  lb04: '04-portability-degradation-hardening/04-UI-REVIEW.md',
};

// id, doc, theme, width, action
const PAIRS = [
  ['syn-light', 'syn', 'light', 1440],
  ['lb05-light', 'lb05', 'light', 1440],
  ['sp03-light', 'sp03', 'light', 1440],
  ['lb03-light', 'lb03', 'light', 1440],
  ['lb04-light', 'lb04', 'light', 1440],
  ['syn-dark', 'syn', 'dark', 1440],
  ['lb05-dark', 'lb05', 'dark', 1440],
  ['sp03-dark', 'sp03', 'dark', 1440],
  ['syn-fix3-light', 'syn', 'light', 1440, 'fix3'],
  ['lb05-files-light', 'lb05', 'light', 1440, 'files'],
  ['syn-tablet-light', 'syn', 'light', 820],
  ['syn-phone-light', 'syn', 'light', 390],
];

function gb(...args) {
  return execFileSync('gsd-browser', ['--session', SESSION, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function evalJs(js) {
  const out = gb('eval', js);
  return out.trim();
}

function evalJson(js) {
  const out = evalJs(js);
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  try {
    return JSON.parse(out.slice(start, end + 1));
  } catch {
    return { raw: out };
  }
}

async function routes() {
  const text = await (await fetch(`${BUILD}/api/presentation`)).text();
  const keys = new Set();
  for (const m of text.matchAll(/"key":"(\/milestones\/[^"]*UI-REVIEW\.md)"/g)) keys.add(m[1]);
  const out = {};
  for (const [doc, needle] of Object.entries(NEEDLE)) {
    out[doc] = [...keys].find((k) => decodeURIComponent(k).includes(needle));
  }
  return out;
}

function settle() {
  evalJs('document.fonts.ready.then(() => "ok")');
}

/** Grows the viewport to the document's height (capped), so the element screenshot is not clipped. */
function grow(width, selector) {
  const probe = evalJs(
    `String(Math.min(16000, Math.ceil(Math.max(document.documentElement.scrollHeight, (document.querySelector(${JSON.stringify(selector)}) || document.body).getBoundingClientRect().bottom + window.scrollY) + 40)))`,
  );
  const height = Number(probe.replace(/[^0-9]/g, '')) || 1000;
  gb('set-viewport', '--width', String(width), '--height', String(height));
}

const HIDE_FIXED = `(() => { for (const el of document.querySelectorAll('body *')) { if (el.closest('main')) continue; const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden'; } return 'hidden'; })()`;

function setBuildTheme(theme) {
  evalJs(
    `(() => { localStorage.setItem('labelore-theme', ${JSON.stringify(theme)}); document.documentElement.classList.toggle('dark', ${theme === 'dark'}); return 'themed'; })()`,
  );
}

const BUILD_METRICS = `JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const main = document.querySelector('main'); const sel = document.querySelector('.view-ui-review-tab[aria-selected="true"]'); return { labels: q('.view-ui-review-label'), pins: q('.view-ui-review-pin'), tabs: q('.view-ui-review-tab'), selectedTab: sel ? sel.textContent : null, found: q('.view-ui-review-found-card'), fixCards: q('.view-ui-review-fixcard'), held: q('.view-ui-review-evidence li'), bars: q('.view-ui-review-bar'), back: q('.view-ui-review-back details'), sourceOnly: q('#ui-review-source-only button'), overflow: main ? main.scrollWidth > main.clientWidth + 1 : null }; })())`;

const SKETCH_METRICS = `JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const root = document.querySelector('#root .page'); const sel = document.querySelector('.pbar button[aria-selected="true"]'); return { labels: q('.hex-lbl'), pins: q('.fixpin'), tabs: q('.pbar button'), selectedTab: sel ? sel.textContent : null, found: q('.found-item'), fixCards: q('.fixcard'), held: q('.evid li'), bars: q('.hist .bar'), back: q('details.extras-d'), sourceOnly: q('.source-only button'), overflow: root ? root.scrollWidth > root.clientWidth + 1 : null }; })())`;

function captureBuild(route, [id, doc, theme, width, action]) {
  gb('set-viewport', '--width', String(width), '--height', '1000');
  gb('navigate', `${BUILD}${route}`);
  setBuildTheme(theme);
  gb('reload');
  gb('wait-for', '--condition', 'selector_visible', '--value', '#ui-review-inspector');
  settle();
  if (action === 'fix3') gb('click', '.view-ui-review-pin[data-fixpin="3"]');
  if (action === 'files') {
    evalJs(
      `(() => { const d = [...document.querySelectorAll('.view-ui-review-back details')].find((x) => x.querySelector('summary').textContent.startsWith('Files Audited')); if (d) d.open = true; return 'opened'; })()`,
    );
  }
  grow(width, 'main');
  evalJs(HIDE_FIXED);
  const metrics = evalJson(BUILD_METRICS);
  gb('screenshot', '--selector', 'main', '--format', 'png', '--output', `${OUT}/${id}-build.png`);
  return metrics;
}

function captureSketch([id, doc, theme, width, action]) {
  gb('set-viewport', '--width', '1440', '--height', '1000');
  gb('navigate', `${SKETCH}?v=b&doc=${doc}`);
  gb('wait-for', '--condition', 'selector_visible', '--value', '#root .page');
  evalJs(`(() => { document.querySelector('#sketch-tools [data-theme="${theme}"]').click(); return 'themed'; })()`);
  if (width === 820 || width === 390) {
    evalJs(`(() => { document.querySelector('#sketch-tools [data-width="${width}"]').click(); return 'width'; })()`);
  }
  if (action === 'fix3') evalJs(`(() => { document.querySelector('.fixpin[data-fixpin="3"]').click(); return 'pinned'; })()`);
  if (action === 'files') {
    evalJs(
      `(() => { const d = [...document.querySelectorAll('details.extras-d')].find((x) => x.querySelector('summary').textContent.startsWith('Files Audited')); if (d) d.open = true; return 'opened'; })()`,
    );
  }
  settle();
  grow(1440, '#root .page');
  evalJs(
    `(() => { for (const sel of ['#variant-nav', '#sketch-tools', '.shell-header']) { const el = document.querySelector(sel); if (el) el.style.display = 'none'; } return 'hidden'; })()`,
  );
  const metrics = evalJson(SKETCH_METRICS);
  gb('screenshot', '--selector', '#root .page', '--format', 'png', '--output', `${OUT}/${id}-sketch.png`);
  return metrics;
}

function compose(id, width) {
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 018 B</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
  const file = `${OUT}/${id}-pair.html`;
  writeFileSync(file, html);
  try {
    gb('set-viewport', '--width', String(width * 2 + 64), '--height', '1000');
    gb('navigate', `file://${file}`);
    gb('wait-for', '--condition', 'selector_visible', '--value', 'img');
    grow(width * 2 + 64, 'body');
    gb('screenshot', '--format', 'png', '--output', `${OUT}/${id}-pair.png`);
    return true;
  } catch {
    return false;
  }
}

const wanted = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const map = await routes();
let report = {};
try {
  report = JSON.parse((await import('node:fs')).readFileSync(`${OUT}/report.json`, 'utf8'));
} catch {
  report = {};
}
for (const pair of PAIRS) {
  const [id, doc, , width] = pair;
  if (wanted.length > 0 && !wanted.includes(id)) continue;
  if (!map[doc]) {
    console.log(`skip ${id}: no route for ${doc}`);
    continue;
  }
  const build = captureBuild(map[doc], pair);
  const sketch = captureSketch(pair);
  const composed = compose(id, width);
  report[id] = { build, sketch, composed };
  console.log(id, composed ? 'pair' : 'separate', JSON.stringify(build));
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
