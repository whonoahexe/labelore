/**
 * Strips inline Markdown delimiters (bold, italic, code backticks, strikethrough, links)
 * from text, normalising resulting whitespace while preserving intra-word characters and arithmetic.
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Replace markdown links [label](url) with label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip backticks
    .replace(/`+/g, '')
    // Replace bold + italic ***text***
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    // Replace bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Replace leftover double/triple asterisks
    .replace(/\*{2,}/g, '')
    // Replace single asterisk italic *text* when not surrounded by spaces
    .replace(/(?<=^|[\s(])\*([^*\s][^*]*[^*\s]|[^*\s])\*(?=[\s).,!?:]|$)/g, '$1')
    // Replace bold __text__
    .replace(/(?<=^|[\s(])__([^_]+)__(?=[\s).,!?:]|$)/g, '$1')
    // Replace single underscore italic _text_ when not intra-word
    .replace(/(?<=^|[\s(])_([^_]+)_(?=[\s).,!?:]|$)/g, '$1')
    // Replace strikethrough ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Normalize spaces
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
