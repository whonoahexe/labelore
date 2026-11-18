// The browser tab title names the open project: "{name} · Labelore", or plain "Labelore" when no project
// is open. The helpers take a plain { title } object, because the vitest environment is node and has no document.
import { describe, expect, it } from 'vitest';
import { BASE_TAB_TITLE, applyTabTitle, tabTitle } from '../../src/web/tab-title.ts';

describe('tabTitle', () => {
  it('names the project before the product', () => {
    expect(tabTitle('Kilnrow')).toBe('Kilnrow · Labelore');
  });

  it('trims the name', () => {
    expect(tabTitle('  Kilnrow  ')).toBe('Kilnrow · Labelore');
  });

  it('falls back to the plain title when there is no name', () => {
    expect(tabTitle(null)).toBe('Labelore');
    expect(tabTitle('')).toBe('Labelore');
    expect(tabTitle('   ')).toBe('Labelore');
  });

  it('keeps the base title equal to the static one in index.html', () => {
    expect(BASE_TAB_TITLE).toBe('Labelore');
  });
});

describe('applyTabTitle', () => {
  it('sets the title and returns a function that restores the base title', () => {
    const target = { title: 'Labelore' };
    const restore = applyTabTitle(target, 'Kilnrow');
    expect(target.title).toBe('Kilnrow · Labelore');
    restore();
    expect(target.title).toBe('Labelore');
  });

  it('sets the plain title for no project', () => {
    const target = { title: 'Something else' };
    applyTabTitle(target, null);
    expect(target.title).toBe('Labelore');
  });

  it('leaves the new project name after a switch (cleanup runs before the next effect)', () => {
    const target = { title: 'Labelore' };
    const restoreFirst = applyTabTitle(target, 'Kilnrow');
    restoreFirst();
    applyTabTitle(target, 'Glazebook');
    expect(target.title).toBe('Glazebook · Labelore');
  });

  it('writes a name carrying markup as literal text', () => {
    const target = { title: 'Labelore' };
    applyTabTitle(target, '<b>Kilnrow</b>');
    expect(target.title).toBe('<b>Kilnrow</b> · Labelore');
  });
});
