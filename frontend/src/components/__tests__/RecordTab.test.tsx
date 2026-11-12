import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { RecordTab } from '../RecordTab';
import { Subject, UploadProgressState } from '@/types';

describe('RecordTab - Google Drive Upload Progress Architecture', () => {
  const mockSubjects: Subject[] = [
    {
      id: 'sub-bio',
      name: 'Biology',
      icon_name: 'BookOpen',
      color_hex: '#10b981',
      sort_order: 1
    },
    {
      id: 'sub-math',
      name: 'Mathematics',
      icon_name: 'BookOpen',
      color_hex: '#a855f7',
      sort_order: 2
    }
  ];

  it('renders review screen with Google Drive Backup card when drive is connected', () => {
    const html = renderToString(
      <RecordTab
        subjects={mockSubjects}
        initialState="review"
        initialTitle="Thermodynamics Lesson"
        isDriveConnected={true}
        onSaveAudio={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Title and sections
    expect(html).toContain('Review &amp; Organize');
    expect(html).toContain('Thermodynamics Lesson');
    expect(html).toContain('Neural DSP Voice Clarity');

    // Google Drive Backup card
    expect(html).toContain('Google Drive Backup');
    expect(html).toContain('CONNECTED');
    expect(html).toContain('aria-label="Toggle Google Drive Sync"');

    // Save button
    expect(html).toContain('Save Audio Note');
    expect(html).toContain('Discard');
  });

  it('renders connect callout when Google Drive is disconnected', () => {
    const html = renderToString(
      <RecordTab
        subjects={mockSubjects}
        initialState="review"
        initialTitle="Organic Chemistry"
        isDriveConnected={false}
        onSaveAudio={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(html).toContain('Google Drive Backup');
    expect(html).not.toContain('CONNECTED');
    expect(html).toContain('Connect Drive for free cloud storage backup');
    expect(html).toContain('Connect');
  });

  it('renders modern aesthetic progress bar with actual percentage, bytes, and status during Drive upload', () => {
    const activeProgress: UploadProgressState = {
      stage: 'uploading',
      percent: 68,
      loadedBytes: 1887436, // ~1.8 MB
      totalBytes: 2726297,  // ~2.6 MB
      message: 'Uploading to Google Drive (68%)...'
    };

    const html = renderToString(
      <RecordTab
        subjects={mockSubjects}
        initialState="review"
        initialTitle="Wave Optics &amp; Interference"
        isDriveConnected={true}
        initialUploadProgress={activeProgress}
        initialIsSaving={true}
        onSaveAudio={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Role and live announcement
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');

    // Real percentage pill
    expect(html).toContain('data-testid="upload-percentage"');
    expect(html).toContain('68%');

    // Real Progressbar element
    expect(html).toContain('data-testid="upload-progress-bar"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="68"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('width:68%');

    // Real-time byte metrics
    expect(html).toContain('1.80 MB');
    expect(html).toContain('2.60 MB');
    expect(html).toContain('Real-time transfer');

    // Title and message
    expect(html).toContain('Saving to Google Drive');
    expect(html).toContain('Uploading to Google Drive (68%)...');

    // Button label reflects upload status
    expect(html).toContain('Saving to Drive (68%)');
  });

  it('renders completed status when Google Drive upload is done', () => {
    const completedProgress: UploadProgressState = {
      stage: 'done',
      percent: 100,
      loadedBytes: 3145728,
      totalBytes: 3145728,
      message: 'Successfully backed up to Google Drive!'
    };

    const html = renderToString(
      <RecordTab
        subjects={mockSubjects}
        initialState="review"
        initialTitle="Quantum Mechanics"
        isDriveConnected={true}
        initialUploadProgress={completedProgress}
        initialIsSaving={true}
        onSaveAudio={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(html).toContain('Backup Complete');
    expect(html).toContain('100%');
    expect(html).toContain('3.00 MB');
    expect(html).toContain('Synced to Drive');
    expect(html).toContain('Saved &amp; Uploaded!');
  });
});
