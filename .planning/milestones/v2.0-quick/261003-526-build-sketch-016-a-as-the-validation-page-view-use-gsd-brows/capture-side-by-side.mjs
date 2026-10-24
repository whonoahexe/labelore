// quick-261003-526 Task 3: side-by-side captures of the built VALIDATION page against sketch 016 A,
// driven through the gsd-browser CLI (session `validation`). Build routes come from each scratch
// server's /api/presentation (path substring), the sketch from the 4174 sketch server. PNGs land in
// the main checkout's gitignored test/e2e/screenshots/526/ (an absolute path, so they survive
// worktree removal), with a report.json of structural counts per capture.
//   node capture-side-by-side.mjs                   # every capture
//   node capture-side-by-side.mjs sp2-light sp4-dark   # a subset by id
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/home/cinedise/labelore/test/e2e/screenshots/526';
const SKETCH = 'http://127.0.0.1:4174/016-validation-page/';
mkdirSync(OUT, { recursive: true });

const SERVERS = { sp: 'http://127.0.0.1:5261', fx: 'http://127.0.0.1:5262' };
const DOCS = {
  sp2: { server: 'sp', path: 'phases/02-roles-permission-enforcement/02-VALIDATION.md' },
  sp1: { server: 'sp', path: 'phases/01-portal-owned-identity-sessions/01-VALIDATION.md' },
  sp3: { server: 'sp', path: 'phases/03-account-administration-session-control/03-VALIDATION.md' },
  sp4: { server: 'sp', path: 'phases/04-bulk-archive-downloads/04-VALIDATION.md' },
  v101: { server: 'sp', path: 'v1.0-phases/01-identity-persistence-foundation/01-VALIDATION.md' },
  v102: { server: 'sp', path: 'v1.0-phases/02-storage-health-status/02-VALIDATION.md' },
  v103: { server: 'sp', path: 'v1.0-phases/03-file-browsing/03-VALIDATION.md' },
  v104: { server: 'sp', path: 'v1.0-phases/04-tier-to-tier-transfers/04-VALIDATION.md' },
  fx: { server: 'fx', path: '01-identity-slice/01-VALIDATION.md' },
};

const CAPTURES = [
  ...Object.keys(DOCS).map((doc) => ({ id: `${doc}-light`, doc, theme: 'light' })),
  ...['sp2', 'sp1', 'sp4'].map((doc) => ({ id: `${doc}-dark`, doc, theme: 'dark' })),
  { id: 'sp2-task-light', doc: 'sp2', theme: 'light', act: 'task' },
  { id: 'sp2-w0-light', doc: 'sp2', theme: 'light', act: 'w0' },
  { id: 'sp2-signoff-light', doc: 'sp2', theme: 'light', act: 'signoff' },
  { id: 'sp2-phone-light', doc: 'sp2', theme: 'light', phone: true },
];

// How each interaction is applied in the build and in the sketch.
const ACTS = {
  task: { build: '#validation-task-1', sketch: 'button.tile[data-sel="1"]' },
  w0: { build: '#validation-wave0 > button', sketch: '.w0 > button' },
  signoff: { build: '.view-validation-cell[data-cell="signoff"] button', sketch: 'button[data-open="signoff-pop"]' },
};

