// Phase 10 (10-14, VIEW-13, T-10-24, RESEARCH Pitfall 12): a variable's value never leaves the lift. withholdValue
// reads the name and says whether a value sat beside it; it never returns the value. stripControlCharacters cleans a
// run command before it reaches a copy row (T-10-26).
import { describe, expect, it } from 'vitest';
import {
  maskProse,
  VALUE_NOT_SHOWN_MARK,
  maskData,
  maskValues,
  splitMasked,
  stripControlCharacters,
  withholdInText,
  withholdValue,
} from '../src/planning-repo/handlers/withhold-values.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import { WRITTEN_FORMS, formTag } from './helpers/written-value-forms.ts';

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

  it('reads a line that opens with NAME: value as the name alone, and `NAME`=value as the name', () => {
    expect(withholdInText('API_TOKEN: sk-abc and more')).toEqual({ text: 'API_TOKEN', hadValue: true });
    expect(withholdInText('`API_TOKEN`: sk-abc')).toEqual({ text: '`API_TOKEN`', hadValue: true });
    expect(withholdInText('set `API_TOKEN`=sk-abc now')).toEqual({ text: 'set `API_TOKEN` now', hadValue: true });
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

  // 10-REVIEW WR-05: a zero-width, soft-hyphen or tag character inside a command draws nothing, so the command on screen
  // would differ from the command pasted. Every input below is written with escapes, never with the character itself.
  it('removes zero-width, word-joiner, byte-order-mark, soft-hyphen and tag characters, so the copy is the visible text', () => {
    expect(stripControlCharacters('npm\u200B test\u2060 \u{E0041}x\u00AD')).toBe('npm test x');
    expect(stripControlCharacters('n\u200Cp\u200Dm\uFEFF \u180Etest')).toBe('npm test');
    expect(stripControlCharacters('\u{E0001}ls\u{E007F} -la')).toBe('ls -la');
  });

  it('keeps the characters beside them: non-Latin letters, an emoji and ordinary punctuation', () => {
    expect(stripControlCharacters('echo é日本 \u{1F600} --flag=1')).toBe('echo é日本 \u{1F600} --flag=1');
  });

  it('removes a newline and a carriage return, so a copied command is one line', () => {
    expect(stripControlCharacters('rm -rf x\nls')).toBe('rm -rf xls');
    expect(stripControlCharacters('a\r\nb')).toBe('ab');
  });
});

