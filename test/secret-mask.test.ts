// SEC-04: the masking rules in isolation. Same display form as GSD's own secrets.cjs; unlike GSD,
// on/off values stay visible (D-10).
import { describe, expect, it } from 'vitest';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import { SECRET_CONFIG_KEYS, maskConfig, maskSecret, redactSecretText } from '../src/planning-repo/secret-mask.ts';

describe('maskSecret', () => {
  it('shows an empty value as (unset)', () => {
    expect(maskSecret('')).toBe('(unset)');
  });

  it('hides everything below 8 characters', () => {
    expect(maskSecret('abc')).toBe('****');
    expect(maskSecret('abcdefg')).toBe('****');
  });

  it('keeps the last four characters from 8 up', () => {
    expect(maskSecret('abcdefgh')).toBe('****efgh');
    expect(maskSecret('BSAplantedsecretvalue1234567890wxyz')).toBe('****wxyz');
  });
});

describe('SECRET_CONFIG_KEYS', () => {
  it('holds exactly the three keys GSD treats as secrets', () => {
    expect([...SECRET_CONFIG_KEYS].sort()).toEqual(['brave_search', 'exa_search', 'firecrawl']);
  });
});

describe('maskConfig', () => {
  it('leaves boolean, number and null values on secret keys unchanged and reports nothing masked', () => {
    const input = { brave_search: false, firecrawl: true, exa_search: null, other: 3 };
    const result = maskConfig(input);
    expect(result.masked).toBe(false);
    expect(result.data).toEqual(input);
    expect(maskConfig({ firecrawl: 7 })).toEqual({ data: { firecrawl: 7 }, masked: false });
  });

  it('masks a string value on a secret key and reports it', () => {
    const result = maskConfig({ brave_search: 'abcdefghij', firecrawl: true });
    expect(result).toEqual({ data: { brave_search: '****ghij', firecrawl: true }, masked: true });
  });

  it('masks an empty string as (unset) and a short one as ****', () => {
    expect(maskConfig({ brave_search: '', exa_search: 'short' }).data).toEqual({
      brave_search: '(unset)',
      exa_search: '****',
    });
  });

  it('masks a string nested under a secret key (fail closed)', () => {
    const result = maskConfig({ firecrawl: { key: 'fc-supersecretkey-9876', enabled: true } });
    expect(result.masked).toBe(true);
    expect(result.data).toEqual({ firecrawl: { key: '****9876', enabled: true } });
  });

  it('masks an array of strings under a secret key element by element', () => {
    const result = maskConfig({ exa_search: ['exa-aaaaaaaa-1111', 'tiny', 4] });
    expect(result.masked).toBe(true);
    expect(result.data).toEqual({ exa_search: ['****1111', '****', 4] });
  });

  it('does not touch a non-secret key that holds a secret-looking string', () => {
    const input = { model_profile: 'BSAplantedsecretvalue1234567890wxyz', nested: { brave_search: 'abcdefghij' } };
    const result = maskConfig(input);
    expect(result.masked).toBe(false);
    expect(result.data).toEqual(input);
  });

  it('passes a top-level array or primitive through unmasked', () => {
    expect(maskConfig(['abcdefghij'])).toEqual({ data: ['abcdefghij'], masked: false });
    expect(maskConfig('abcdefghij')).toEqual({ data: 'abcdefghij', masked: false });
    expect(maskConfig(null)).toEqual({ data: null, masked: false });
  });
});

describe('redactSecretText', () => {
  it('masks the string value of a secret key in raw JSON text and leaves the rest byte-identical', () => {
    const raw = '{\n  "model_profile": "adaptive",\n  "brave_search" :  "abcdefghij",\n  "firecrawl": true,\n}\n';
    expect(redactSecretText(raw)).toBe(
      '{\n  "model_profile": "adaptive",\n  "brave_search" :  "****ghij",\n  "firecrawl": true,\n}\n',
    );
  });

  it('masks every occurrence, including nested and repeated keys', () => {
    const raw = '{"exa_search": "aaaaaaaa1111", "x": {"firecrawl":"bbbbbbbb2222"}, "brave_search": "short"';
    expect(redactSecretText(raw)).toBe('{"exa_search": "****1111", "x": {"firecrawl":"****2222"}, "brave_search": "****"');
  });

  it('unescapes the quoted content before masking and handles escaped quotes', () => {
    expect(redactSecretText('{"brave_search": "ab\\"cdefgh\\u0041wxyz"}')).toBe('{"brave_search": "****wxyz"}');
    expect(redactSecretText('{"brave_search": ""}')).toBe('{"brave_search": "(unset)"}');
  });

  it('leaves non-string values and other keys alone', () => {
    const raw = '{"brave_search": true, "other": "abcdefghij", "firecrawl": null}';
    expect(redactSecretText(raw)).toBe(raw);
  });

  it('grows no faster than linearly on a long unterminated string', () => {
    // Growth ratio, not a millisecond budget (Pitfall 11): the unterminated string is built at size n and
    // at 8n outside the timed region; a linear scan reads about 8, a quadratic one about 64.
    const growth = measureGrowth({
      make: (n) => `{"brave_search": "${'a\\"'.repeat(Math.ceil(n / 3))}`,
      run: (raw) => void redactSecretText(raw),
    });
    expect(
      growth.ratio,
      `redactSecretText: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`,
    ).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('redactSecretText on unusual quoting (WR-01)', () => {
  it('masks a key spelled with a JSON escape', () => {
    const out = redactSecretText('{"brave\\u005fsearch":"SECRETSECRET1234",}');
    expect(out).not.toContain('SECRETSECRET1234');
    expect(out).toBe('{"brave\\u005fsearch":"****1234",}');
  });

  it('masks single-quoted JSON5-style keys and values', () => {
    const out = redactSecretText("{'brave_search': 'SECRETSECRET1234',}");
    expect(out).toBe("{'brave_search': '****1234',}");
  });

  it('masks a mix of quote styles and leaves other keys alone', () => {
    expect(redactSecretText(`{"firecrawl": 'SECRETSECRET1234', 'other': 'plain', 'exa_search': "SECRETSECRET5678"}`)).toBe(
      `{"firecrawl": '****1234', 'other': 'plain', 'exa_search': "****5678"}`,
    );
  });

  it('keeps sync after an apostrophe inside a double-quoted value', () => {
    expect(redactSecretText(`{"note": "it's", "brave_search": 'SECRETSECRET1234'}`)).toBe(
      `{"note": "it's", "brave_search": '****1234'}`,
    );
  });
});

describe('redactSecretText on truncated text', () => {
  it('masks a value cut off before its closing quote, so the part that is there does not leak', () => {
    expect(redactSecretText('{"brave_search": "abcdefghij')).toBe('{"brave_search": "****ghij');
  });
});
