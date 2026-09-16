import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { stripEmoji } from '../../src/web/pages/strip-emoji.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('stripEmoji', () => {
  it('strips common pictographs and emojis from text', () => {
    expect(stripEmoji('🚀 Launch the rocket')).toBe('Launch the rocket');
    expect(stripEmoji('Fix issue 🐛 in module')).toBe('Fix issue in module');
    expect(stripEmoji('Done! 🎉')).toBe('Done!');
    expect(stripEmoji('✅ All tests pass')).toBe('All tests pass');
  });

  it('strips symbols with emoji presentation, flags, skin tones, and keycaps', () => {
    expect(stripEmoji('⚠️ Warning: disk full')).toBe('Warning: disk full');
    expect(stripEmoji('Warning ⚠️: disk full')).toBe('Warning: disk full');
    expect(stripEmoji('🇺🇸 English flag')).toBe('English flag');
    expect(stripEmoji('Great job 👍🏽 team')).toBe('Great job team');
    expect(stripEmoji('1️⃣ Step one')).toBe('Step one');
    expect(stripEmoji('Time ⌛ wait')).toBe('Time wait');
  });

  it('strips compound ZWJ emoji sequences', () => {
    expect(stripEmoji('👨‍👩‍👧‍👦 Family reunion')).toBe('Family reunion');
    expect(stripEmoji('Technologist 👨‍💻 coding')).toBe('Technologist coding');
  });

  it('preserves regular numbers, punctuation, hashes, and symbols', () => {
    expect(stripEmoji('Plan 01-02 is ready to begin.')).toBe('Plan 01-02 is ready to begin.');
    expect(stripEmoji('Issue #42: 100% completed for $50')).toBe('Issue #42: 100% completed for $50');
    expect(stripEmoji('Status (blocking-human) [test] <tag>')).toBe('Status (blocking-human) [test] <tag>');
  });

  it('handles empty and whitespace strings gracefully', () => {
    expect(stripEmoji('')).toBe('');
    expect(stripEmoji('   ')).toBe('');
  });
});

describe('dashboard-page emoji sanitization contract', () => {
  it('imports and applies stripEmoji to next-primary and attention panel descriptions', async () => {
    const page = await source('src/web/pages/dashboard-page.tsx');
    expect(page).toMatch(/import \{.*stripEmoji.*\} from '\.\/strip-emoji\.ts';/);
    expect(page).toContain('stripEmoji(rawItem.description)');
    expect(page).toContain('<p>{stripMarkdown(stripEmoji(item.detail))}</p>');
    // Ensure the G2-08 invariant that prevents slice/substr truncation is still intact
    expect(page).toContain('<p>{item.description}</p>');
    expect(page).not.toMatch(/item\.description\.(slice|substring|substr)\(/);
  });
});

describe('roadmap-page emoji sanitization contract', () => {
  it('strips emoji from an archived milestone name before display', async () => {
    // Archived milestones are named after the ROADMAP.md <summary> text verbatim
    // (src/planning-repo/assemble.ts), which frequently carries an authored emoji,
    // e.g. "<summary>✅ v1.0 Portal (v1.0 Phases 1-4) — SHIPPED 2026-07-26</summary>".
    const page = await source('src/web/pages/roadmap-page.tsx');
    expect(page).toMatch(/import \{ stripEmoji \} from '\.\/strip-emoji\.ts';/);
    expect(page).toContain('<strong>{stripEmoji(milestone.name)}</strong>');
  });
});
