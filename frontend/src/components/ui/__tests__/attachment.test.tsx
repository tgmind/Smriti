import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
  AttachmentGroup
} from '../attachment';
import { FileAudio, RefreshCw, X } from 'lucide-react';

describe('Attachment Component (shadcn/ui style)', () => {
  it('renders standard done attachment with media, content, and actions', () => {
    const html = renderToString(
      <Attachment state="done" size="default">
        <AttachmentMedia variant="icon">
          <FileAudio />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>quantum-physics-lecture.m4a</AttachmentTitle>
          <AttachmentDescription>M4A · 4.2 MB · Synced</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Remove item">
            <X />
          </AttachmentAction>
        </AttachmentActions>
        <AttachmentTrigger aria-label="Play quantum-physics-lecture.m4a" />
      </Attachment>
    );

    expect(html).toContain('quantum-physics-lecture.m4a');
    expect(html).toContain('M4A · 4.2 MB · Synced');
    expect(html).toContain('aria-label="Remove item"');
    expect(html).toContain('aria-label="Play quantum-physics-lecture.m4a"');
    expect(html).toContain('data-state="done"');
  });

  it('renders uploading attachment with state and pulsing title', () => {
    const html = renderToString(
      <Attachment state="uploading" size="sm">
        <AttachmentMedia variant="icon">
          <RefreshCw className="animate-spin" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>uploading-derivation.m4a</AttachmentTitle>
          <AttachmentDescription>Uploading 65% · Google Drive</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
    );

    expect(html).toContain('uploading-derivation.m4a');
    expect(html).toContain('Uploading 65%');
    expect(html).toContain('data-state="uploading"');
    expect(html).toContain('animate-pulse');
  });

  it('renders attachment group with role="group"', () => {
    const html = renderToString(
      <AttachmentGroup aria-label="Drive Uploads">
        <Attachment size="xs">
          <AttachmentContent>
            <AttachmentTitle>clip1.m4a</AttachmentTitle>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('clip1.m4a');
  });
});
