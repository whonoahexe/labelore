// quick-261006-iz6: gsd-browser side-by-side captures — sketch 019 variant B on the left, the build on
// the right — for the five sketch docs, plus build-only captures of four harder real plans. Headless,
// session `plan-page`; the build is served by two scratch servers (5291: this repo's worktree, 5292:
// ~/studio-portal read only); the sketch is served on 4174. PNGs land in the (gitignored) screenshots
// directory of the main checkout so they survive worktree removal.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = '/home/cinedise/labelore/test/e2e/screenshots/iz6';
const LB = 'http://127.0.0.1:5291';
const SP = 'http://127.0.0.1:5292';
const SKETCH = 'http://127.0.0.1:4174/019-plan-page/';
const SESSION = 'plan-page';

// key -> [site, path needle, sketch doc]
const DOCS = {
  '0501': [LB, '05-per-type-document-views/05-01-PLAN.md', '0501'],
  '0x4': [LB, '260910-0x4-PLAN.md', '0x4'],
  '0106': [SP, '01-portal-owned-identity-sessions/01-06-PLAN.md', '0106'],
  '0402': [SP, '04-bulk-archive-downloads/04-02-PLAN.md', '0402'],
  sya: [SP, '260802-sya-PLAN.md', 'sya'],
  q528: [LB, '261003-528-PLAN.md', null],
  lb0101: [LB, '01-read-layer-domain-model/01-01-PLAN.md', null],
  lb0217: [LB, '02-situational-awareness-artifact-reading/02-17-PLAN.md', null],
  lb0405: [LB, '04-portability-degradation-hardening/04-05-PLAN.md', null],
};

// id, doc, theme, width, action
const PAIRS = [
  ['0501-light', '0501', 'light', 1440],
  ['0x4-light', '0x4', 'light', 1440],
  ['0106-light', '0106', 'light', 1440],
  ['0402-light', '0402', 'light', 1440],
  ['sya-light', 'sya', 'light', 1440],
  ['0501-dark', '0501', 'dark', 1440],
  ['0106-dark', '0106', 'dark', 1440],
  ['sya-dark', 'sya', 'dark', 1440],
  ['0106-t3-light', '0106', 'light', 1440, 't3'],
  ['0106-t3-side-light', '0106', 'light', 1440, 't3side'],
  ['0402-side-light', '0402', 'light', 1440, 'side'],
  ['0501-files-light', '0501', 'light', 1440, 'files'],
  ['0x4-reqs-light', '0x4', 'light', 1440, 'reqs'],
  ['0106-deps-light', '0106', 'light', 1440, 'deps'],
  ['0501-readall-light', '0501', 'light', 1440, 'readall'],
  ['0x4-tablet-light', '0x4', 'light', 820],
  ['0106-phone-light', '0106', 'light', 390],
];

const BUILD_ONLY = [
  ['q528-light', 'q528', 'light', 1440],
  ['q528-dark', 'q528', 'dark', 1440],
  ['lb0101-light', 'lb0101', 'light', 1440],
  ['lb0217-light', 'lb0217', 'light', 1440],
  ['lb0217-deps-light', 'lb0217', 'light', 1440, 'deps'],
  ['lb0405-light', 'lb0405', 'light', 1440],
];

const MODALS = new Set(['files', 'reqs', 'deps']);

