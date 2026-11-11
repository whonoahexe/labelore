// The quiet notice Source shows in place of the reader when a file has no text to show (Phase 12: D-07; the
// UI-SPEC Copywriting Contract). One case per FilePageKind plus the 0-byte text file. Nothing failed, so the
// tone is quiet only: never destructive, never a warning. The `text` kind is the reader's own and draws nothing.
import { FileText, Image } from 'lucide-react';
import type { FileClass } from '../../planning-repo/file-class.ts';
import {
  exactByteCount,
  fileTypeLabel,
  formatByteSize,
} from '../../presentation/file-facts.ts';
import type { FilePageKind } from '../../presentation/file-facts.ts';
import { CopyPathButton } from './copy-path-button.tsx';
import { Button } from './ui/button.tsx';

export type SourceNoticeKind = FilePageKind | 'empty';

/** The class `fileTypeLabel` reads for a notice kind (`large` reads as "Text file"). */
function fileClassOf(kind: Exclude<SourceNoticeKind, 'text' | 'empty' | 'image-over-cap'>): FileClass {
  return kind;
}

function copyOf(kind: SourceNoticeKind): { lead: string; second: string; limit: string | null } | null {
  switch (kind) {
    case 'image':
      return { lead: 'This is an image, so Source has no text to show.', second: 'View shows the picture.', limit: null };
    case 'image-over-cap':
      return {
        lead: 'This image is over 10 MiB, so Labelore does not load it.',
        second: 'Labelore does not open it in View either.',
        limit: '10 MiB limit',
      };
    case 'binary':
      return { lead: 'This file is binary, so Source has no text to show.', second: 'Labelore does not open binary files.', limit: null };
    case 'large':
      return {
        lead: 'This file is over 1 MiB, so Labelore does not read it.',
        second: 'Open it in an editor to see its text.',
        limit: '1 MiB limit',
      };
    case 'listed':
      return {
        lead: 'This file is listed by name only, so Source has no text to show.',
        second: 'Labelore never runs or opens these files.',
        limit: null,
      };
    case 'empty':
      return { lead: 'This file is empty.', second: 'There is no text to show.', limit: null };
    case 'text':
      return null;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function typeLabelOf(kind: SourceNoticeKind, name: string): string {
  switch (kind) {
    case 'image':
    case 'image-over-cap':
      return fileTypeLabel(name, 'image');
    case 'binary':
    case 'large':
    case 'listed':
      return fileTypeLabel(name, fileClassOf(kind));
    case 'empty':
    case 'text':
      return 'Text file';
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function SourceNotice({
  kind,
  name,
  path,
  realPath,
  sizeBytes,
  onOpenView,
}: {
  kind: SourceNoticeKind;
  name: string;
  path: string;
  realPath?: string;
  sizeBytes: number | null;
  onOpenView?: () => void;
}): React.JSX.Element | null {
  const copy = copyOf(kind);
  if (copy === null) return null;
  const isImage = kind === 'image' || kind === 'image-over-cap';
  const size = kind === 'empty' ? '0 bytes' : sizeBytes === null ? null : formatByteSize(sizeBytes);
  const facts = [typeLabelOf(kind, name), size, copy.limit].filter((fact): fact is string => fact !== null);
  return (
    <aside className="notice source-notice" role="status">
      <span className="source-notice-glyph" aria-hidden="true">
        {isImage ? <Image /> : <FileText />}
      </span>
      <p className="source-notice-lead">{copy.lead}</p>
      <p>{copy.second}</p>
      <p className="source-notice-facts" title={sizeBytes === null ? undefined : exactByteCount(sizeBytes)}>
        {facts.join(' · ')}
      </p>
      <div className="source-notice-actions">
        {kind === 'image' && onOpenView ? (
          <Button type="button" size="xs" variant="outline" onClick={onOpenView}>
            Open View
          </Button>
        ) : null}
        <CopyPathButton path={path} {...(realPath === undefined ? {} : { realPath })} label="Copy path" />
      </div>
    </aside>
  );
}
