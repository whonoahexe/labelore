// The one shared set of file facts the drawer badge, the image page and the File details card read
// (Phase 7: D-08, D-09; the UI-SPEC Copywriting Contract). Pure: names, sizes and classes in, strings
// out. No React and no node imports, so the server, the web and the tests all use the same words.
import { extensionOf } from '../planning-repo/file-class.ts';
import type { FileClass } from '../planning-repo/file-class.ts';

/** The text after the last slash of a path. */
export function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/**
 * A byte count as the UI writes it: under 1024 bytes `{n} B`, then one decimal in KB, MB and GB with
 * base 1024 and a trailing `.0` dropped (49,357 is `48.2 KB`, 2,097,152 is `2 MB`). A value that
 * rounds up to 1024 of a unit is written in the next unit (1,048,575 is `1 MB`).
 */
export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  let rounded = Math.round(value * 10) / 10;
  if (rounded >= 1024 && unit < UNITS.length - 1) {
    rounded = 1;
    unit += 1;
  }
  return `${rounded} ${UNITS[unit]}`;
}

const TYPE_LABELS: Readonly<Record<string, string>> = {
  png: 'PNG image',
  jpg: 'JPEG image',
  jpeg: 'JPEG image',
  gif: 'GIF image',
  webp: 'WebP image',
  avif: 'AVIF image',
  bmp: 'BMP image',
  svg: 'SVG image',
  ico: 'Icon image',
};

/** The type label for a file, keyed by lowercase extension (the UI-SPEC table). */
export function fileTypeLabel(name: string, fileClass: FileClass): string {
  if (fileClass === 'large') return 'Text file';
  const ext = extensionOf(name);
  if (ext === null) return 'Binary file';
  return TYPE_LABELS[ext] ?? `Binary file (.${ext})`;
}

/**
 * The image page's one-line facts: `{Type} · {size}`, then ` · {w} × {h} px` once the browser reports
 * the size, or ` · Dimensions unknown` when it reports 0, or the image failed. `null` is still loading.
 */
export function imageFactsLine(
  typeLabel: string,
  sizeBytes: number,
  dimensions: { width: number; height: number } | 'unknown' | null,
): string {
  const base = `${typeLabel} · ${formatByteSize(sizeBytes)}`;
  if (dimensions === null) return base;
  if (dimensions === 'unknown' || dimensions.width <= 0 || dimensions.height <= 0) {
    return `${base} · Dimensions unknown`;
  }
  return `${base} · ${dimensions.width} × ${dimensions.height} px`;
}

/** The image-bytes route for an artifact's readable URL (never a path). */
export function imageBytesUrl(url: string): string {
  return `/api/files?route=${encodeURIComponent(url)}`;
}
