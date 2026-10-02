// Side-by-side captures for quick-261003-527: sketch 017 variant D (left) against the SECURITY
// console on the 5271 scratch server (right), through the gsd-browser CLI (headless, session
// `security`). Adapted from quick-261001-qk7's capture script.
//   node capture-side-by-side.mjs [id ...]      (no ids = every capture)
// Every build route is resolved through the scratch server's /api/presentation by a path
// substring that must match exactly one security artifact. PNGs go to the main checkout's
// gitignored test/e2e/screenshots/q527/ (an absolute path, so they survive worktree removal).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const BUILD = 'http://127.0.0.1:5271';
const SKETCH = 'http://127.0.0.1:4174/017-security-page/';
const OUT = '/home/cinedise/labelore/test/e2e/screenshots/q527';
const SESSION = 'security';
mkdirSync(OUT, { recursive: true });

// doc key -> path substring that matches exactly one artifact in the scratch target
const DOCS = {
  syn: 'v0.2-phases/',
  sp1: '.planning/phases/01-portal',
  sp3: '.planning/phases/03-account',
  lb05: 'v1.1-phases/05-',
  lb02: 'v1.0-phases/02-',
  lb04: 'v1.0-phases/04-',
  lb01: 'v1.0-phases/01-',
  fx: 'v0.1-phases/',
  lb03: 'v1.0-phases/03-',
};

// id -> capture recipe
const CAPTURES = {
  'syn-light': { doc: 'syn', theme: 'light' },
  'sp1-light': { doc: 'sp1', theme: 'light' },
  'sp3-light': { doc: 'sp3', theme: 'light' },
  'lb05-light': { doc: 'lb05', theme: 'light' },
  'lb02-light': { doc: 'lb02', theme: 'light' },
  'lb04-light': { doc: 'lb04', theme: 'light' },
  'lb01-light': { doc: 'lb01', theme: 'light' },
  'fx-light': { doc: 'fx', theme: 'light' },
  'syn-dark': { doc: 'syn', theme: 'dark' },
  'sp3-dark': { doc: 'sp3', theme: 'dark' },
  'lb02-dark': { doc: 'lb02', theme: 'dark' },
  'syn-pick-light': { doc: 'syn', theme: 'light', pick: 'T-03-03' },
  'sp3-pick-light': { doc: 'sp3', theme: 'light', pick: 'T-03-07' },
  'syn-audit-light': { doc: 'syn', theme: 'light', audit: true },
  'syn-phone-light': { doc: 'syn', theme: 'light', width: 390 },
  'lb-03-build-light': { doc: 'lb03', theme: 'light', buildOnly: true },
  'lb-03-build-dark': { doc: 'lb03', theme: 'dark', buildOnly: true },
};

function gb(...args) {
  return execFileSync('gsd-browser', ['--session', SESSION, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
const ev = (js) => gb('eval', js).trim();
const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);

async function routes() {
  const presentation = await (await fetch(`${BUILD}/api/presentation`)).json();
  const found = [];
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (o.kind === 'security' && typeof o.path === 'string' && typeof o.key === 'string') found.push(o);
      Object.values(o).forEach(walk);
    }
  };
  walk(presentation);
  return found;
}

function routeOf(all, substring) {
  const hits = [...new Map(all.map((a) => [a.path, a])).values()].filter((a) => a.path.includes(substring));
  if (hits.length !== 1) throw new Error(`"${substring}" matched ${hits.length} artifacts: ${hits.map((h) => h.path).join(', ')}`);
  return `${BUILD}${hits[0].key}`;
}

function growTo(width, selector) {
  // Make the viewport as tall as the page so nothing scrolls and a sticky rail sits in place.
  ev('document.fonts.ready.then(() => true)');
  const height = Math.min(16000, Math.max(600, Number(ev(`Math.ceil(document.querySelector('${selector}').getBoundingClientRect().bottom + window.scrollY + 40)`).replace(/[^\d.]/g, '')) || 1000));
  gb('set-viewport', '--width', String(width), '--height', String(height));
  sleep(400);
}

