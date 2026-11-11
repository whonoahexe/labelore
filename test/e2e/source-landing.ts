// Shared by the e2e specs that follow an "In the source only" link (or a Source toggle) into the raw Source reader.
// The landing row carries data-source-hit="true" only for the 1.4 s flash (FLASH_MS in source-reader.tsx), and on a
// long document the page is busy rendering rows for longer than that, so a locator assertion made after the click
// can arrive after the flash ended. These helpers record the flash as it happens (a MutationObserver installed
// before the click), so the assertion reads what was flashed instead of racing the timer; the row's id (L{n})
// outlives the flash, so "in the viewport" is checked on that row afterwards.
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export interface FlashedRow {
  /** The row's id, "L{line}". */
  id: string;
  /** The row's text: the line number and the line's own text. */
  text: string;
}

/** Starts recording every Source row that gets data-source-hit="true". Call before the click that opens Source. */
export async function watchSourceHits(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = window as unknown as { __sourceHits?: { id: string; text: string }[] };
    const hits: { id: string; text: string }[] = [];
    store.__sourceHits = hits;
    const scan = (): void => {
      document.querySelectorAll('.source-row[data-source-hit="true"]').forEach((row) => {
        if (!hits.some((hit) => hit.id === row.id)) hits.push({ id: row.id, text: row.textContent ?? '' });
      });
    };
    new MutationObserver(scan).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-source-hit'],
    });
    scan();
  });
}

/** Waits until a row has flashed, then returns every row that flashed since watchSourceHits. */
export async function flashedRows(page: Page): Promise<FlashedRow[]> {
  const read = (): Promise<FlashedRow[]> =>
    page.evaluate(() => (window as unknown as { __sourceHits?: { id: string; text: string }[] }).__sourceHits ?? []);
  await expect.poll(async () => (await read()).length).toBeGreaterThan(0);
  return read();
}

/**
 * The Source landing, asserted: exactly one row flashed, it holds the heading's text, and that row (found by its
 * lasting id) is inside the viewport once the scroll has settled.
 */
export async function expectLandedOn(page: Page, headingText: string): Promise<void> {
  const rows = await flashedRows(page);
  expect(rows).toHaveLength(1);
  const [row] = rows;
  expect(row?.text).toContain(headingText);
  const landed = page.locator(`#${row?.id ?? 'L0'}`);
  await expect
    .poll(async () => {
      const box = await landed.boundingBox();
      const height = page.viewportSize()?.height ?? 0;
      return box !== null && box.y >= 0 && box.y < height;
    })
    .toBe(true);
}
