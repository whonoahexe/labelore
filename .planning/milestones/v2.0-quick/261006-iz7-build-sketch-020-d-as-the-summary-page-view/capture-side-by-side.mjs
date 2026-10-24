// quick-261006-iz7: gsd-browser side-by-side captures — sketch 020 variant D on the left, the build on
// the right — for the five sketch docs, plus build-only captures of six harder real summaries.
// Headless, session `summary`; the build is served by two scratch dev servers (labelore on 5297,
// studio-portal on 5298), the sketch by the sketch server on 4174. PNGs land in the (gitignored)
// screenshots directory of the main checkout so they survive worktree removal.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = '/home/cinedise/labelore/test/e2e/screenshots/iz7';
const BASES = { lb: 'http://127.0.0.1:5297', sp: 'http://127.0.0.1:5298' };
const SKETCH = 'http://127.0.0.1:4174/020-summary-page/';
const SESSION = 'summary';

// key -> where the build route comes from and which sketch doc it pairs with (null = build only)
const DOCS = {
  '0501': { project: 'lb', needle: 'v1.1-phases/05-per-type-document-views/05-01-SUMMARY.md', sketch: '0501' },
  '0406': { project: 'sp', needle: 'phases/04-bulk-archive-downloads/04-06-SUMMARY.md', sketch: '0406' },
  '0101': { project: 'sp', needle: 'phases/01-portal-owned-identity-sessions/01-01-SUMMARY.md', sketch: '0101' },
  '0x4': { project: 'lb', needle: '260910-0x4-SUMMARY.md', sketch: '0x4' },
  '3us': { project: 'lb', needle: '260922-3us-SUMMARY.md', sketch: '3us' },
  lb0213: { project: 'lb', needle: 'v1.0-phases/02-situational-awareness-artifact-reading/02-13-SUMMARY.md', sketch: null },
  spv10407: { project: 'sp', needle: 'v1.0-phases/04-tier-to-tier-transfers/04-07-SUMMARY.md', sketch: null },
  sp0407: { project: 'sp', needle: 'phases/04-bulk-archive-downloads/04-07-SUMMARY.md', sketch: null },
  lb528: { project: 'lb', needle: '261003-528-SUMMARY.md', sketch: null },
  sp0106: { project: 'sp', needle: 'phases/01-portal-owned-identity-sessions/01-06-SUMMARY.md', sketch: null },
  spv10212: { project: 'sp', needle: 'v1.0-phases/02-storage-health-status/02-12-SUMMARY.md', sketch: null },
};

// id, doc, theme, width, action
const CAPTURES = [
  ['0501-light', '0501', 'light', 1440],
  ['0406-light', '0406', 'light', 1440],
  ['0101-light', '0101', 'light', 1440],
  ['0x4-light', '0x4', 'light', 1440],
  ['3us-light', '3us', 'light', 1440],
  ['0501-dark', '0501', 'dark', 1440],
  ['0101-dark', '0101', 'dark', 1440],
  ['0406-dark', '0406', 'dark', 1440],
  ['0501-reqs-light', '0501', 'light', 1440, 'reqs'],
  ['0501-files-light', '0501', 'light', 1440, 'files'],
  ['0101-tasks-light', '0101', 'light', 1440, 'tasks'],
  ['0101-tablet-light', '0101', 'light', 820],
  ['0501-phone-light', '0501', 'light', 390],
  ['lb0213-light', 'lb0213', 'light', 1440],
  ['spv10407-light', 'spv10407', 'light', 1440],
  ['sp0407-light', 'sp0407', 'light', 1440],
  ['lb528-light', 'lb528', 'light', 1440],
  ['sp0106-light', 'sp0106', 'light', 1440],
  ['spv10212-light', 'spv10212', 'light', 1440],
  ['lb0213-dark', 'lb0213', 'dark', 1440],
  ['sp0106-dark', 'sp0106', 'dark', 1440],
];

