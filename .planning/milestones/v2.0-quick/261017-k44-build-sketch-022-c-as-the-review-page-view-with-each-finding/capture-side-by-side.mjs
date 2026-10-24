// quick-261017-k44: side-by-side captures - sketch 022 variant C on the left, the build on the right -
// for the six sketch reviews, plus interaction, dark and narrow captures. gsd-browser was not connected
// in this session, so the same steps run through Playwright's chromium. The build is served by scratch
// dev servers on 5312 (labelore), 5313 (studio-portal), 5314 (sideby), 5315 (deid) and 5316 (a one-file
// project holding the synthetic clean review); the sketch by `python3 -m http.server 5311 --directory
// .planning/sketches`. PNGs and report.json land in the (gitignored) test/e2e/screenshots/k44 directory.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire('/home/noah/Work/Personal/labelore/package.json');
const { chromium } = require('@playwright/test');

const OUT = '/home/noah/Work/Personal/labelore/test/e2e/screenshots/k44';
const SKETCH = 'http://127.0.0.1:5311/022-review-page/';
const BASES = { lb: 'http://127.0.0.1:5312', sp: 'http://127.0.0.1:5313', sb: 'http://127.0.0.1:5314', dd: 'http://127.0.0.1:5315', syn: 'http://127.0.0.1:5316' };

// sketch doc key -> where the build route comes from
const DOCS = {
  sp01: { project: 'sp', needle: 'v1.0-phases/01-identity-persistence-foundation/01-REVIEW.md' },
  sb02: { project: 'sb', needle: 'v1.0-phases/02-container-docs/02-REVIEW.md' },
  lb01: { project: 'lb', needle: 'v1.0-phases/01-read-layer-domain-model/01-REVIEW.md' },
  dd01: { project: 'dd', needle: 'v1.0-phases/01-volume-acquisition-fast-volume-render/01-REVIEW.md' },
  lb05: { project: 'lb', needle: 'v1.1-phases/05-per-type-document-views/05-REVIEW.md' },
  clean: { project: 'syn', needle: '07-REVIEW.md' },
};

// id, doc, theme, width, action
const CAPTURES = [
  ['sp01-light', 'sp01', 'light', 1440],
  ['sb02-light', 'sb02', 'light', 1440],
  ['lb01-light', 'lb01', 'light', 1440],
  ['dd01-light', 'dd01', 'light', 1440],
  ['lb05-light', 'lb05', 'light', 1440],
  ['clean-light', 'clean', 'light', 1440],
  ['sb02-dark', 'sb02', 'dark', 1440],
  ['dd01-dark', 'dd01', 'dark', 1440],
  ['sb02-showfixed', 'sb02', 'light', 1440, 'showfixed'],
  ['lb01-unfold', 'lb01', 'light', 1440, 'unfold'],
  ['sb02-files', 'sb02', 'light', 1440, 'files'],
  ['lb05-quiet', 'lb05', 'light', 1440, 'quiet'],
  ['dd01-1024', 'dd01', 'light', 1024],
  ['dd01-820', 'dd01', 'light', 820],
  ['dd01-390', 'dd01', 'light', 390],
];

