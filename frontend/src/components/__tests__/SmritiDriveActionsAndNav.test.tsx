import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryTab } from '../LibraryTab';
import { Navigation } from '../Navigation';
import { AudioItem, Subject } from '../../types';

describe('Smriti Library UI, Drive Actions & Navigation', () => {
  const mockSubjects: Subject[] = [
    {
      id: 'sub-physics',
      name: 'Physics',
      icon_name: 'Atom',
      color_hex: '#3B82F6',
      sort_order: 0,
      google_drive_folder_id: 'drive_folder_physics_123',
    },
    {
      id: 'sub-history',
      name: 'History',
      icon_name: 'Book',
      color_hex: '#EAB308',
      sort_order: 1,
      google_drive_folder_id: 'drive_folder_history_456',
    },
  ];

  const mockAudioItems: AudioItem[] = [
    {
      id: 'audio-1',
      title: 'Quantum Electrodynamics',
      subject_id: 'sub-physics',
      subject_name: 'Physics',
      duration_seconds: 320,
      source_type: 'recorded',
      file_format: 'mp3',
      file_size_bytes: 1024,
      audio_enhancement_applied: false,
      waveform_peaks: [],
      google_drive_file_id: 'drive_file_qed_789',
      key_terms: ['photons', 'electrons'],
      is_favorite: true,
      is_downloaded_offline: true,
      created_at: '2026-03-10T10:00:00Z',
    },
    {
      id: 'audio-2',
      title: 'Wave Particle Duality',
      subject_id: 'sub-physics',
      subject_name: 'Physics',
      duration_seconds: 180,
      source_type: 'recorded',
      file_format: 'mp3',
      file_size_bytes: 1024,
      audio_enhancement_applied: false,
      waveform_peaks: [],
      google_drive_file_id: 'drive_file_wpd_101',
      key_terms: ['de broglie'],
      is_favorite: false,
      is_downloaded_offline: false,
      created_at: '2026-03-11T10:00:00Z',
    },
  ];

  it('renders "Smriti Library" title and "Simplest Vedic Tool For Learning Anything." tagline', () => {
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

    expect(html).toContain('Smriti Library');
    expect(html).toContain('Simplest Vedic Tool For Learning Anything.');
    expect(html).not.toContain('Study Library');
  });

  it('verifies notification bell button is cleanly removed from top header', () => {
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

    expect(html).not.toContain('aria-label="Daily Study Reminders"');
    expect(html).not.toContain('Daily Revision Reminders');
  });

  it('renders Subject Folders showcase container with distinct subtle gradient styling', () => {
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

    // Outer container surface styling
    expect(html).toContain('from-indigo-50/75 via-slate-50/90 to-indigo-50/40');
    expect(html).toContain('border-indigo-100/90');
    expect(html).toContain('rounded-3xl');

    // Inner folder cards styling
    expect(html).toContain('bg-white/95');
    expect(html).toContain('hover:border-indigo-200');
  });

  it('renders three-dots overflow menu button on folder cards', () => {
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

    expect(html).toContain('title="Folder options for Physics"');
    expect(html).toContain('aria-label="Folder options for Physics"');
    expect(html).toContain('title="Folder options for History"');
  });

  it('renders folder track list inside folder drilldown with three-dots menu buttons for tracks', () => {
    const html = renderToString(
      <LibraryTab
        audioItems={mockAudioItems}
        subjects={mockSubjects}
        initialSubjectId="sub-physics"
        onPlayAudio={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleOffline={vi.fn()}
        onGoToRecord={vi.fn()}
        onRenameAudio={vi.fn()}
        onCopyAudio={vi.fn()}
        onMoveAudio={vi.fn()}
        onDeleteAudio={vi.fn()}
      />
    );

    expect(html).toContain('title="More actions"');
    expect(html).toContain('aria-label="More actions for Quantum Electrodynamics"');
    expect(html).toContain('aria-label="More actions for Wave Particle Duality"');
  });

  it('Navigation dock folder icon renders with title "Library (Home)" and aria-label "Home"', () => {
    const html = renderToString(
      <Navigation
        currentTab="profile"
        onSelectTab={vi.fn()}
      />
    );

    expect(html).toContain('title="Library (Home)"');
    expect(html).toContain('aria-label="Home"');
  });
});
