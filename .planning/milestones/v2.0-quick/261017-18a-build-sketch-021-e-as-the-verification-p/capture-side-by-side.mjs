// quick-261017-18a: side-by-side captures - sketch 021 variant E on the left, the build on the right -
// for the five sketch reports, plus interaction, dark and narrow captures. gsd-browser was not
// connected in this session, so the same steps run through Playwright's chromium at /usr/bin/chromium
// (no browser download). The build is served by scratch dev servers on 5311 (labelore), 5312
// (studio-portal), 5313 (sideby), 5314 (deid) and 5315 (a one-file project holding the synthetic
// report); the sketch by `python3 -m http.server 5310 --directory .planning/sketches`. PNGs and
// report.json land in the (gitignored) test/e2e/screenshots/18a directory.
//
// Usage: node capture-side-by-side.mjs [id ...]   (no ids = every capture)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire('/home/noah/Work/Personal/labelore/package.json');
const { chromium } = require('@playwright/test');

const OUT = '/home/noah/Work/Personal/labelore/test/e2e/screenshots/18a';
const SKETCH = 'http://127.0.0.1:5310/021-verification-page/';
const BASES = { lb: 'http://127.0.0.1:5311', sp: 'http://127.0.0.1:5312', sb: 'http://127.0.0.1:5313', dd: 'http://127.0.0.1:5314', syn: 'http://127.0.0.1:5315' };

// doc -> where the build route comes from and which sketch doc it pairs with
const DOCS = {
  syn: { project: 'syn', needle: '06-VERIFICATION.md' },
  sp04: { project: 'sp', needle: 'phases/04-bulk-archive-downloads/04-VERIFICATION.md' },
  sb04: { project: 'sb', needle: 'v1.5-phases/04-camera-strip-ui-controls-netflix-coexistence/04-VERIFICATION.md' },
  dd01: { project: 'dd', needle: 'v1.0-phases/01-volume-acquisition-fast-volume-render/01-VERIFICATION.md' },
  lb05: { project: 'lb', needle: 'v1.1-phases/05-per-type-document-views/05-VERIFICATION.md' },
};

// id, doc, theme, width, action
const CAPTURES = [
  ['syn-light', 'syn', 'light', 1440],
  ['sp04-light', 'sp04', 'light', 1440],
  ['sb04-light', 'sb04', 'light', 1440],
  ['dd01-light', 'dd01', 'light', 1440],
  ['lb05-light', 'lb05', 'light', 1440],
  ['sp04-dark', 'sp04', 'dark', 1440],
  ['lb05-dark', 'lb05', 'dark', 1440],
  ['syn-c2', 'syn', 'light', 1440, 'c2'],
  ['syn-c2-whole', 'syn', 'light', 1440, 'c2-whole'],
  ['sp04-c1', 'sp04', 'light', 1440, 'c1'],
  ['sp04-truth', 'sp04', 'light', 1440, 'truth'],
  ['sb04-req', 'sb04', 'light', 1440, 'req'],
  ['lb05-modal', 'lb05', 'light', 1440, 'modal'],
  ['sp04-1024', 'sp04', 'light', 1024],
  ['sp04-820', 'sp04', 'light', 820],
  ['sp04-390', 'sp04', 'light', 390],
];