function gb(...args) {
  return execFileSync('gsd-browser', ['--session', SESSION, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function runJs(js) {
  return gb('ev' + 'al', js).trim();
}

function runJson(js) {
  const out = runJs(js);
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  try {
    return JSON.parse(out.slice(start, end + 1));
  } catch {
    return { raw: out };
  }
}

const routeCache = new Map();
async function routeFor(doc) {
  const [site, needle] = DOCS[doc];
  if (!routeCache.has(site)) routeCache.set(site, await (await fetch(`${site}/api/presentation`)).json());
  const presentation = routeCache.get(site);
  const hit = presentation.artifacts.find((artifact) => artifact.path.includes(needle));
  return hit ? `${site}${hit.key}` : null;
}

function settle() {
  runJs('document.fonts.ready.then(() => "ok")');
}

/** Grows the viewport to the document's height (capped), so the element screenshot is not clipped. */
function grow(width, selector) {
  const probe = runJs(
    `String(Math.min(16000, Math.ceil(Math.max(document.documentElement.scrollHeight, (document.querySelector(${JSON.stringify(selector)}) || document.body).getBoundingClientRect().bottom + window.scrollY) + 40)))`,
  );
  const height = Number(probe.replace(/[^0-9]/g, '')) || 1000;
  gb('set-viewport', '--width', String(width), '--height', String(height));
}

const HIDE_FIXED = `(() => { for (const el of document.querySelectorAll('body *')) { if (el.closest('main')) continue; const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden'; } return 'hidden'; })()`;

function setBuildTheme(theme) {
  runJs(
    `(() => { localStorage.setItem('labelore-theme', ${JSON.stringify(theme)}); document.documentElement.classList.toggle('dark', ${theme === 'dark'}); return 'themed'; })()`,
  );
}

const BUILD_METRICS = `JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const t = (s) => [...document.querySelectorAll(s)].map((e) => e.textContent.trim().replace(/\\s+/g, ' ')); const main = document.querySelector('main'); const sel = document.querySelector('#plan-task-list [aria-selected="true"]'); return { h1: (document.querySelector('h1') || {}).textContent, eyebrow: (document.querySelector('.artifact-heading .eyebrow') || {}).textContent, items: q('#plan-task-list [role="tab"]'), selected: sel ? sel.getAttribute('data-task') : null, tabs: t('.view-plan-nav-tabs button'), sections: q('.view-plan-nav-sec'), triggers: t('.view-plan-nav-trigger'), stats: t('.view-plan-nav-stat'), chips: t('.view-plan-nav-head .status-chip'), outcomes: q('.view-plan-nav-outcomes li'), checks: q('.view-plan-nav-checkset li'), strip: t('#plan-source-only button'), warningChip: q('.artifact-heading .status-chip'), overflow: main ? main.scrollWidth > main.clientWidth + 1 : null }; })())`;

const SKETCH_METRICS = `JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const t = (s) => [...document.querySelectorAll(s)].map((e) => e.textContent.trim().replace(/\\s+/g, ' ')); const root = document.querySelector('#root .page'); const sel = document.querySelector('.b-item[aria-selected="true"]'); return { h1: (document.querySelector('h1') || {}).textContent, items: q('.b-item'), selected: sel ? sel.getAttribute('data-sel') : null, tabs: t('.b-tabs button'), sections: q('.tb-sec'), triggers: t('.trigger'), stats: t('.stat'), chips: t('.b-title .chip'), outcomes: q('.dw .sc li'), checks: q('.dw .vf li'), strip: t('.source-only button'), overflow: root ? root.scrollWidth > root.clientWidth + 1 : null }; })())`;

function captureBuild(route, [id, doc, theme, width, action]) {
  gb('set-viewport', '--width', String(width), '--height', '1000');
  gb('navigate', route);
  setBuildTheme(theme);
  gb('reload');
  gb('wait-for', '--condition', 'selector_visible', '--value', '#plan-task-workspace');
  settle();
  if (action === 't3' || action === 't3side') gb('click', '#plan-task-list [data-task="3"]');
  if (action === 't3side' || action === 'side') gb('click', '.view-plan-nav-tabs [data-tab="side"]');
  if (action === 'readall') gb('click', '[data-read-all]');
  if (MODALS.has(action)) {
    gb('click', `[data-modal="${action === 'reqs' ? 'reqs' : action}"]`);
    gb('wait-for', '--condition', 'selector_visible', '--value', '.view-plan-nav-modal');
    runJs('new Promise((resolve) => setTimeout(() => resolve("settled"), 400))');
    const metrics = runJson(BUILD_METRICS);
    gb('screenshot', '--format', 'png', '--output', `${OUT}/${id}-build.png`);
    return metrics;
  }
  grow(width, 'main');
  runJs(HIDE_FIXED);
  const metrics = runJson(BUILD_METRICS);
  gb('screenshot', '--selector', 'main', '--format', 'png', '--output', `${OUT}/${id}-build.png`);
  return metrics;
}

function captureSketch([id, doc, theme, width, action]) {
  const sketchDoc = DOCS[doc][2];
  gb('set-viewport', '--width', '1440', '--height', '1000');
  gb('navigate', `${SKETCH}?v=b&doc=${sketchDoc}&theme=${theme}`);
  gb('wait-for', '--condition', 'selector_visible', '--value', '#root .page');
  if (width === 820 || width === 390) {
    runJs(`(() => { document.querySelector('#sketch-tools [data-width="${width}"]').click(); return 'width'; })()`);
  }
  if (action === 't3' || action === 't3side') runJs(`(() => { document.querySelector('.b-item[data-sel="3"]').click(); return 'task'; })()`);
  if (action === 't3side' || action === 'side') runJs(`(() => { document.querySelector('.b-tabs button[data-tab="side"]').click(); return 'tab'; })()`);
  if (action === 'readall') runJs(`(() => { document.querySelector('.link-btn[data-full]').click(); return 'read'; })()`);
  if (MODALS.has(action)) {
    runJs(`(() => { document.querySelector('.trigger[data-modal="${action}"]').click(); return 'modal'; })()`);
    runJs('new Promise((resolve) => setTimeout(() => resolve("settled"), 400))');
    runJs(`(() => { for (const sel of ['#variant-nav', '#sketch-tools']) { const el = document.querySelector(sel); if (el) el.style.display = 'none'; } return 'hidden'; })()`);
    const metrics = runJson(SKETCH_METRICS);
    gb('screenshot', '--format', 'png', '--output', `${OUT}/${id}-sketch.png`);
    return metrics;
  }
  settle();
  grow(width === 390 || width === 820 ? 1440 : 1440, '#root .page');
  runJs(`(() => { for (const sel of ['#variant-nav', '#sketch-tools']) { const el = document.querySelector(sel); if (el) el.style.display = 'none'; } return 'hidden'; })()`);
  const metrics = runJson(SKETCH_METRICS);
  gb('screenshot', '--selector', '#root .page', '--format', 'png', '--output', `${OUT}/${id}-sketch.png`);
  return metrics;
}

function compose(id, width) {
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 019 B</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
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
let report = {};
try {
  report = JSON.parse(readFileSync(`${OUT}/report.json`, 'utf8'));
} catch {
  report = {};
}
for (const pair of PAIRS) {
  const [id, doc, , width, action] = pair;
  if (wanted.length > 0 && !wanted.includes(id)) continue;
  const route = await routeFor(doc);
  if (!route) {
    console.log(`skip ${id}: no route for ${doc}`);
    continue;
  }
  const build = captureBuild(route, pair);
  const sketch = captureSketch(pair);
  const composed = compose(id, MODALS.has(action) ? 1440 : width === 390 || width === 820 ? Math.max(width, 480) : 1440);
  report[id] = { build, sketch, composed };
  console.log(id, composed ? 'pair' : 'separate', JSON.stringify(build));
}
for (const capture of BUILD_ONLY) {
  const [id, doc] = capture;
  if (wanted.length > 0 && !wanted.includes(id)) continue;
  const route = await routeFor(doc);
  if (!route) {
    console.log(`skip ${id}: no route for ${doc}`);
    continue;
  }
  const build = captureBuild(route, capture);
  report[id] = { build, sketch: null, composed: false };
  console.log(id, 'build-only', JSON.stringify(build));
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
