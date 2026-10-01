// Side-by-side evidence for quick-261001-qk6 (the verify-against-sketch rule): sketch 014's Winner
// (variant `w`, the default) on the left, the build on the right, composed into one PNG per pair.
// Everything runs through the gsd-browser CLI with `--session qk6-ui-spec` (no Playwright):
//   node capture-side-by-side.mjs [only-id ...]
// Run from the qk6 worktree root. The build is the worktree's own production server on three scratch
// ports (labelore corpus, studio-portal, the dense fixture); the sketch is 127.0.0.1:4174 (untouched).
// Output goes to the gitignored main-checkout directory so it survives worktree removal.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.env.QK6_OUT ?? '/home/cinedise/labelore/test/e2e/screenshots/qk6';
const SKETCH = 'http://127.0.0.1:4174/014-ui-spec-page/';
const LB = process.env.QK6_LB ?? 'http://127.0.0.1:5196';
const SP = process.env.QK6_SP ?? 'http://127.0.0.1:5197';
const FX = process.env.QK6_FX ?? 'http://127.0.0.1:5198';
const SESSION = ['--session', 'qk6-ui-spec'];
mkdirSync(OUT, { recursive: true });

function gb(...args) {
  return execFileSync('gsd-browser', [...args, ...SESSION], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}
const run = (js) => gb('eval', js).trim();
const sleep = (ms) => gb('wait-for', '--condition', 'delay', '--value', String(ms));
const viewport = (width, height) => gb('set-viewport', '--width', String(width), '--height', String(height));

// [id, project base, path substring, sketch doc key | null, dark too]
const DOCS = [
  ['sp04', SP, 'v1.0-phases/04-tier-to-tier-transfers/04-UI-SPEC.md', 'sp04', true],
  ['lb02', LB, 'v1.0-phases/02-situational-awareness-artifact-reading/02-UI-SPEC.md', 'lb02', true],
  ['sp02', SP, 'v1.0-phases/02-storage-health-status/02-UI-SPEC.md', 'sp02', true],
  ['lb03', LB, 'v1.0-phases/03-search-browsing-traceability/03-UI-SPEC.md', 'lb03', false],
  ['sp01', SP, 'phases/01-portal-owned-identity-sessions/01-UI-SPEC.md', 'sp01', false],
  ['fx01', FX, 'phases/01-identity-slice/01-UI-SPEC.md', 'fx01', false],
];
const BUILD_ONLY = [
  ['lb05', LB, 'v1.1-phases/05-per-type-document-views/05-UI-SPEC.md'],
  ['lb04', LB, 'v1.0-phases/04-portability-degradation-hardening/04-UI-SPEC.md'],
  ['sp-p2', SP, 'phases/02-roles-permission-enforcement/02-UI-SPEC.md'],
  ['sp-p3', SP, 'phases/03-account-administration-session-control/03-UI-SPEC.md'],
  ['sp-p4', SP, 'phases/04-bulk-archive-downloads/04-UI-SPEC.md'],
  ['sp03', SP, 'v1.0-phases/03-file-browsing/03-UI-SPEC.md'],
];
const only = process.argv.slice(2);
const want = (id) => only.length === 0 || only.includes(id);

async function keyOf(base, includes) {
  const data = await (await fetch(`${base}/api/presentation`)).json();
  const artifact = data.artifacts.find((entry) => entry.path.includes(includes));
  if (!artifact) throw new Error(`no artifact including ${includes} on ${base}`);
  return artifact.key;
}

const HIDE_CHROME =
  "(() => { window.scrollTo(0, 0); for (const el of document.querySelectorAll('body *')) { const pos = getComputedStyle(el).position; if ((pos === 'fixed' || pos === 'sticky') && !el.closest('main')) el.style.visibility = 'hidden'; } return 'ok'; })()";

/** Opens the build page for `key` in `theme` and waits for the first chapter. */
function openBuild(base, key, theme, width = 1440) {
  viewport(width, 1000);
  gb('navigate', `${base}/`);
  run(`localStorage.setItem('labelore-theme', '${theme}')`);
  gb('navigate', `${base}${key}`);
  gb('wait-for', '--condition', 'selector_visible', '--value', '#ui-spec-design', '--timeout', '20000');
  run('document.fonts.ready.then(() => "fonts")');
  sleep(700);
}

function buildMetrics() {
  return JSON.parse(
    run(`(() => {
      const q = (s) => Array.from(document.querySelectorAll(s));
      const main = document.querySelector('main');
      const count = (status) => q('.view-ui-spec-meter-key [data-status="' + status + '"] b').map((b) => b.textContent)[0] ?? null;
      return JSON.stringify({
        title: document.querySelector('h1')?.textContent ?? null,
        eyebrow: document.querySelector('.artifact-heading .eyebrow')?.textContent ?? null,
        signoff: document.querySelector('.view-ui-spec-signoff')?.textContent ?? null,
        facts: document.querySelector('.view-ui-spec-facts')?.textContent ?? null,
        choiceCards: q('.view-ui-spec-choice').length,
        spacingTicks: q('.view-ui-spec-tick').length,
        typeRungs: q('.view-ui-spec-rung').length,
        roleCards: q('.view-ui-spec-role').length,
        hatched: q('.view-ui-spec-chipbox [data-none="true"]').length,
        elements: q('.view-ui-spec-matrix tbody tr').length,
        rows: { covered: count('covered'), backstop: count('backstop'), unresolved: count('unresolved'), dismissed: count('dismissed') },
        needs: q('.view-ui-spec-strip button').length,
        chapters: q('.view-ui-spec-chapter > .section-heading h2').map((h) => h.textContent),
        registry: document.querySelector('.view-ui-spec-verdict .status-chip')?.textContent ?? null,
        registryCards: q('.view-ui-spec-reg').length,
        sourceOnly: q('.view-ui-spec-source-only button').map((b) => b.textContent),
        author: document.querySelector('.view-ui-spec-author')?.textContent ?? null,
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 || (main ? main.scrollWidth > main.clientWidth + 1 : false),
      });
    })()`),
  );
}

/** Grows the viewport to the page's full height so an element screenshot never scrolls. */
function fitViewport(width) {
  for (let i = 0; i < 2; i++) {
    const height = Number(run('document.documentElement.scrollHeight'));
    viewport(width, Math.min(Math.max(height + 40, 900), 16000));
    sleep(250);
  }
}

function shootBuild(path, width = 1440) {
  fitViewport(width);
  run(HIDE_CHROME);
  gb('screenshot', '--selector', 'main', '--format', 'png', '--output', path);
}

function openSketch(docKey, theme, width = 'full') {
  viewport(1440, 1000);
  gb('navigate', SKETCH);
  run('document.fonts.ready.then(() => "fonts")');
  gb('click', `#doc-btns [data-doc="${docKey}"]`);
  gb('click', `#sketch-tools [data-theme="${theme}"]`);
  if (width !== 'full') gb('click', `#sketch-tools [data-width="${width}"]`);
  sleep(500);
}

function shootSketch(path) {
  fitViewport(1440);
  run("(() => { for (const el of document.querySelectorAll('#variant-nav, #sketch-tools')) el.style.visibility = 'hidden'; window.scrollTo(0, 0); return 'ok'; })()");
  gb('screenshot', '--selector', '#root .page', '--format', 'png', '--output', path);
}

/** Composes `{name}.png`: the sketch image left, the build image right, through a file:// page. */
function pair(name, sketchPng, buildPng) {
  const html = `${OUT}/${name}.html`;
  writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;font:12px sans-serif;padding:8px;width:max-content">
<div style="display:flex;gap:12px;align-items:flex-start">
<div><div style="color:#fff;margin-bottom:4px">sketch 014 Winner</div><img src="file://${sketchPng}"></div>
<div><div style="color:#fff;margin-bottom:4px">build</div><img src="file://${buildPng}"></div>
</div></body>`,
  );
  viewport(3000, 1000);
  gb('navigate', `file://${html}`);
  sleep(400);
  gb('screenshot', '--full-page', '--format', 'png', '--output', `${OUT}/${name}.png`);
}

const report = [];
const tmp = (name, which) => `${OUT}/${name}-${which}.png`;

for (const [id, base, includes, sketchKey, dark] of DOCS) {
  if (!want(id)) continue;
  const key = await keyOf(base, includes);
  for (const theme of ['light', ...(dark ? ['dark'] : [])]) {
    openBuild(base, key, theme);
    const metrics = buildMetrics();
    shootBuild(tmp(`${id}-${theme}`, 'build'));
    openSketch(sketchKey, theme);
    shootSketch(tmp(`${id}-${theme}`, 'sketch'));
    pair(`${id}-${theme}`, tmp(`${id}-${theme}`, 'sketch'), tmp(`${id}-${theme}`, 'build'));
    report.push({ id, theme, ...metrics });
    console.log('done', id, theme);
  }
}

if (want('cell')) {
  const [, base, includes] = DOCS[0];
  const key = await keyOf(base, includes);
  openBuild(base, key, 'light');
  const cell = run(`(() => {
    const has = (s) => document.querySelector('.view-ui-spec-matrix td button[data-cell^="' + s + '"]');
    const pick = has('E6|error') ?? document.querySelector('.view-ui-spec-matrix td button[data-cell]');
    pick.click();
    return pick.getAttribute('data-cell');
  })()`);
  sleep(300);
  shootBuild(tmp('sp04-cell-light', 'build'));
  openSketch('sp04', 'light');
  gb('click', `[data-cell="${cell}"]`);
  sleep(300);
  shootSketch(tmp('sp04-cell-light', 'sketch'));
  pair('sp04-cell-light', tmp('sp04-cell-light', 'sketch'), tmp('sp04-cell-light', 'build'));
  report.push({ id: 'sp04-cell', theme: 'light', cell });
}

if (want('signoff')) {
  const [, base, includes] = DOCS[0];
  const key = await keyOf(base, includes);
  openBuild(base, key, 'light');
  gb('click', '.view-ui-spec-signoff');
  gb('wait-for', '--condition', 'selector_visible', '--value', '[role="dialog"]');
  sleep(500);
  gb('screenshot', '--format', 'png', '--output', tmp('sp04-signoff-light', 'build'));
  openSketch('sp04', 'light');
  gb('click', '[data-modal="signoff"]');
  sleep(500);
  gb('screenshot', '--format', 'png', '--output', tmp('sp04-signoff-light', 'sketch'));
  pair('sp04-signoff-light', tmp('sp04-signoff-light', 'sketch'), tmp('sp04-signoff-light', 'build'));
}

if (want('phone')) {
  const [, base, includes] = DOCS[0];
  const key = await keyOf(base, includes);
  openBuild(base, key, 'light', 390);
  const metrics = buildMetrics();
  shootBuild(tmp('sp04-phone-light', 'build'), 390);
  openSketch('sp04', 'light', '390');
  shootSketch(tmp('sp04-phone-light', 'sketch'));
  pair('sp04-phone-light', tmp('sp04-phone-light', 'sketch'), tmp('sp04-phone-light', 'build'));
  report.push({ id: 'sp04-phone', theme: 'light', ...metrics });
}

for (const [id, base, includes] of BUILD_ONLY) {
  if (!want(id)) continue;
  const key = await keyOf(base, includes);
  openBuild(base, key, 'light');
  const metrics = buildMetrics();
  shootBuild(`${OUT}/${id}-light.png`);
  report.push({ id, theme: 'light', ...metrics });
  console.log('done', id);
}

writeFileSync(`${OUT}/${only.length === 0 ? 'report' : 'report-partial'}.json`, JSON.stringify(report, null, 1));
console.log(
  JSON.stringify(
    report.map((r) => ({ id: r.id, theme: r.theme, signoff: r.signoff, cards: r.choiceCards, els: r.elements, rows: r.rows, overflowX: r.overflowX })),
    null,
    0,
  ),
);
