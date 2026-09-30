// Side-by-side evidence for quick-260930-wfs (the verify-against-sketch rule): sketch 013 B on the
// left, the build on the right, into the gitignored test/e2e/screenshots/wfs/.
//   node .planning/quick/260930-wfs-*/capture-side-by-side.mjs [only-id ...]
// The build: studio-portal docs on 127.0.0.1:4173 (labelore.service), labelore docs on 127.0.0.1:5193
// (a scratch production server on the labelore repo). The sketch: 127.0.0.1:4174 (untouched).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = 'test/e2e/screenshots/wfs';
const SKETCH = 'http://127.0.0.1:4174/013-patterns-page/';
const SP = 'http://127.0.0.1:4173';
const LB = 'http://127.0.0.1:5193';
mkdirSync(OUT, { recursive: true });

// [id, project base, path substring, sketch doc key | null]
const DOCS = [
  ['sp-v1-02', SP, 'v1.0-phases/02-storage-health-status/02-PATTERNS.md', 'sp02'],
  ['sp-04', SP, 'phases/04-bulk-archive-downloads/04-PATTERNS.md', 'sp04'],
  ['sp-01', SP, 'phases/01-portal-owned-identity-sessions/01-PATTERNS.md', 'sp01'],
  ['lb-05', LB, 'v1.1-phases/05-per-type-document-views/05-PATTERNS.md', 'lb05'],
  ['lb-v1-02', LB, 'v1.0-phases/02-situational-awareness-artifact-reading/02-PATTERNS.md', null],
  ['lb-v1-03', LB, 'v1.0-phases/03-search-browsing-traceability/03-PATTERNS.md', null],
  ['lb-v1-04', LB, 'v1.0-phases/04-portability-degradation-hardening/04-PATTERNS.md', null],
  ['sp-v1-03', SP, 'v1.0-phases/03-file-browsing/03-PATTERNS.md', null],
  ['sp-v1-04', SP, 'v1.0-phases/04-tier-to-tier-transfers/04-PATTERNS.md', null],
  ['sp-02', SP, 'phases/02-roles-permission-enforcement/02-PATTERNS.md', null],
  ['sp-03', SP, 'phases/03-account-administration-session-control/03-PATTERNS.md', null],
];
const DARK = new Set(['sp-v1-02', 'sp-04', 'lb-05']);
const only = process.argv.slice(2);

async function keyOf(base, includes) {
  const data = await (await fetch(`${base}/api/presentation`)).json();
  const artifact = data.artifacts.find((entry) => entry.path.includes(includes));
  if (!artifact) throw new Error(`no artifact including ${includes} on ${base}`);
  return artifact.key;
}

const browser = await chromium.launch();

/** Build capture: `main` at a viewport tall enough that nothing scrolls, so the sticky panel stays put. */
async function shootBuild(base, key, theme, { width = 1440, select = null, rule = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.addInitScript((t) => window.localStorage.setItem('labelore-theme', t), theme);
  const page = await context.newPage();
  await page.goto(`${base}${key}`);
  await page.locator('#pattern-file-map').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  if (select) {
    await page.locator('.view-patterns-row', { hasText: select }).first().click();
  }
  if (rule) {
    await page.locator('.view-patterns-strip button', { hasText: rule }).click();
  }
  await page.waitForTimeout(300);
  for (let i = 0; i < 2; i++) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width, height: Math.min(Math.max(height + 40, 900), 16000) });
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(el).position;
      if ((pos === 'fixed' || pos === 'sticky') && !el.closest('main')) el.style.visibility = 'hidden';
    }
  });
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      rows: document.querySelectorAll('.view-patterns-row').length,
      areas: document.querySelectorAll('.view-patterns-area').length,
      unplaced: Array.from(document.querySelectorAll('.view-patterns-area')).filter((el) =>
        (el.querySelector('.view-patterns-label')?.textContent ?? '').startsWith('Outside the file table'),
      ).reduce((sum, el) => sum + el.querySelectorAll('.view-patterns-row').length, 0),
      rules: document.querySelectorAll('.view-patterns-strip button').length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 || (main ? main.scrollWidth > main.clientWidth + 1 : false),
      panelText: (document.querySelector('.view-patterns-panel')?.textContent ?? '').slice(0, 60),
    };
  });
  const png = await page.locator('main').screenshot();
  await context.close();
  return { png, metrics };
}