function gb(...args) {
  return execFileSync('gsd-browser', ['--session', SESSION, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function evalJs(js) {
  return gb('eval', js).trim();
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
  const out = {};
  const cache = {};
  for (const [id, doc] of Object.entries(DOCS)) {
    try {
      cache[doc.project] ??= await (await fetch(`${BASES[doc.project]}/api/presentation`)).json();
      const found = cache[doc.project].artifacts.find((a) => a.path.endsWith(doc.needle));
      if (found) out[id] = found.key;
    } catch (error) {
      console.log(`no presentation for ${doc.project}: ${error}`);
    }
  }
  return out;
}

function settle() {
  evalJs('document.fonts.ready.then(() => "ok")');
}

/** Grows the viewport to the document's height (capped), so the element screenshot is not clipped. */
function grow(width, selector) {
  evalJs('window.scrollTo(0, 0)');
  const probe = evalJs(
    `String(Math.min(16000, Math.ceil(Math.max(document.documentElement.scrollHeight, (document.querySelector(${JSON.stringify(selector)}) || document.body).getBoundingClientRect().bottom + window.scrollY) + 40)))`,
  );
  const height = Number(probe.replace(/[^0-9]/g, '')) || 1000;
  gb('set-viewport', '--width', String(width), '--height', String(height));
  evalJs('window.scrollTo(0, 0)');
}

const HIDE_FIXED = `(() => { for (const el of document.querySelectorAll('body *')) { if (el.closest('main')) continue; const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden'; } return 'hidden'; })()`;

function setBuildTheme(theme) {
  evalJs(
    `(() => { localStorage.setItem('labelore-theme', ${JSON.stringify(theme)}); document.documentElement.classList.toggle('dark', ${theme === 'dark'}); return 'themed'; })()`,
  );
}

const BUILD_METRICS = `JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }; const main = document.querySelector('main'); return { h1: q('h1') + ':' + t('h1'), eyebrow: t('.view-summary-meta .eyebrow'), date: t('.view-summary-date'), metrics: [...document.querySelectorAll('.view-summary-stat')].map((e) => e.textContent.trim()), chips: [...document.querySelectorAll('.view-summary-metrics-full .status-chip')].map((e) => e.textContent.trim()), triggers: [...document.querySelectorAll('.view-summary-trigger')].map((e) => e.textContent.trim()), outcomeRows: q('.view-summary-row'), pills: q('.view-summary-row .view-summary-pill'), stops: q('.view-summary-stop'), margin: q('.view-summary-fix'), cards: q('.view-summary-card'), proof: q('.view-summary-proof-frame tbody tr'), also: q('.view-summary-also details'), waits: q('.view-summary-waits details'), lineage: q('.view-summary-lineage'), sourceOnly: [...document.querySelectorAll('#summary-source-only button')].map((e) => e.textContent.trim()), warning: q('.view-summary-meta .status-chip'), overflow: main ? main.scrollWidth > main.clientWidth + 1 : null }; })())`;

const SKETCH_METRICS = `JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }; const root = document.querySelector('#root .page'); return { h1: q('h1') + ':' + t('h1'), eyebrow: t('.meta-row .eyebrow'), date: t('.meta-row .date'), metrics: [...document.querySelectorAll('.b-metrics .stat')].map((e) => e.textContent.trim()), chips: [...document.querySelectorAll('.b-metrics .full .chip')].map((e) => e.textContent.trim()), triggers: [...document.querySelectorAll('.trigger')].map((e) => e.textContent.trim()), outcomeRows: q('.oc-row'), pills: q('.oc-row .pill'), stops: q('.ev'), margin: q('.ev .fix'), cards: q('.dev'), proof: q('.c-matrix tbody tr'), also: q('.loose details:not([data-tone])'), waits: q('.loose details[data-tone]'), lineage: q('.lineage'), sourceOnly: [...document.querySelectorAll('.source-only button')].map((e) => e.textContent.trim()), overflow: root ? root.scrollWidth > root.clientWidth + 1 : null }; })())`;

function openBuildModal(action) {
  const nth = { tasks: 1, files: 2, reqs: 3 }[action];
  gb('click', `.view-summary-triggers > button:nth-child(${nth})`);
  gb('wait-for', '--condition', 'selector_visible', '--value', '.view-summary-modal');
  if (action === 'reqs') {
    gb('hover', '.view-summary-req');
    gb('wait-for', '--condition', 'selector_visible', '--value', '.reference-preview');
  }
}

function captureBuild(route, project, [id, doc, theme, width, action]) {
  gb('set-viewport', '--width', String(width), '--height', '1000');
  gb('navigate', `${BASES[project]}${route}`);
  setBuildTheme(theme);
  gb('reload');
  gb('wait-for', '--condition', 'selector_visible', '--value', '.view-summary-head');
  settle();
  if (action) {
    openBuildModal(action);
    const metrics = evalJson(BUILD_METRICS);
    gb('screenshot', '--format', 'png', '--output', `${OUT}/${id}-build.png`);
    return metrics;
  }
  grow(width, 'main');
  evalJs(HIDE_FIXED);
  const metrics = evalJson(BUILD_METRICS);
  gb('screenshot', '--selector', 'main', '--format', 'png', '--output', `${OUT}/${id}-build.png`);
  return metrics;
}

function captureSketch([id, doc, theme, width, action]) {
  const key = DOCS[doc].sketch;
  gb('set-viewport', '--width', '1440', '--height', '1000');
  gb('navigate', `${SKETCH}?v=d&doc=${key}&theme=${theme}`);
  gb('wait-for', '--condition', 'selector_visible', '--value', '#root .page');
  evalJs(`(() => { document.querySelector('#sketch-tools [data-theme="${theme}"]').click(); return 'themed'; })()`);
  if (width === 820 || width === 390) {
    evalJs(`(() => { document.querySelector('#sketch-tools [data-width="${width}"]').click(); return 'width'; })()`);
  }
  if (action) {
    evalJs(`(() => { document.querySelector('[data-modal="${action}"]').click(); return 'modal'; })()`);
    if (action === 'reqs') {
      gb('hover', '#modal [data-ref="VIEW-01"]');
      gb('wait-for', '--condition', 'selector_visible', '--value', '.reference-preview');
    }
    settle();
    const metrics = evalJson(SKETCH_METRICS);
    gb('screenshot', '--format', 'png', '--output', `${OUT}/${id}-sketch.png`);
    return metrics;
  }
  settle();
  grow(1440, '#root .page');
  evalJs(
    `(() => { for (const sel of ['#variant-nav', '#sketch-tools']) { const el = document.querySelector(sel); if (el) el.style.display = 'none'; } return 'hidden'; })()`,
  );
  const metrics = evalJson(SKETCH_METRICS);
  gb('screenshot', '--selector', '#root .page', '--format', 'png', '--output', `${OUT}/${id}-sketch.png`);
  return metrics;
}

function compose(id, width, action) {
  const w = action ? 1440 : width;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 020 D</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
  const file = `${OUT}/${id}-pair.html`;
  writeFileSync(file, html);
  try {
    gb('set-viewport', '--width', String(w * 2 + 64), '--height', '1000');
    gb('navigate', `file://${file}`);
    gb('wait-for', '--condition', 'selector_visible', '--value', 'img');
    grow(w * 2 + 64, 'body');
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
  report = JSON.parse(readFileSync(`${OUT}/report.json`, 'utf8'));
} catch {
  report = {};
}
for (const capture of CAPTURES) {
  const [id, doc, , width, action] = capture;
  if (wanted.length > 0 && !wanted.includes(id)) continue;
  if (!map[doc]) {
    console.log(`skip ${id}: no route for ${doc}`);
    continue;
  }
  try {
    const build = captureBuild(map[doc], DOCS[doc].project, capture);
    if (DOCS[doc].sketch === null) {
      report[id] = { build };
      console.log(id, 'build-only', JSON.stringify(build));
      continue;
    }
    const sketch = captureSketch(capture);
    const composed = compose(id, width, action);
    report[id] = { build, sketch, composed };
    console.log(id, composed ? 'pair' : 'separate', JSON.stringify(build));
  } catch (error) {
    console.log(`FAILED ${id}: ${String(error).slice(0, 300)}`);
  }
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
