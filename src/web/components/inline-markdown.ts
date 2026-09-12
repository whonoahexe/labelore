import React, { type ReactNode } from 'react';

interface Rule {
  type: 'code' | 'strong-em' | 'strong' | 'em' | 'strike';
  regex: RegExp;
}

const RULES: Rule[] = [
  { type: 'strong-em', regex: /\*\*\*(?!\s)([^\n]+?)(?<!\s)\*\*\*/ },
  { type: 'code', regex: /`([^`\n]+)`/ },
  { type: 'strong', regex: /\*\*(?!\s)([^\n]+?)(?<!\s)\*\*/ },
  {
    type: 'strong',
    regex: /(?<=^|[\s(])__(?!\s)([^\n_]+?)(?<!\s)__(?=$|[\s),.:;!?])/,
  },
  { type: 'strike', regex: /~~(?!\s)([^\n~]+?)(?<!\s)~~/ },
  { type: 'em', regex: /\*(?!\s)([^\n*]+?)(?<!\s)\*/ },
  {
    type: 'em',
    regex: /(?<=^|[\s(])_(?!\s)([^\n_]+?)(?<!\s)_(?=$|[\s),.:;!?])/,
  },
];

export function parseInlineMarkdown(text: string, keyPrefix = 'im'): ReactNode[] {
  if (!text) return [];
  const nodes: ReactNode[] = [];
  let remaining = text;
  let counter = 0;

  while (remaining.length > 0) {
    let bestMatch: {
      type: 'code' | 'strong-em' | 'strong' | 'em' | 'strike';
      index: number;
      length: number;
      content: string;
    } | null = null;

    for (const rule of RULES) {
      const match = rule.regex.exec(remaining);
      if (match && match.index !== undefined) {
        if (!bestMatch || match.index < bestMatch.index) {
          bestMatch = {
            type: rule.type,
            index: match.index,
            length: match[0].length,
            content: match[1],
          };
        }
      }
    }

    if (!bestMatch) {
      nodes.push(remaining);
      break;
    }

    if (bestMatch.index > 0) {
      nodes.push(remaining.slice(0, bestMatch.index));
    }

    const key = `${keyPrefix}-${counter++}`;
    switch (bestMatch.type) {
      case 'code':
        nodes.push(React.createElement('code', { key }, bestMatch.content));
        break;
      case 'strong-em':
        nodes.push(
          React.createElement(
            'strong',
            { key },
            React.createElement(
              'em',
              { key: `${key}-em` },
              ...parseInlineMarkdown(bestMatch.content, `${key}-se`),
            ),
          ),
        );
        break;
      case 'strong':
        nodes.push(
          React.createElement(
            'strong',
            { key },
            ...parseInlineMarkdown(bestMatch.content, `${key}-s`),
          ),
        );
        break;
      case 'em':
        nodes.push(
          React.createElement(
            'em',
            { key },
            ...parseInlineMarkdown(bestMatch.content, `${key}-e`),
          ),
        );
        break;
      case 'strike':
        nodes.push(
          React.createElement(
            'del',
            { key },
            ...parseInlineMarkdown(bestMatch.content, `${key}-d`),
          ),
        );
        break;
    }

    remaining = remaining.slice(bestMatch.index + bestMatch.length);
  }

  return nodes;
}

export function InlineMarkdown({ text }: { text: string }): React.JSX.Element | null {
  if (!text) return null;
  return React.createElement(React.Fragment, null, ...parseInlineMarkdown(text));
}
