// The shared file facts (Phase 7: D-08, D-09; UI-SPEC Copywriting Contract): sizes, type labels, the
// drawer badge, the folder, the facts line, the bytes URL and the page kind, one table row per rule.
import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES } from '../../src/planning-repo/file-class.ts';
import type { FileClass } from '../../src/planning-repo/file-class.ts';
import {
  badgeExtensionOf,
  exactByteCount,
  fileBadgeOf,
  fileFolderOf,
  fileNameOf,
  filePageKindOf,
  fileTypeLabel,
  formatByteSize,
  imageBytesUrl,
  imageFactsLine,
} from '../../src/presentation/file-facts.ts';

describe('formatByteSize', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [49357, '48.2 KB'],
    [1048575, '1 MB'],
    [1048576, '1 MB'],
    [2097152, '2 MB'],
    [2516582, '2.4 MB'],
    [10485760, '10 MB'],
    [1073741824, '1 GB'],
  ])('%i bytes reads %s', (bytes, text) => {
    expect(formatByteSize(bytes)).toBe(text);
  });
});

describe('exactByteCount', () => {
  it.each([
    [48213, '48,213 bytes'],
    [1, '1 byte'],
    [0, '0 bytes'],
  ])('%i reads %s', (bytes, text) => {
    expect(exactByteCount(bytes)).toBe(text);
  });
});

describe('fileTypeLabel', () => {
  it.each([
    ['kiln.png', 'image', 'PNG image'],
    ['KILN.PNG', 'image', 'PNG image'],
    ['a.jpg', 'image', 'JPEG image'],
    ['a.jpeg', 'image', 'JPEG image'],
    ['a.gif', 'image', 'GIF image'],
    ['a.webp', 'image', 'WebP image'],
    ['a.avif', 'image', 'AVIF image'],
    ['a.bmp', 'image', 'BMP image'],
    ['a.svg', 'image', 'SVG image'],
    ['a.ico', 'image', 'Icon image'],
    ['a.pdf', 'binary', 'PDF document'],
    ['a.zip', 'binary', 'ZIP archive'],
    ['a.gz', 'binary', 'GZip archive'],
    ['a.tar', 'binary', 'Tar archive'],
    ['a.woff', 'binary', 'Font (WOFF)'],
    ['font.woff2', 'binary', 'Font (WOFF2)'],
    ['a.ttf', 'binary', 'Font (TTF)'],
    ['a.otf', 'binary', 'Font (OTF)'],
    ['a.eot', 'binary', 'Font (EOT)'],
    ['a.mp3', 'binary', 'MP3 audio'],
    ['a.mp4', 'binary', 'MP4 video'],
    ['a.mov', 'binary', 'QuickTime video'],
    ['a.webm', 'binary', 'WebM video'],
    ['a.wasm', 'binary', 'WebAssembly module'],
    ['a.sqlite', 'binary', 'Database file'],
    ['a.db', 'binary', 'Database file'],
    ['a.exe', 'binary', 'Executable'],
    ['kiln-curve.dat', 'binary', 'Binary file (.dat)'],
    ['kiln-log', 'binary', 'Binary file'],
    ['data.json', 'large', 'Text file'],
  ] as [string, FileClass, string][])('%s (%s) reads %s', (name, fileClass, label) => {
    expect(fileTypeLabel(name, fileClass)).toBe(label);
  });
});

describe('the drawer badge', () => {
  it.each([
    ['kiln-floor.png', 'PNG'],
    ['font.woff2', 'WOFF2'],
    ['db.sqlite', 'FILE'],
    ['kiln-log', 'FILE'],
    ['.continue-here', 'FILE'],
  ])('badgeExtensionOf(%s) is %s', (name, ext) => {
    expect(badgeExtensionOf(name)).toBe(ext);
  });

  it('fileBadgeOf gives the visible text and its spoken twin', () => {
    expect(fileBadgeOf('kiln-floor.png', 'image', 49357)).toEqual({
      visible: 'PNG · 48.2 KB',
      spoken: ', PNG image, 48.2 KB',
    });
    expect(fileBadgeOf('kiln-log', 'binary', 12)).toEqual({
      visible: 'FILE · 12 B',
      spoken: ', Binary file, 12 B',
    });
  });
});

describe('names and folders', () => {
  it.each([
    ['.planning/ui-reviews/screenshots/glaze-panel.png', 'glaze-panel.png', '.planning/ui-reviews/screenshots'],
    ['.planning/HANDOFF.json', 'HANDOFF.json', '.planning'],
  ])('%s', (path, name, folder) => {
    expect(fileNameOf(path)).toBe(name);
    expect(fileFolderOf(path)).toBe(folder);
  });
});

describe('imageFactsLine', () => {
  it.each([
    [null, 'PNG image · 48.2 KB'],
    [{ width: 1, height: 1 }, 'PNG image · 48.2 KB · 1 × 1 px'],
    [{ width: 0, height: 12 }, 'PNG image · 48.2 KB · Dimensions unknown'],
    [{ width: 12, height: 0 }, 'PNG image · 48.2 KB · Dimensions unknown'],
    ['unknown' as const, 'PNG image · 48.2 KB · Dimensions unknown'],
  ])('%j reads %s', (dimensions, text) => {
    expect(imageFactsLine('PNG image', 49357, dimensions)).toBe(text);
  });
});

describe('imageBytesUrl', () => {
  it('encodes a URL once more when it already holds a percent escape', () => {
    const url = '/notes/glaze%20%2312.png';
    const bytesUrl = imageBytesUrl(url);
    expect(bytesUrl.startsWith('/api/files?route=')).toBe(true);
    expect(new URL(bytesUrl, 'http://localhost').searchParams.get('route')).toBe(url);
  });
});

describe('filePageKindOf', () => {
  it.each([
    ['text', 10, 'text'],
    ['image', MAX_IMAGE_BYTES, 'image'],
    ['image', MAX_IMAGE_BYTES + 1, 'image-over-cap'],
    ['binary', 10, 'binary'],
    ['large', 2_000_000, 'large'],
  ] as [FileClass, number, string][])('%s at %i bytes is %s', (fileClass, size, kind) => {
    expect(filePageKindOf(fileClass, size)).toBe(kind);
  });
});