// 10-19 (T-10-33, CONTEXT D-11): maskValues is the one mask every View-rendered user-setup string passes through. It
// keeps each upper-snake NAME and the punctuation after it, replaces the value after it with the one marker the
// components draw as the quiet "Value not shown" mark, and never returns the value.
describe('maskValues', () => {
  const MARK = VALUE_NOT_SHOWN_MARK;

  it('keeps the name, drops the value and keeps what follows', () => {
    const out = maskValues('Notes: export LOANNOTE_MODEL_KEY=PLANTED-STEP-VALUE-0001 then restart');
    expect(out).toBe(`Notes: export LOANNOTE_MODEL_KEY=${MARK} then restart`);
    expect(out).not.toContain('PLANTED-STEP-VALUE-0001');
  });

  it('masks a value inside an inline code span up to the closing backtick, and keeps a bracketed placeholder', () => {
    const out = maskValues('use `API_TOKEN: PLANTED-CODE-0005` and PORT=[your port]');
    expect(out).toBe(`use \`API_TOKEN: ${MARK}\` and PORT=[your port]`);
    expect(out).not.toContain('PLANTED-CODE-0005');
  });

  it('masks a value with spaces inside a code span whole', () => {
    const out = maskValues('run `export SECRET_PHRASE=first second third` now');
    expect(out).toBe(`run \`export SECRET_PHRASE=${MARK}\` now`);
  });

  it('masks every assignment on a line, anywhere in it, not only a leading one', () => {
    const out = maskValues('A_KEY=one-1 and B_KEY: two-2, then C_KEY=three-3');
    expect(out).toBe(`A_KEY=${MARK} and B_KEY: ${MARK}, then C_KEY=${MARK}`);
    for (const value of ['one-1', 'two-2', 'three-3']) expect(out).not.toContain(value);
  });

  it('keeps an angle-bracketed placeholder and a name with no value, and returns text with no assignment unchanged', () => {
    expect(maskValues('PORT=<port> and DB_URL= and `HOST_NAME`')).toBe('PORT=<port> and DB_URL= and `HOST_NAME`');
    const plain = 'Run the stub, then open http://localhost:4318 (see Local Development: step 2).';
    expect(maskValues(plain)).toBe(plain);
    expect(maskValues('')).toBe('');
  });

  it('masks a name written in its own backticks with the value outside them', () => {
    const out = maskValues('set `API_TOKEN`=PLANTED-OUTSIDE-0006 first');
    expect(out).toBe(`set \`API_TOKEN\`=${MARK} first`);
  });

  it('masks a quoted value whole, spaces included, and a value after spaces around the equals sign', () => {
    expect(maskValues('SECRET_PHRASE="first second third" ok')).toBe(`SECRET_PHRASE=${MARK} ok`);
    expect(maskValues("SECRET_PHRASE='first second' ok")).toBe(`SECRET_PHRASE=${MARK} ok`);
    expect(maskValues('SECRET_KEY = hunter2 ok')).toBe(`SECRET_KEY = ${MARK} ok`);
  });

  it('masks a value written right after the colon, but not a URL scheme', () => {
    expect(maskValues('SECRET_KEY:hunter2 ok')).toBe(`SECRET_KEY:${MARK} ok`);
    expect(maskValues('see HTTP://example for more')).toBe('see HTTP://example for more');
  });

  it('does not treat a lower-case, mixed-case or one-letter name as a variable', () => {
    for (const text of ['api_key=abc', 'Api_Key=abc', 'A=abc', 'path: /tmp/x', 'x==y', 'KEY=>value']) {
      expect(maskValues(text), text).toBe(text);
    }
  });

  it('is idempotent: masking masked text changes nothing', () => {
    const once = maskValues('A_KEY=one B_KEY: two `C_KEY=three four`');
    expect(maskValues(once)).toBe(once);
  });

  it('never returns the value, whatever the form', () => {
    const forms = [
      'SECRET_KEY=hunter2',
      '`SECRET_KEY=hunter2`',
      'SECRET_KEY: hunter2',
      '`SECRET_KEY`=hunter2',
      '- SECRET_KEY=hunter2 (do not commit)',
      '| [ ] | `SECRET_KEY=hunter2` | Host | `.env.local` |',
      'export SECRET_KEY="hunter2"',
    ];
    for (const form of forms) expect(maskValues(form), form).not.toContain('hunter2');
  });

  it('stays linear on 5,000 assignments on one line, a 200,000-character line and a long run of capitals', { timeout: 60_000 }, () => {
    const assignments = measureGrowth({
      make: (n) => Array.from({ length: n }, (_, i) => `K_${i}=v${i}`).join(' '),
      run: (text) => void maskValues(text),
      startSize: 625,
      maxSize: 5000,
    });
    expect(assignments.ratio).toBeLessThan(GROWTH_LIMIT);
    const capitals = measureGrowth({
      make: (n) => `${'A'.repeat(n)}=${'x'.repeat(n)}`,
      run: (text) => void maskValues(text),
    });
    expect(capitals.ratio).toBeLessThan(GROWTH_LIMIT);
    const ticks = measureGrowth({
      make: (n) => '`A_B=x`'.repeat(n),
      run: (text) => void maskValues(text),
      startSize: 1000,
      maxSize: 30_000,
    });
    expect(ticks.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

// 10-REVIEW CR-02 / WR-01: the mask removes the value in every written form, not only the leading `NAME=value`.
describe('maskValues - every written form (10-REVIEW CR-02, WR-01)', () => {
  for (const [index, form] of WRITTEN_FORMS.entries()) {
    it(`withholds the value of: ${form.label}`, () => {
      const tag = formTag(index);
      const out = maskValues(form.line(tag));
      for (const secret of form.secrets(tag)) expect(out, secret).not.toContain(secret);
      expect(out).toContain(VALUE_NOT_SHOWN_MARK);
      expect(maskValues(out), 'idempotent').toBe(out);
    });
  }

  it('still names the variable beside the mark', () => {
    expect(maskValues('**STRIPE_KEY** = hunter2')).toBe(`**STRIPE_KEY** = ${VALUE_NOT_SHOWN_MARK}`);
    expect(maskValues('Auth: STRIPE_KEY: hunter2')).toBe(`Auth: STRIPE_KEY: ${VALUE_NOT_SHOWN_MARK}`);
    expect(maskValues('| STRIPE_KEY | hunter2 |')).toBe(`| STRIPE_KEY | ${VALUE_NOT_SHOWN_MARK} |`);
    expect(maskValues('x [STRIPE_KEY=hunter2] y')).toBe(`x [STRIPE_KEY=${VALUE_NOT_SHOWN_MARK}] y`);
  });

  it('keeps a description in brackets (lower-case words, an upper-snake token) but not a value in brackets', () => {
    for (const kept of ['PORT=<port>', 'PORT=[your port]', 'KEY=<api-key>', 'KEY=<YOUR_KEY>', 'KEY=[paste it here]']) {
      expect(maskValues(kept), kept).toBe(kept);
    }
    for (const masked of ['PASSWORD=<hunter2>', 'API_KEY=[sk-live-1]', 'API_KEY=<Hunter>']) {
      expect(maskValues(masked), masked).toContain(VALUE_NOT_SHOWN_MARK);
    }
  });

  it('leaves a table row with no variable name, and a header row, as written', () => {
    expect(maskValues('| Variable | Value |')).toBe('| Variable | Value |');
    expect(maskValues('| --- | --- |')).toBe('| --- | --- |');
    expect(maskValues('| Host | Stripe dashboard |')).toBe('| Host | Stripe dashboard |');
  });
});

describe('withholdInText - a quoted value is removed whole (10-REVIEW CR-02)', () => {
  it('removes a single-quoted value of several words and a double-quoted one', () => {
    expect(withholdInText("STRIPE_KEY='sk live' now").text).toBe('STRIPE_KEY now');
    expect(withholdInText('Use STRIPE_KEY="a b c" now').text).toBe('Use STRIPE_KEY now');
  });
});

describe('splitMasked (11-37, L3-WR-01): masked text as text and withheld-name runs', () => {
  const MARK = VALUE_NOT_SHOWN_MARK;

  it('gives the text, the withheld name and the text after it, for each written form', () => {
    for (const written of [`Set API_KEY=${MARK} now`, `Set API_KEY = ${MARK} now`, `Set API_KEY: ${MARK} now`]) {
      expect(splitMasked(written), written).toEqual([
        { kind: 'text', text: 'Set ' },
        { kind: 'withheld', name: 'API_KEY' },
        { kind: 'text', text: ' now' },
      ]);
    }
  });

  it('takes the bold stars and the backticks that wrap the pair away with it', () => {
    expect(splitMasked(`**API_KEY=${MARK}** next`)).toEqual([
      { kind: 'withheld', name: 'API_KEY' },
      { kind: 'text', text: ' next' },
    ]);
    expect(splitMasked(`a \`DB_URL=${MARK}\` b`)).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'withheld', name: 'DB_URL' },
      { kind: 'text', text: ' b' },
    ]);
    expect(splitMasked(`**STRIPE_KEY** = ${MARK}`)).toEqual([{ kind: 'withheld', name: 'STRIPE_KEY' }]);
  });

  it('gives a withheld run with no name when no name can be read before the mark, and one text run for plain text', () => {
    expect(splitMasked(`| ${MARK} |`)).toEqual([
      { kind: 'text', text: '| ' },
      { kind: 'withheld', name: null },
      { kind: 'text', text: ' |' },
    ]);
    expect(splitMasked('plain words')).toEqual([{ kind: 'text', text: 'plain words' }]);
    expect(splitMasked('')).toEqual([]);
  });

  it('reads what maskValues writes, for every form in the planted-value set', () => {
    for (const written of [
      '**API_KEY=abc123**',
      'API_KEY = abc123',
      'API_KEY: abc123',
      '`DB_URL=postgres://u:p@h/db`',
      'TOKEN=abc123',
    ]) {
      const runs = splitMasked(maskValues(written));
      expect(runs.filter((run) => run.kind === 'withheld'), written).toHaveLength(1);
      expect(JSON.stringify(runs), written).not.toContain('abc123');
      expect(JSON.stringify(runs), written).not.toContain('postgres');
      expect(JSON.stringify(runs), written).not.toContain('*');
      expect(JSON.stringify(runs), written).not.toContain('`');
    }
  });

  it('shows a lower-case name as written: outside the shared mask contract', () => {
    expect(maskValues('api_key=abc123 and token: sk-abcdef')).toBe('api_key=abc123 and token: sk-abcdef');
  });
});

describe('maskData (11-37): every string of a lifted value, keys included', () => {
  it('masks strings in objects and arrays, keeps dates and numbers, and drops what nests past eight levels', () => {
    const when = new Date(0);
    const out = maskData({ a: 'TOKEN=abc123', list: ['x', { 'KEY=zzz': 1 }], when, n: 3 }, 0) as Record<string, unknown>;
    expect(JSON.stringify(out)).not.toContain('abc123');
    expect(JSON.stringify(out)).not.toContain('zzz');
    expect(out.when).toBe(when);
    expect(out.n).toBe(3);
    let deep: unknown = 'TOKEN=abc123';
    for (let level = 0; level < 12; level += 1) deep = { next: deep };
    expect(JSON.stringify(maskData(deep, 0))).not.toContain('abc123');
  });
});

// 11 (WR-01, G-11-2 re-review): seeds and threads are prose. The prose mode keeps "WORD: words" as written and masks only a
// credential-like token after a colon; the `=` forms are masked as in the default mode.
describe('maskProse (WR-01)', () => {
  const KEPT = [
    'NOTE: revisit when the API ships',
    'TODO: fix **bold** later',
    'Seed title — IMPORTANT: revisit after v2 ships, then archive. Also see docs',
    '- UAT: passes',
    'Retry: max 3 times (see HTTP: 429)',
    'WARNING: follow-up on GitHub',
    '| NOTE | revisit later |',
    // WR-03: GSD prose with ids, paths and links after a colon.
    'REQ: AUTH-01',
    'SEE: 11-CONTEXT.md',
    'ADR: ADR-0012',
    'STATUS: v1',
    'DECISION: D-04 holds',
    'NOTE: https://example.com/x',
    '| REQ | AUTH-01 |',
  ];
  for (const text of KEPT) {
    it(`keeps prose as written: ${text}`, () => {
      expect(maskProse(text)).toBe(text);
    });
  }

  const MASKED: [string, string][] = [
    ['Set TOKEN: abc123 in the vault', 'Set TOKEN: [Value not shown]'],
    // WR-01: after a secret name the value is masked, but the clause stops at the closing bold stars.
    ['Use **TOKEN: xyz** ok', 'Use **TOKEN: [Value not shown]** ok'],
    ['API_KEY:sk_live_x', 'API_KEY:[Value not shown]'],
    ['DB_URL: postgres://u:p@h/db', 'DB_URL: [Value not shown]'],
    ['Use **TOKEN: abc123** ok', 'Use **TOKEN: [Value not shown]** ok'],
    ['TOKEN=abc123 leaks', 'TOKEN=[Value not shown] leaks'],
    ['API_KEY = hunter', 'API_KEY = [Value not shown]'],
    ['`TOKEN: abc123`', '`TOKEN: [Value not shown]`'],
    ['| STRIPE_KEY | sk_live_abc |', '| STRIPE_KEY | [Value not shown] |'],
    // WR-02: after a secret name the default mask applies, whatever the value looks like.
    ['PASSWORD: hunter', 'PASSWORD: [Value not shown]'],
    ['PASSWORD: correct horse battery staple', 'PASSWORD: [Value not shown]'],
    ['TOKEN: deadbeefcafebabe', 'TOKEN: [Value not shown]'],
    ['API_KEY: sk-live-abcdefgh', 'API_KEY: [Value not shown]'],
    ['PIN: 4821', 'PIN: [Value not shown]'],
    ['SECRET: "hunter two"', 'SECRET: [Value not shown]'],
    ['`DB_PASS: correct horse`', '`DB_PASS: [Value not shown]`'],
    ['| DB_PASS | hunter |', '| DB_PASS | [Value not shown] |'],
    ['FOO=hunter', 'FOO=[Value not shown]'],
  ];
  for (const [text, expected] of MASKED) {
    it(`masks a credential: ${text}`, () => {
      expect(maskProse(text)).toBe(expected);
    });
  }

  it('leaves no stray bold stars around a masked bold value', () => {
    const runs = splitMasked(maskProse('Use **TOKEN: abc123** ok'));
    expect(runs).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'withheld', name: 'TOKEN' },
      { kind: 'text', text: ' ok' },
    ]);
  });

  it('is idempotent', () => {
    for (const [text] of MASKED) expect(maskProse(maskProse(text))).toBe(maskProse(text));
  });
});
