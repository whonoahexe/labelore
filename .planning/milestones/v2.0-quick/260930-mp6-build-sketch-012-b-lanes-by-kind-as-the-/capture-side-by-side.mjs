// Side-by-side evidence for quick-260930-mp6 (the verify-against-sketch rule): sketch 012 B on the
// left, the build on the right, into the gitignored test/e2e/screenshots/mp6/.
//   node .planning/quick/260930-mp6-*/capture-side-by-side.mjs [only-id ...]
// The build: studio-portal docs on 127.0.0.1:4173 (labelore.service), labelore docs on 127.0.0.1:5193
// (a scratch production server on the labelore repo). The sketch: 127.0.0.1:4174 (untouched).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = 'test/e2e/screenshots/mp6';
const SKETCH = 'http://127.0.0.1:4174/012-diagram-product/';
const SP = 'http://127.0.0.1:4173';
const LB = 'http://127.0.0.1:5193';
mkdirSync(OUT, { recursive: true });

// [id, project base, path substring, sketch doc index | null]
const DOCS = [
  ['sp-v1-02', SP, 'v1.0-phases/02-storage-health-status/02-RESEARCH.md', 0],
  ['lab-v1-02', LB, 'v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md', 1],
  ['sp-v1-01', SP, 'v1.0-phases/01-identity-persistence-foundation/01-RESEARCH.md', 2],
  ['sp-v1-03', SP, 'v1.0-phases/03-file-browsing/03-RESEARCH.md', 3],
  ['sp-v1-04', SP, 'v1.0-phases/04-tier-to-tier-transfers/04-RESEARCH.md', 4],
  ['sp-01', SP, 'phases/01-portal-owned-identity-sessions/01-RESEARCH.md', 5],
  ['sp-02', SP, 'phases/02-roles-permission-enforcement/02-RESEARCH.md', 6],
  ['sp-04', SP, 'phases/04-bulk-archive-downloads/04-RESEARCH.md', 7],
  ['sp-p03', SP, 'phases/03-account-administration-session-control/03-RESEARCH.md', null],
  ['lb-v1-01', LB, 'v1.0-phases/01-read-layer-domain-model/01-RESEARCH.md', null],
  ['lb-v1-03', LB, 'v1.0-phases/03-search-browsing-traceability/03-RESEARCH.md', null],
  ['lb-v1.1-05', LB, 'v1.1-phases/05-per-type-document-views/05-RESEARCH.md', null],
];
const DARK = new Set(['sp-v1-02', 'lab-v1-02', 'sp-02', 'sp-04']);
const only = process.argv.slice(2);

async function keyOf(base, includes) {
  const data = await (await fetch(`${base}/api/presentation`)).json();
  const artifact = data.artifacts.find((entry) => entry.path.includes(includes));
  if (!artifact) throw new Error(`no artifact including ${includes} on ${base}`);
  return artifact.key;
}

const browser = await chromium.launch();

async function shootBuild(base, key, theme, select) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript((t) => window.localStorage.setItem('labelore-theme', t), theme);
  const page = await context.newPage();
  await page.goto(`${base}${key}`);
  await page.locator('#research-architecture .figure-frame').first().waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3000);
  if (select) {
    await page.locator('#research-architecture .lane-diagram-node', { hasText: select }).first().click();
    await page.waitForTimeout(300);
  }
  const frame = page.locator('#research-architecture .figure-frame').first();
  const metrics = await page.evaluate(() => {
    const body = document.querySelector('#research-architecture .figure-frame-body');
    const stage = document.querySelector('#research-architecture .lane-diagram-stage');
    return {
      bodyScroll: body ? body.scrollWidth : null,
      bodyClient: body ? body.clientWidth : null,
      stageWidth: stage ? Math.round(stage.getBoundingClientRect().width) : null,
      drawn: Boolean(stage),
      nodes: document.querySelectorAll('#research-architecture .lane-diagram-node').length,
      compact: Boolean(document.querySelector('#research-architecture .lane-diagram-node[data-compact]')),
    };
  });
  await frame.scrollIntoViewIfNeeded();
  // The app's sticky chrome would cover the frame bar: hide every fixed / sticky element outside the figure.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(el).position;
      if ((pos === 'fixed' || pos === 'sticky') && !el.closest('#research-architecture')) el.style.visibility = 'hidden';
    }
  });
  const png = await frame.screenshot();
  await context.close();
  return { png, metrics };
}

async function shootSketch(index, theme, select) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(SKETCH);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(`button.chip.doc[data-doc="${index}"]`).click();
  await page.locator(`#sketch-tools [data-theme="${theme}"]`).click();
  if (select) {
    await page.locator('.node', { hasText: select }).first().click();
  }
  await page.waitForTimeout(500);
  const png = await page.locator('.figure').first().screenshot();
  await context.close();
  return png;
}

async function pair(name, sketchPng, buildPng) {
  const context = await browser.newContext({ viewport: { width: 2000, height: 1000 } });
  const page = await context.newPage();
  const uri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
  await page.setContent(`<body style="margin:0;background:#888;display:flex;gap:12px;align-items:flex-start;padding:8px;font:12px sans-serif">
    <div><div>sketch 012 B</div>${sketchPng ? `<img src="${uri(sketchPng)}">` : '<div style="padding:40px;background:#ccc">no sketch counterpart</div>'}</div>
    <div><div>build</div><img src="${uri(buildPng)}"></div></body>`);
  await page.waitForLoadState('load');
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await context.close();
}

const report = [];
for (const [id, base, includes, index] of DOCS) {
  if (only.length > 0 && !only.includes(id)) continue;
  const key = await keyOf(base, includes);
  const themes = ['light', ...(DARK.has(id) ? ['dark'] : [])];
  for (const theme of themes) {
    const build = await shootBuild(base, key, theme, null);
    const sketch = index === null ? null : await shootSketch(index, theme, null);
    await pair(`${id}-${theme}`, sketch, build.png);
    report.push({ id, theme, ...build.metrics, overflow: build.metrics.bodyScroll > build.metrics.bodyClient });
  }
}
if (only.length === 0 || only.includes('selected')) {
  const [id, base, includes, index] = DOCS[0];
  const key = await keyOf(base, includes);
  const build = await shootBuild(base, key, 'light', 'Health registry');
  const sketch = await shootSketch(index, 'light', 'Health registry');
  await pair('sp-v1-02-selected-light', sketch, build.png);
}
await browser.close();
console.table(report);
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