async function shootSketch(docKey, theme, { width = 'full', select = null, rule = null } = {}) {
  const context = await browser.newContext({ viewport: { width: width === 'full' ? 1440 : 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(SKETCH);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(`#doc-btns button[data-doc="${docKey}"]`).click();
  await page.locator(`#sketch-tools [data-theme="${theme}"]`).click();
  if (width !== 'full') await page.locator(`#sketch-tools [data-width="${width}"]`).click();
  if (select) await page.locator('button.b-row', { hasText: select }).first().click();
  if (rule) await page.locator('.b-strip button.chip', { hasText: rule }).click();
  await page.waitForTimeout(500);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 1440, height: Math.min(Math.max(height + 40, 900), 16000) });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll('#variant-nav, #sketch-tools')) el.style.visibility = 'hidden';
  });
  const png = await page.locator('#root .page').screenshot();
  await context.close();
  return png;
}

async function pair(name, sketchPng, buildPng, label = 'build') {
  const context = await browser.newContext({ viewport: { width: 3000, height: 1000 } });
  const page = await context.newPage();
  const uri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
  await page.setContent(`<body style="margin:0;background:#888;display:flex;gap:12px;align-items:flex-start;padding:8px;font:12px sans-serif;width:max-content">
    <div><div>sketch 013 B</div>${sketchPng ? `<img src="${uri(sketchPng)}">` : '<div style="padding:40px;background:#ccc">no sketch counterpart</div>'}</div>
    <div><div>${label}</div><img src="${uri(buildPng)}"></div></body>`);
  await page.waitForLoadState('load');
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await context.close();
}

const report = [];
const want = (id) => only.length === 0 || only.includes(id);

for (const [id, base, includes, sketchKey] of DOCS) {
  if (!want(id)) continue;
  const key = await keyOf(base, includes);
  const themes = ['light', ...(DARK.has(id) ? ['dark'] : [])];
  for (const theme of themes) {
    const build = await shootBuild(base, key, theme);
    const sketch = sketchKey === null ? null : await shootSketch(sketchKey, theme);
    if (sketch) await pair(`${id}-${theme}`, sketch, build.png);
    else writeFileSync(`${OUT}/${id}-${theme}.png`, build.png);
    report.push({ id, theme, ...build.metrics });
  }
}

const [, spBase, spIncludes] = DOCS[0];
if (want('selected')) {
  const key = await keyOf(spBase, spIncludes);
  const build = await shootBuild(spBase, key, 'light', { select: 'collector.rs' });
  const sketch = await shootSketch('sp02', 'light', { select: 'collector.rs' });
  await pair('sp-v1-02-selected-light', sketch, build.png);
}
if (want('rule')) {
  const key = await keyOf(spBase, spIncludes);
  const build = await shootBuild(spBase, key, 'light', { rule: 'Reject/fail identically' });
  const sketch = await shootSketch('sp02', 'light', { rule: 'Reject/fail identically' });
  await pair('sp-v1-02-rule-light', sketch, build.png);
}
if (want('phone')) {
  const key = await keyOf(spBase, spIncludes);
  const build = await shootBuild(spBase, key, 'light', { width: 390 });
  const sketch = await shootSketch('sp02', 'light', { width: '390' });
  await pair('sp-v1-02-phone-light', sketch, build.png);
  report.push({ id: 'sp-v1-02-phone', theme: 'light', ...build.metrics });
}
await browser.close();
console.table(report);
if (only.length === 0) writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
else writeFileSync(`${OUT}/report-partial.json`, JSON.stringify(report, null, 1));
