// quick-261001-qk7 Task 3: side-by-side captures of the built UAT page against sketch 015 B, driven
// through the gsd-browser CLI (session `uat`). Build routes come from each scratch server's
// /api/presentation (path substring), the sketch from the 4174 sketch server. PNGs land in the main
// checkout's gitignored test/e2e/screenshots/qk7/ (an absolute path, so they survive worktree
// removal), with a report.json of structural counts per capture.
//   node capture-side-by-side.mjs              # every capture
//   node capture-side-by-side.mjs syn-light lb-02-dark   # a subset by id
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/home/cinedise/labelore/test/e2e/screenshots/qk7';
const SKETCH = 'http://127.0.0.1:4174/015-uat-page/';
mkdirSync(OUT, { recursive: true });

const SERVERS = { lb: 'http://127.0.0.1:5291', sp: 'http://127.0.0.1:5292', syn: 'http://127.0.0.1:5293' };
const DOCS = {
  syn: { server: 'syn', path: '03-file-browsing/03-UAT.md', sketch: 'syn' },
  sp103: { server: 'sp', path: 'v1.0-phases/03-file-browsing/03-UAT.md', sketch: 'sp103' },
  sp3: { server: 'sp', path: '03-account-administration-session-control/03-UAT.md', sketch: 'sp3' },
  sp1: { server: 'sp', path: '01-portal-owned-identity-sessions/01-UAT.md', sketch: 'sp1' },
  sp2: { server: 'sp', path: '02-roles-permission-enforcement/02-UAT.md', sketch: 'sp2' },
  lb01: { server: 'lb', path: '01-read-layer-domain-model/01-UAT.md', sketch: 'lb01' },
  lb02: { server: 'lb', path: '02-situational-awareness-artifact-reading/02-UAT.md', sketch: null },
  lb03: { server: 'lb', path: '03-search-browsing-traceability/03-UAT.md', sketch: null },
  lb04: { server: 'lb', path: '04-portability-degradation-hardening/04-UAT.md', sketch: null },
  lb05: { server: 'lb', path: '05-per-type-document-views/05-UAT.md', sketch: null },
};

const CAPTURES = [
  ...['syn', 'sp103', 'sp3', 'sp1', 'sp2', 'lb01'].map((doc) => ({ id: `${doc}-light`, doc, theme: 'light' })),
  ...['syn', 'sp103', 'lb01'].map((doc) => ({ id: `${doc}-dark`, doc, theme: 'dark' })),
  { id: 'syn-gap-open-light', doc: 'syn', theme: 'light', openGap: true },
  { id: 'sp103-gap-open-light', doc: 'sp103', theme: 'light', openGap: true },
  { id: 'syn-phone-light', doc: 'syn', theme: 'light', phone: true },
  { id: 'lb-02-light', doc: 'lb02', theme: 'light' },
  { id: 'lb-02-dark', doc: 'lb02', theme: 'dark' },
  { id: 'lb-03-light', doc: 'lb03', theme: 'light' },
  { id: 'lb-04-light', doc: 'lb04', theme: 'light' },
  { id: 'lb-05-light', doc: 'lb05', theme: 'light' },
];

const run = (...args) => execFileSync('gsd-browser', [...args, '--session', 'uat'], { encoding: 'utf8', maxBuffer: 1 << 26 });
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
  run('wait-for', '--condition', 'selector_visible', '--value', '#uat-tests');
  sleep(600);
  if (cap.openGap) {
    run('click', 'tr[data-gap]');
    sleep(300);
  }
  const height = pageHeight();
  run('set-viewport', '--width', String(width), '--height', String(height));
  sleep(500);
  hideChrome('main');
  const out = `${OUT}/${cap.id}-build.png`;
  run('screenshot', '--selector', 'main', '--format', 'png', '--output', out);
  const stats = JSON.parse(
    ev(`JSON.stringify({ squares: document.querySelectorAll('.view-uat-square').length, pairs: document.querySelectorAll('.view-uat-pair').length, registerRows: document.querySelectorAll('tr[data-gap]').length, cards: document.querySelectorAll('.view-uat-card').length, extras: document.querySelectorAll('.view-uat-extras details').length, sourceOnly: document.querySelectorAll('.view-uat-source-only li').length, overflowX: document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth + 1, height: document.documentElement.scrollHeight })`),
  );
  return { out, stats };
}

function captureSketch(cap, width) {
  const doc = DOCS[cap.doc];
  run('set-viewport', '--width', String(width), '--height', '1000');
  run('navigate', SKETCH);
  run('wait-for', '--condition', 'selector_visible', '--value', '#doc-btns button');
  run('click', `#doc-btns button[data-doc="${doc.sketch}"]`);
  run('click', `#sketch-tools [data-theme="${cap.theme}"]`);
  if (cap.phone) run('click', '#sketch-tools [data-width="390"]');
  if (cap.openGap) run('click', 'tr.gr');
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
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${bg};display:flex;gap:24px;align-items:flex-start;padding:12px"><div><p style="font:12px monospace;color:#888;margin:0 0 6px">SKETCH 015 B</p><img src="file://${sketchPng}"></div><div><p style="font:12px monospace;color:#888;margin:0 0 6px">BUILD</p><img src="file://${buildPng}"></div></body>`;
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
    if (DOCS[cap.doc].sketch) {
      const sketch = captureSketch(cap, width);
      entry.sketch = sketch;
      try {
        entry.pair = compose(cap, sketch, built.out, width);
      } catch (error) {
        entry.pair = null;
        entry.pairError = String(error.message).split('\n')[0];
      }
    }
    report[cap.id] = entry;
    console.log(cap.id, JSON.stringify(built.stats));
  } catch (error) {
    report[cap.id] = { error: String(error.message).split('\n')[0] };
    console.log(cap.id, 'FAILED', report[cap.id].error);
  }
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
}