const BUILD_METRICS = () => {
  const q = (s) => document.querySelectorAll(s).length;
  const t = (s) => document.querySelector(s)?.textContent.trim() ?? null;
  const rows = [...document.querySelectorAll('#verification-truths tbody tr')].map((tr) => tr.querySelectorAll('.view-verification-square').length);
  const main = document.querySelector('main');
  return {
    h1: `${q('h1')}:${t('h1')}`,
    eyebrow: t('.view-verification-identity .eyebrow'),
    status: t('.view-verification-facts .status-chip'),
    big: `${t('.view-verification-big-number')} | ${t('.view-verification-big-label')} | ${t('.view-verification-big-sub')}`,
    stats: [...document.querySelectorAll('.view-verification-stat')].map((e) => e.textContent.trim()),
    slips: q('.view-verification-slip'),
    ledgerRows: q('.view-verification-gap'),
    chips: q('.view-verification-task-chip'),
    truthSquaresPerRow: rows,
    reqSquares: q('#verification-requirements .view-verification-square'),
    steps: q('.view-verification-step'),
    antiCards: q('.view-verification-blocker'),
    antiRows: q('.view-verification-anti-row'),
    alsoChips: q('#verification-also button'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || (main ? main.scrollWidth > main.clientWidth + 1 : false),
  };
};

const SKETCH_METRICS = () => {
  const q = (s) => document.querySelectorAll(s).length;
  const t = (s) => document.querySelector(s)?.textContent.trim() ?? null;
  const tables = [...document.querySelectorAll('.board')];
  const rows = tables[0] ? [...tables[0].querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('.bsq').length) : [];
  const root = document.querySelector('#root .page');
  return {
    h1: `${q('h1')}:${t('h1')}`,
    eyebrow: t('.e-rail .eyebrow'),
    status: t('.e-rail .status-badge'),
    big: `${t('.e-big .n')} | ${t('.e-big .l')} | ${t('.e-big .s')}`,
    stats: [...document.querySelectorAll('.e-stats > button, .e-stats > div')].slice(1).map((e) => e.textContent.trim()),
    slips: q('.slip'),
    ledgerRows: q('.lrow'),
    chips: q('.lrow .tchip'),
    truthSquaresPerRow: rows,
    reqSquares: q('#sec-reqs .bsq'),
    steps: q('.step'),
    antiCards: q('.apb'),
    antiRows: q('.apw'),
    alsoChips: q('.source-only .chip'),
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
  c2: async (page) => page.click('[data-bgap="c1"]'),
  'c2-whole': async (page) => {
    await page.click('[data-bgap="c1"]');
    await page.click('[data-toggle="tk-c1-0"]');
  },
  c1: async (page) => page.click('[data-bgap="c0"]'),
  truth: async (page) => page.click('.board .bsq[data-s="failed"]'),
  req: async (page) => page.click('#sec-reqs .bsq.wide'),
  modal: async (page) => page.click('[data-modal="auto"]'),
};

const BUILD_ACTIONS = {
  c2: async (page) => page.click('#verification-gap-c2 .view-verification-row'),
  'c2-whole': async (page) => {
    await page.click('#verification-gap-c2 .view-verification-row');
    await page.click('#verification-gap-c2 .view-verification-more');
  },
  c1: async (page) => page.click('#verification-gap-c1 .view-verification-row'),
  truth: async (page) => page.click('#verification-truths .view-verification-square[data-state="failed"]'),
  req: async (page) => page.click('#verification-requirements .view-verification-square'),
  modal: async (page) => page.click('.view-verification-stat:has-text("Spot-checks")'),
};

async function captureSketch(browser, [id, doc, theme, width, action]) {
  const page = await browser.newPage({ viewport: { width: width <= 820 ? width : 1440, height: 1000 } });
  await page.goto(`${SKETCH}?v=e&doc=${doc}&theme=${theme}`);
  await page.waitForSelector('#root .page');
  await page.evaluate(() => document.fonts.ready);
  if (action) await SKETCH_ACTIONS[action](page);
  await page.addStyleTag({ content: '#variant-nav, #sketch-tools, .shell-header, .toast { display: none !important; } * { animation: none !important; transition: none !important; }' });
  const metrics = await page.evaluate(SKETCH_METRICS);
  if (action === 'modal') {
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
  await page.waitForSelector('.view-verification-rail');
  await page.evaluate(() => document.fonts.ready);
  if (action) await BUILD_ACTIONS[action](page);
  if (action === 'modal') {
    await page.waitForSelector('.view-verification-modal');
    const metrics = await page.evaluate(BUILD_METRICS);
    metrics.modalRows = await page.locator('.view-verification-spot').count();
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
  const w = action === 'modal' ? 1440 : Math.min(width, 1440);
  const page = await browser.newPage({ viewport: { width: w * 2 + 64, height: 1000 } });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;display:flex;gap:16px;align-items:flex-start}figure{margin:0}img{display:block;max-width:none}figcaption{font:12px monospace;padding:4px;background:#fff;color:#000}</style><figure><figcaption>sketch 021 E</figcaption><img src="file://${OUT}/${id}-sketch.png"></figure><figure><figcaption>build</figcaption><img src="file://${OUT}/${id}-build.png"></figure>`;
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
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
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