function buildCapture(url, id, recipe) {
  const width = recipe.width ?? 1440;
  gb('set-viewport', '--width', String(width), '--height', '1000');
  gb('navigate', url);
  ev(`localStorage.setItem('labelore-theme', '${recipe.theme}')`);
  gb('reload');
  gb('wait-for', '--condition', 'selector_visible', '--value', '.view-security-board');
  const dark = ev("document.documentElement.classList.contains('dark')");
  if ((dark === 'true') !== (recipe.theme === 'dark')) throw new Error(`theme mismatch for ${id}: html.dark=${dark}`);
  if (recipe.pick) gb('click', `.view-security-square[data-threat="${recipe.pick}"]`);
  if (recipe.audit) gb('click', '.view-security-audit-switch');
  sleep(300);
  ev(
    "(() => { for (const el of document.querySelectorAll('body *')) { if (el.closest('main')) continue; const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') el.style.display = 'none'; } return true; })()",
  );
  growTo(width, 'main');
  const file = `${OUT}/${id}-build.png`;
  gb('screenshot', '--selector', 'main', '--format', 'png', '--output', file);
  const stats = JSON.parse(
    ev(`JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const m = document.querySelector('main');
      const by = {}; document.querySelectorAll('.view-security-square').forEach((s) => { const k = s.dataset.tone + (s.dataset.accepted === 'true' ? '+accepted' : ''); by[k] = (by[k] || 0) + 1; });
      return { squares: q('.view-security-square'), squaresBy: by, columns: q('.view-security-bh') - 1, waiverRows: q('.view-security-waiver'),
        flows: q('.view-security-flow-row'), stores: q('.view-security-flow-row[data-store="true"]'), extras: q('.view-security-extras details'),
        checklist: q('.view-security-checks li'), sourceOnly: q('#security-source-only li'), auditRuns: q('.view-security-run'),
        mainOverflowsX: m.scrollWidth > m.clientWidth + 1, docOverflowsX: document.documentElement.scrollWidth > window.innerWidth + 1 }; })())`),
  );
  return { file, stats };
}

function sketchCapture(id, recipe) {
  const width = recipe.width ?? 1440;
  gb('set-viewport', '--width', String(width), '--height', '1000');
  gb('navigate', SKETCH);
  gb('wait-for', '--condition', 'selector_visible', '--value', '#root .page');
  gb('click', '[data-variant="d"]');
  gb('click', `#doc-btns button[data-doc="${recipe.doc}"]`);
  gb('click', `#sketch-tools [data-theme="${recipe.theme}"]`);
  if (recipe.width) gb('click', `#sketch-tools [data-width="${recipe.width}"]`);
  if (recipe.pick) gb('click', `.tsq[title^="${recipe.pick}"]`);
  if (recipe.audit) gb('click', '[data-audit]');
  sleep(300);
  ev("(() => { for (const id of ['variant-nav', 'sketch-tools']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; } document.body.style.paddingTop = '0'; return true; })()");
  growTo(width, '#root .page');
  const file = `${OUT}/${id}-sketch.png`;
  gb('screenshot', '--selector', '#root .page', '--format', 'png', '--output', file);
  return file;
}

function compose(id, sketchFile, buildFile, width) {
  const html = `${OUT}/${id}-pair.html`;
  const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:flex;gap:16px;align-items:flex-start"><img src="${b64(sketchFile)}" style="width:${width}px;flex:none"><img src="${b64(buildFile)}" style="width:${width}px;flex:none"></body>`,
  );
  try {
    gb('set-viewport', '--width', String(width * 2 + 16), '--height', '1000');
    gb('navigate', `file://${html}`);
    sleep(500);
    gb('screenshot', '--format', 'png', '--output', `${OUT}/${id}.png`, '--full-page');
  } catch (error) {
    console.warn(`  compose failed for ${id} (${String(error.message).split('\n')[0]}); keeping the two PNGs`);
  }
}

const wanted = process.argv.slice(2);
const ids = wanted.length > 0 ? wanted : Object.keys(CAPTURES);
const all = await routes();
const reportPath = `${OUT}/report.json`;
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : {};
for (const id of ids) {
  const recipe = CAPTURES[id];
  if (!recipe) throw new Error(`unknown capture ${id}`);
  console.log(`capture ${id}`);
  const url = routeOf(all, DOCS[recipe.doc]);
  const build = buildCapture(url, id, recipe);
  report[id] = build.stats;
  if (!recipe.buildOnly) {
    const sketch = sketchCapture(id, recipe);
    compose(id, sketch, build.file, recipe.width ?? 1440);
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
}
console.log('done');
