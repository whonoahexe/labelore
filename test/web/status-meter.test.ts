// Phase 10 (10-18, UI-SPEC section 8): the shared status-meter. One square per item, filled ones in a tone, the rest
// quiet; the whole meter is one image whose single accessible name is its label, the squares hidden.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  STATUS_METER_MAX_CELLS,
  StatusMeter,
  statusMeterCells,
} from '../../src/web/components/status-meter.tsx';

function markup(props: Parameters<typeof StatusMeter>[0]): string {
  return renderToStaticMarkup(createElement(StatusMeter, props));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('StatusMeter', () => {
  it('draws 16 squares for 16 items, 6 of them in the tone and 10 quiet', () => {
    const out = markup({ filled: 6, total: 16, label: '6 of 16 checklist items done' });
    expect(count(out, 'class="status-square status-meter-sq"')).toBe(16);
    expect(count(out, 'data-tone="complete"')).toBe(6);
    expect(count(out, 'data-tone="quiet"')).toBe(10);
  });

  it('is one image with one accessible name, and the squares and caption are hidden', () => {
    const out = markup({
      filled: 6,
      total: 16,
      label: '6 of 16 checklist items done',
      caption: '6 of 16 checklist items done',
    });
    expect(count(out, 'role="img"')).toBe(1);
    expect(count(out, 'aria-label=')).toBe(1);
    expect(out).toContain('aria-label="6 of 16 checklist items done"');
    expect(out).toContain('<span class="status-meter-cells" aria-hidden="true">');
    expect(out).toContain('<span class="status-meter-cap" aria-hidden="true">');
  });

  it('writes no caption when none is given, and a large meter marks its size', () => {
    const out = markup({ filled: 0, total: 3, label: '0 of 3 done', size: 'large' });
    expect(out).not.toContain('status-meter-cap');
    expect(out).toContain('data-size="large"');
    expect(count(out, 'data-tone="quiet"')).toBe(3);
  });

  it('takes the tone it is given', () => {
    const out = markup({ filled: 2, total: 4, tone: 'in-flight', label: '2 of 4' });
    expect(count(out, 'data-tone="in-flight"')).toBe(2);
    expect(count(out, 'data-tone="complete"')).toBe(0);
  });

  it('draws nothing for no items', () => {
    const out = markup({ filled: 0, total: 0, label: 'Nothing to do' });
    expect(count(out, 'status-meter-sq')).toBe(0);
    expect(out).toContain('aria-label="Nothing to do"');
  });
});

describe('statusMeterCells', () => {
  it('is one cell per item up to the cap', () => {
    expect(statusMeterCells(6, 16)).toEqual({ cells: 16, filledCells: 6 });
    expect(statusMeterCells(40, 40)).toEqual({ cells: 40, filledCells: 40 });
  });

  it('is one cell per bucket past the cap, the filled count scaled', () => {
    expect(statusMeterCells(100, 200)).toEqual({ cells: STATUS_METER_MAX_CELLS, filledCells: 20 });
    expect(statusMeterCells(200, 200)).toEqual({ cells: STATUS_METER_MAX_CELLS, filledCells: 40 });
    expect(statusMeterCells(0, 5000)).toEqual({ cells: STATUS_METER_MAX_CELLS, filledCells: 0 });
  });

  it('keeps the exact numbers in the label however many squares are drawn', () => {
    const out = markup({ filled: 123, total: 1000, label: '123 of 1000 done' });
    expect(count(out, 'status-meter-sq')).toBe(STATUS_METER_MAX_CELLS);
    expect(out).toContain('aria-label="123 of 1000 done"');
  });

  it('clamps a filled count outside 0 to total and a non-finite one to nothing', () => {
    expect(statusMeterCells(-3, 10)).toEqual({ cells: 10, filledCells: 0 });
    expect(statusMeterCells(99, 10)).toEqual({ cells: 10, filledCells: 10 });
    expect(statusMeterCells(Number.NaN, 10)).toEqual({ cells: 10, filledCells: 0 });
    expect(statusMeterCells(3, Number.NaN)).toEqual({ cells: 0, filledCells: 0 });
  });
});
