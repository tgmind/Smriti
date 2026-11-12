import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryTab } from '../LibraryTab';
import { Subject, AudioItem } from '@/types';

describe('LibraryTab Apple Music Redesign', () => {
  const mockSubjects: Subject[] = [
    {
      id: 'sub-phys',
      name: 'Physics',
      icon_name: 'BookOpen',
      color_hex: '#38bdf8',
      sort_order: 1,
    },
    {
      id: 'sub-chem',
      name: 'Chemistry',
      icon_name: 'BookOpen',
      color_hex: '#f59e0b',
      sort_order: 2,
    },
  ];

  const mockAudioItems: AudioItem[] = [
    {
      id: 'audio-1',
      title: 'Gauss Law & Electric Flux',
      file_format: 'audio/mp3',
      duration_seconds: 180,
      file_size_bytes: 2048000,
      source_type: 'recorded',
      subject_id: 'sub-phys',
      key_terms: ['Flux', 'Gaussian Surface'],
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [30, 60, 45],
      is_favorite: true,
      is_downloaded_offline: true,
    },
  ];

  it('renders minimalist subject cards with Apple Music aesthetic', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // Subject titles
    expect(html).toContain('Physics');
    expect(html).toContain('Chemistry');

    // Clean lesson count in Apple Music subtitle
    expect(html).toContain('1 lesson');
    expect(html).toContain('3:00');

    // Recent lesson note preview
    expect(html).toContain('Gauss Law &amp; Electric Flux');

    // Minimal view mode toggles
    expect(html).toContain('Cards');
    expect(html).toContain('Catalog');
  });

  it('renders drill-down subject view when initialSubjectId is provided', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    expect(html).toContain('Physics');
    expect(html).toContain('Gauss Law &amp; Electric Flux');
    expect(html).toContain('View Note');
  });

  it('renders New Topic button in root view', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    expect(html).toContain('New Topic');
    expect(html).not.toContain('role="dialog"');
  });

  it('renders shadcn Card modal dialog when creating a new subject folder', () => {
    const handleCreateSubject = vi.fn();
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialCreateFolderOpen={true}
        onCreateSubject={handleCreateSubject}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // Modal dialog
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');

    // shadcn Card structure
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-title"');
    expect(html).toContain('New Subject Folder');
    expect(html).toContain('data-slot="card-description"');
    expect(html).toContain('data-slot="card-action"');
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('Folder Name');
    expect(html).toContain('Theme Color');
    expect(html).toContain('Choose Icon');
    expect(html).toContain('Preview');
    expect(html).toContain('data-slot="card-footer"');
    expect(html).toContain('Cancel');
    expect(html).toContain('Create Folder');
  });

  it('categorizes both downloaded and non-downloaded Drive audio notes subject-wise and provides individual download arrows', () => {
    const multiAudioItems: AudioItem[] = [
      {
        id: 'audio-downloaded',
        title: 'Gauss Law & Electric Flux',
        file_format: 'audio/mp3',
        duration_seconds: 180,
        file_size_bytes: 2048000,
        source_type: 'recorded',
        subject_id: 'sub-phys',
        key_terms: ['Flux'],
        created_at: new Date().toISOString(),
        audio_enhancement_applied: false,
        waveform_peaks: [30, 60, 45],
        is_favorite: true,
        is_downloaded_offline: true,
        google_drive_file_id: 'drive-phys-1',
      },
      {
        id: 'audio-in-drive',
        title: 'Maxwell Equations in Differential Form',
        file_format: 'audio/mp3',
        duration_seconds: 360,
        file_size_bytes: 4096000,
        source_type: 'recorded',
        subject_id: 'sub-phys',
        key_terms: ['Maxwell'],
        created_at: new Date().toISOString(),
        audio_enhancement_applied: true,
        waveform_peaks: [20, 50, 40],
        is_favorite: false,
        is_downloaded_offline: false,
        google_drive_file_id: 'drive-phys-2',
      },
    ];

    const html = renderToString(
      <LibraryTab
        audioItems={multiAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-phys"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
      />
    );

    // 1. Both audio notes are categorized inside the Physics subject folder
    expect(html).toContain('Gauss Law &amp; Electric Flux');
    expect(html).toContain('Maxwell Equations in Differential Form');
    expect(html).toContain('audio notes');

    // 2. Downloaded item shows OFFLINE READY and downloaded button
    expect(html).toContain('OFFLINE READY');
    expect(html).toContain('aria-label="Downloaded offline"');

    // 3. Non-downloaded item shows IN DRIVE and individual download arrow button
    expect(html).toContain('IN DRIVE');
    expect(html).toContain('aria-label="Download Maxwell Equations in Differential Form"');
    expect(html).toContain('title="Download from Google Drive for fast local playback"');
  });

  it('renders delete folder action button on subject cards when onDeleteSubject is provided', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    expect(html).toContain('title="Delete Physics folder"');
    expect(html).toContain('title="Delete Chemistry folder"');
  });

  it('strictly deduplicates subjects by name so duplicate folders are merged and not shown twice', () => {
    const duplicatedSubjects: Subject[] = [
      { id: 'sub-1', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 1 },
      { id: 'sub-2', name: 'Chemistry', icon_name: 'BookOpen', color_hex: '#f59e0b', sort_order: 2 },
      { id: 'sub-3', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 3 },
      { id: 'sub-4', name: 'general', icon_name: 'BookOpen', color_hex: '#38bdf8', sort_order: 4 },
    ];

    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={duplicatedSubjects}
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onDeleteSubject={vi.fn()}
      />
    );

    // Subject count header shows (2) unique subjects: Chemistry & General
    expect(html).toContain('(2)');
  });
});