const BUILD_METRICS = () => {
  const q = (s) => document.querySelectorAll(s).length;
  const t = (s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  const main = document.querySelector('main');
  return {
    h1: `${q('h1')}:${t('h1')}`,
    eyebrow: t('.view-review-meta-left .eyebrow'),
    verdict: t('.view-review-verdict'),
    sub: t('.view-review-sub'),
    tally: [...document.querySelectorAll('.view-review-tally > div')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
    fileBlocks: q('.view-review-file'),
    threads: q('.view-review-thread'),
    resolvedRows: q('.view-review-resolved'),
    rulerMarks: q('.view-review-ruler i'),
    outsideScope: [...document.querySelectorAll('.view-review-file-meta .status-chip')].length,
    quietChips: q('.view-review-quiet-files code'),
    alsoChips: [...document.querySelectorAll('.view-review-also .status-chip')].map((e) => e.textContent.trim()),
    toggle: t('.view-review-toggle'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || (main ? main.scrollWidth > main.clientWidth + 1 : false),
  };
};

const SKETCH_METRICS = () => {
  const q = (s) => document.querySelectorAll(s).length;
  const t = (s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  const root = document.querySelector('#root .page');
  return {
    h1: `${q('h1')}:${t('h1')}`,
    eyebrow: t('.meta-left .eyebrow'),
    verdict: t('.verdict-big'),
    sub: t('.verdict-sub'),
    tally: [...document.querySelectorAll('.tally > div')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
    fileBlocks: q('.fileblock'),
    threads: q('.thread'),
    resolvedRows: q('.resolved-row'),
    rulerMarks: q('.fileblock .ruler i'),
    outsideScope: q('.fileblock > header .chips .chip'),
    quietChips: q('.quiet-files code'),
    alsoChips: [...document.querySelectorAll('.source-only .chip')].map((e) => e.textContent.trim()),
    toggle: t('.toggle'),
    overflow: root ? root.scrollWidth > root.clientWidth + 1 : null,
  };
};

async function routes() {
  const out = {};
  const cache = {};
  for (const [id, doc] of Object.entries(DOCS)) {
    try {
      cache[doc.project] ??= await (await fetch(`${BASES[doc.project]}/api/presentation`)).json();
      const found = cache[doc.project].artifacts.find((a) => a.path.endsWith(doc.needle));
      if (found) out[id] = found.key;
      else console.log(`no artifact ${doc.needle}`);
    } catch (error) {
      console.log(`no presentation for ${doc.project}: ${error}`);
    }
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
  showfixed: async (page) => page.click('[data-showres]'),
  unfold: async (page) => page.click('[data-unfold="CR-01"]'),
  files: async (page) => page.click('.facts-line [data-modal="files"]'),
  quiet: async (page) => page.click('[data-toggle="quiet"]'),
};

const BUILD_ACTIONS = {
  showfixed: async (page) => page.click('.view-review-toggle'),
  unfold: async (page) => page.click('.view-review-resolved:has-text("CR-01")'),
  files: async (page) => page.click('.view-review-facts button'),
  quiet: async (page) => page.click('.view-review-quiet-files .view-review-link'),
};

async function captureSketch(browser, [id, doc, theme, width, action]) {
  const page = await browser.newPage({ viewport: { width: width <= 820 ? width : 1440, height: 1000 } });
  await page.goto(`${SKETCH}?v=c&doc=${doc}&theme=${theme}`);
  await page.waitForSelector('#root .page');
  await page.evaluate(() => document.fonts.ready);
  if (action) await SKETCH_ACTIONS[action](page);
  await page.addStyleTag({ content: '#variant-nav, #sketch-tools, .shell-header, .toast { display: none !important; } * { animation: none !important; transition: none !important; }' });
  const metrics = await page.evaluate(SKETCH_METRICS);
  if (action === 'files') {
    await page.screenshot({ path: `${OUT}/${id}-sketch.png` });
  } else {
    await grow(page, Math.min(width, 1440), '#root .page');
    await page.locator('#root .page').screenshot({ path: `${OUT}/${id}-sketch.png` });
  }
  await page.close();
  return metrics;
}

async function captureBuild(browser, route, project, [id, , theme, width, action]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.addInitScript((value) => window.localStorage.setItem('labelore-theme', value), theme);
  await page.goto(`${BASES[project]}${route}`);
  await page.waitForSelector('.view-review-page');
  await page.evaluate(() => document.fonts.ready);
  if (action) await BUILD_ACTIONS[action](page);
  if (action === 'files') {
    await page.waitForSelector('.view-review-modal');
    const metrics = await page.evaluate(BUILD_METRICS);
    metrics.modalRows = await page.locator('.view-review-modal-row').count();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${id}-build.png` });
    await page.close();
    return metrics;
  }
  await grow(page, width, 'main');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('main')) continue;
      const p = getComputedStyle(el).position;
      if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden';
    }
  });
  const metrics = await page.evaluate(BUILD_METRICS);
  await page.locator('main').screenshot({ path: `${OUT}/${id}-build.png` });
  await page.close();
  return metrics;
}

async function pair(browser, id, width, action) {
  const w = action === 'files' ? 1440 : Math.min(width, 1440);
  const page = await browser.newPage({ viewport: { width: w * 2 + 64, height: 1000 } });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 022 C</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
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
const map = await routes();
const report = {};
let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
}
try {
  for (const capture of CAPTURES) {
    const [id, doc, , width, action] = capture;
    if (wanted.length > 0 && !wanted.includes(id)) continue;
    if (!map[doc]) {
      report[id] = { error: 'no route' };
      continue;
    }
    try {
      const sketch = await captureSketch(browser, capture);
      const build = await captureBuild(browser, map[doc], DOCS[doc].project, capture);
      await pair(browser, id, width, action);
      report[id] = { sketch, build };
      console.log(`captured ${id}`);
    } catch (error) {
      report[id] = { error: String(error) };
      console.log(`failed ${id}: ${error}`);
    }
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
