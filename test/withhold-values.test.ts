// Phase 10 (10-14, VIEW-13, T-10-24, RESEARCH Pitfall 12): a variable's value never leaves the lift. withholdValue
// reads the name and says whether a value sat beside it; it never returns the value. stripControlCharacters cleans a
// run command before it reaches a copy row (T-10-26).
import { describe, expect, it } from 'vitest';
import { stripControlCharacters, withholdInText, withholdValue } from '../src/planning-repo/handlers/withhold-values.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

describe('withholdValue', () => {
  it('gives the name and hadValue for NAME=value, the planted Tidemark line included', () => {
    expect(withholdValue('TIDEMARK_TIDE_FEED_KEY=PLACEHOLDER-NOT-A-REAL-KEY')).toEqual({
      name: 'TIDEMARK_TIDE_FEED_KEY',
      hadValue: true,
    });
    expect(withholdValue('`TIDEMARK_TIDE_FEED_KEY=PLACEHOLDER-NOT-A-REAL-KEY`')).toEqual({
      name: 'TIDEMARK_TIDE_FEED_KEY',
      hadValue: true,
    });
  });

  it('reads NAME: value, and a name in backticks followed by =value outside them', () => {
    expect(withholdValue('API_TOKEN: sk-abc')).toEqual({ name: 'API_TOKEN', hadValue: true });
    expect(withholdValue('`API_TOKEN`=sk-abc')).toEqual({ name: 'API_TOKEN', hadValue: true });
  });

  it('gives hadValue false for a bare name, in backticks or not, and for a name followed by prose', () => {
    expect(withholdValue('`DB_URL`')).toEqual({ name: 'DB_URL', hadValue: false });
    expect(withholdValue('DB_URL')).toEqual({ name: 'DB_URL', hadValue: false });
    expect(withholdValue('`LABELORE_CONFIG_DIR` when running under Vitest')).toEqual({
      name: 'LABELORE_CONFIG_DIR',
      hadValue: false,
    });
    expect(withholdValue('`PORT` - the listen port')).toEqual({ name: 'PORT', hadValue: false });
  });

  it('does not count a bracketed or angle-bracketed placeholder, or an empty remainder, as a value', () => {
    expect(withholdValue('PORT=[your port]')).toEqual({ name: 'PORT', hadValue: false });
    expect(withholdValue('PORT=<port>')).toEqual({ name: 'PORT', hadValue: false });
    expect(withholdValue('`PORT=`')).toEqual({ name: 'PORT', hadValue: false });
    expect(withholdValue('PORT=')).toEqual({ name: 'PORT', hadValue: false });
  });

  it('gives null for a token that is not upper-snake: lower case, a digit first, one letter, over 80 characters', () => {
    expect(withholdValue('lowercase=value')).toBeNull();
    expect(withholdValue('Mixed_Case=value')).toBeNull();
    expect(withholdValue('9LIVES=value')).toBeNull();
    expect(withholdValue('A=value')).toBeNull();
    expect(withholdValue(`${'A'.repeat(81)}=value`)).toBeNull();
    expect(withholdValue('')).toBeNull();
    expect(withholdValue('   ')).toBeNull();
    expect(withholdValue('.env')).toBeNull();
  });

  it('never returns the value, whatever the form', () => {
    for (const text of ['SECRET_KEY=hunter2', '`SECRET_KEY=hunter2`', 'SECRET_KEY: hunter2', '`SECRET_KEY`=hunter2']) {
      const found = withholdValue(text);
      expect(JSON.stringify(found)).not.toContain('hunter2');
    }
  });

  it('stays linear on a very long run of capitals and on a long value', { timeout: 60_000 }, () => {
    const growth = measureGrowth({
      make: (n) => `${'A'.repeat(n)}=${'x'.repeat(n)}`,
      run: (text) => void withholdValue(text),
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('withholdInText', () => {
  it('removes a value from a backticked NAME=value span and from a bare NAME=value word, keeping the name', () => {
    const found = withholdInText('Set `API_KEY=sk-123` first, then run with TOKEN=abc999 and done.');
    expect(found.text).toBe('Set `API_KEY` first, then run with TOKEN and done.');
    expect(found.hadValue).toBe(true);
    expect(found.text).not.toContain('sk-123');
    expect(found.text).not.toContain('abc999');
  });

  it('leaves text with no value untouched', () => {
    const found = withholdInText('Uses `NODE_ENV` and `LABELORE_CONFIG_DIR` - see src/server/settings-store.ts');
    expect(found).toEqual({ text: 'Uses `NODE_ENV` and `LABELORE_CONFIG_DIR` - see src/server/settings-store.ts', hadValue: false });
  });

  it('keeps a placeholder value, which is not a value', () => {
    expect(withholdInText('`PORT=[your port]`')).toEqual({ text: '`PORT=[your port]`', hadValue: false });
  });
});

describe('stripControlCharacters', () => {
  it('removes C0 and C1 control characters and bidirectional override characters, keeping ordinary text', () => {
    const dirty = 'npm\u0000 run\u001b[31m test\u0085‮ --all⁦⁩‏';
    expect(stripControlCharacters(dirty)).toBe('npm run[31m test --all');
  });

  it('keeps ordinary text, spaces, quotes, unicode letters and a tab', () => {
    expect(stripControlCharacters('npx playwright test -g "copy-path" # é\tx')).toBe(
      'npx playwright test -g "copy-path" # é\tx',
    );
  });

  it('removes a newline and a carriage return, so a copied command is one line', () => {
    expect(stripControlCharacters('rm -rf x\nls')).toBe('rm -rf xls');
    expect(stripControlCharacters('a\r\nb')).toBe('ab');
  });
});
