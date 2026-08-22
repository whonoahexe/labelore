// Shared title-derivation helper: a frontmatter `title` field wins when present and non-empty,
// otherwise the document's first `# ` heading, otherwise the path itself.
export function deriveTitleFromHeading(content: string, path: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  return path;
}

export function deriveTitle(frontmatterData: Record<string, unknown>, body: string, path: string): string {
  if (typeof frontmatterData.title === 'string' && frontmatterData.title.length > 0) {
    return frontmatterData.title;
  }
  return deriveTitleFromHeading(body, path);
}