const run = (...args) => execFileSync('gsd-browser', [...args, '--session', 'validation'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const ev = (js) => run('eval', js).trim();
const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);

async function routeOf(doc) {
  const base = SERVERS[doc.server];
  const res = await fetch(`${base}/api/presentation`);
  const json = await res.json();
  const hit = json.artifacts.find((a) => a.path.includes(doc.path));
  if (!hit) throw new Error(`no artifact for ${doc.path} on ${base}`);
  return base + hit.key;
}

function pageHeight() {
  const h = Number(ev('document.documentElement.scrollHeight'));
  return Math.min(Math.max(h, 1000), 16000);
}

function hideChrome(inside) {
  ev(`(() => { const m = document.querySelector(${JSON.stringify(inside)}); document.querySelectorAll('*').forEach((el) => { const p = getComputedStyle(el).position; if ((p === 'fixed' || p === 'sticky') && m && !m.contains(el)) el.style.visibility = 'hidden'; }); return 'ok'; })()`);
}

async function captureBuild(cap, width) {
  const doc = DOCS[cap.doc];
  const url = await routeOf(doc);
  run('set-viewport', '--width', String(width), '--height', '1000');
  run('navigate', url);
  ev(`localStorage.setItem('labelore-theme', '${cap.theme}'); 'set'`);
  run('reload');
  run('wait-for', '--condition', 'selector_visible', '--value', '#validation-map');
  sleep(600);
  const dark = ev("document.documentElement.classList.contains('dark')") === 'true';
  if (dark !== (cap.theme === 'dark')) throw new Error(`theme mismatch for ${cap.id}`);
  if (cap.act) {
    run('click', ACTS[cap.act].build);
    sleep(300);
  }
  const height = pageHeight();
  run('set-viewport', '--width', String(width), '--height', String(height));
  sleep(500);
  hideChrome('main');
  const out = `${OUT}/${cap.id}-build.png`;
  run('screenshot', '--selector', 'main', '--format', 'png', '--output', out);
  const stats = JSON.parse(
    ev(`JSON.stringify((() => { const q = (s) => document.querySelectorAll(s).length; const m = document.querySelector('main'); return { cells: q('.view-validation-cell'), squares: q('.view-validation-cell .view-validation-square'), lanes: q('.view-validation-lane'), tiles: q('.view-validation-tile'), cards: q('.view-validation-card'), checklist: q('.view-validation-checklist li'), sourceOnly: q('.view-validation-source-only li'), extras: q('.view-validation-extras details'), overflowX: m.scrollWidth > m.clientWidth + 1, height: document.documentElement.scrollHeight }; })())`),
  );
  return { out, stats };
}

function captureSketch(cap, width) {
  run('set-viewport', '--width', String(width), '--height', '1000');
  run('navigate', SKETCH);
  run('wait-for', '--condition', 'selector_visible', '--value', '#doc-btns button');
  run('click', '.variant-tab[data-variant="a"]');
  run('click', `#doc-btns button[data-doc="${cap.doc}"]`);
  run('click', `#sketch-tools [data-theme="${cap.theme}"]`);
  if (cap.phone) run('click', '#sketch-tools [data-width="390"]');
  if (cap.act) run('click', ACTS[cap.act].sketch);
  sleep(500);
  const height = pageHeight();
  run('set-viewport', '--width', String(width), '--height', String(height));
  sleep(500);
  ev(`document.querySelector('#variant-nav').style.display = 'none'; document.querySelector('#sketch-tools').style.display = 'none'; 'hidden'`);
  const out = `${OUT}/${cap.id}-sketch.png`;
  run('screenshot', '--selector', '#root .page', '--format', 'png', '--output', out);
  return out;
}

function compose(cap, sketchPng, buildPng, width) {
  const bg = cap.theme === 'dark' ? '#0b0b0b' : '#ffffff';
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${bg};display:flex;gap:24px;align-items:flex-start;padding:12px"><div><p style="font:12px monospace;color:#888;margin:0 0 6px">SKETCH 016 A</p><img src="file://${sketchPng}"></div><div><p style="font:12px monospace;color:#888;margin:0 0 6px">BUILD</p><img src="file://${buildPng}"></div></body>`;
  const page = `${OUT}/${cap.id}.html`;
  writeFileSync(page, html);
  run('set-viewport', '--width', String(width * 2 + 72), '--height', '1000');
  run('navigate', `file://${page}`);
  sleep(800);
  const out = `${OUT}/${cap.id}.png`;
  run('screenshot', '--full-page', '--format', 'png', '--output', out);
  return out;
}

const wanted = process.argv.slice(2);
const report = existsSync(`${OUT}/report.json`) ? JSON.parse(readFileSync(`${OUT}/report.json`, 'utf8')) : {};
for (const cap of CAPTURES) {
  if (wanted.length > 0 && !wanted.includes(cap.id)) continue;
  const width = cap.phone ? 390 : 1440;
  try {
    const built = await captureBuild(cap, width);
    const entry = { ...built.stats, build: built.out };
    const sketch = captureSketch(cap, width);
    entry.sketch = sketch;
    try {
      entry.pair = compose(cap, sketch, built.out, width);
    } catch (error) {
      entry.pair = null;
      entry.pairError = String(error.message).split('\n')[0];
    }
    report[cap.id] = entry;
    console.log(cap.id, JSON.stringify(built.stats));
  } catch (error) {
    report[cap.id] = { error: String(error.message).split('\n')[0] };
    console.log(cap.id, 'FAILED', report[cap.id].error);
  }
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
}
