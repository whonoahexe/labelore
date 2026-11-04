// Phase 10 (10-05): the fence-aware H2 and H3 splitter every Phase 10 extractor uses. splitSections in
// markdown-sections.ts carries no fence state, so a `##` line inside a code block starts a section there
// (RESEARCH Pitfall 2); this scanner must not.
import { describe, expect, it } from 'vitest';
import { splitFencedSections } from '../src/planning-repo/handlers/fenced-sections.ts';

const headings = (body: string) => splitFencedSections(body).map((s) => `${s.level}:${s.heading}`);

describe('splitFencedSections', () => {
  it('finds H2 and H3 headings in order, with their line numbers', () => {
    const body = ['# Title', '', '## One', 'text', '### Sub', 'text', '## Two', ''].join('\n');
    const sections = splitFencedSections(body);
    expect(sections.map((s) => [s.level, s.heading, s.startLine])).toEqual([
      [2, 'One', 2],
      [3, 'Sub', 4],
      [2, 'Two', 6],
    ]);
  });

  it('ends an H2 at the next H2 (its H3s stay inside) and an H3 at the next H2 or H3', () => {
    const lines = ['## A', '### A1', 'x', '### A2', 'y', '## B', 'z'];
    const [a, a1, a2, b] = splitFencedSections(lines.join('\n'));
    expect([a.startLine, a.endLine]).toEqual([0, 5]);
    expect([a1.startLine, a1.endLine]).toEqual([1, 3]);
    expect([a2.startLine, a2.endLine]).toEqual([3, 5]);
    expect([b.startLine, b.endLine]).toEqual([5, 7]);
  });

  it('does not start a section at a line that begins with two hashes inside a backtick fence', () => {
    const body = ['## Real', '```text', '## not a heading', '### nor this', '```', '## Also real'].join('\n');
    expect(headings(body)).toEqual(['2:Real', '2:Also real']);
  });

  it('honours tilde fences and indented fence markers', () => {
    const body = ['## A', '~~~', '## no', '~~~', '- item', '  ```', '  ## no either', '  ```', '## B'].join('\n');
    expect(headings(body)).toEqual(['2:A', '2:B']);
  });

  it('closes a four-backtick fence only at a run of at least four, so three backticks stay inside', () => {
    const body = ['## A', '````md', '```', '## inside', '```', '````', '## B'].join('\n');
    expect(headings(body)).toEqual(['2:A', '2:B']);
  });

  it('does not close a fence with a different character or a shorter run', () => {
    const body = ['## A', '```', '~~~', '## still inside', '``', '## B'].join('\n');
    expect(headings(body)).toEqual(['2:A']);
  });

  it('runs an unclosed fence to the end of the body', () => {
    const body = ['## A', '```', '## swallowed', '## also swallowed'].join('\n');
    expect(headings(body)).toEqual(['2:A']);
    expect(splitFencedSections(body)[0].endLine).toBe(4);
  });

  it('ignores level 1 and level 4 headings and a hash line with no text', () => {
    const body = ['# H1', '#### H4', '##', '## ', '##NoSpace', '## Yes'].join('\n');
    expect(headings(body)).toEqual(['2:Yes']);
  });

  it('strips a closing hash run and trailing carriage returns from the heading text', () => {
    expect(headings('## Title ##\r\n### Other\r\n')).toEqual(['2:Title', '3:Other']);
  });

  it('caps the heading text at 300 characters and the section count at 400', () => {
    const long = splitFencedSections(`## ${'x'.repeat(500)}`);
    expect(long[0].heading).toHaveLength(300);
    const many = splitFencedSections(Array.from({ length: 1000 }, (_, i) => `## S${i}`).join('\n'));
    expect(many).toHaveLength(400);
    expect(many[399].endLine).toBe(1000);
  });

  it('ignores everything past 250,000 characters', () => {
    const body = `${'a\n'.repeat(125_000)}## Late\n`;
    expect(splitFencedSections(body)).toEqual([]);
  });

  it('returns nothing for an empty body', () => {
    expect(splitFencedSections('')).toEqual([]);
  });
});
