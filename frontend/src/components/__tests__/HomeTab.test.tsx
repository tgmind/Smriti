import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HomeTab } from '../HomeTab';
import { AudioItem, Subject } from '../../types';

describe('HomeTab Component Navigation & Mappings', () => {
  const mockAudio: AudioItem[] = [
    {
      id: 'aud-test-1',
      title: 'Thermodynamics Carnot Cycle',
      subject_id: 'sub-1',
      subject_name: 'Physics',
      duration_seconds: 120,
      source_type: 'recorded',
      file_format: 'm4a',
      file_size_bytes: 1000000,
      audio_enhancement_applied: true,
      waveform_peaks: [20, 40, 60, 80],
      key_terms: ['Carnot', 'Entropy'],
      is_favorite: true,
      is_downloaded_offline: true,
      created_at: new Date().toISOString()
    }
  ];

  const mockSubjects: Subject[] = [
    { id: 'sub-1', name: 'Physics', icon_name: 'Atom', color_hex: '#38bdf8', sort_order: 1 },
    { id: 'sub-2', name: 'Chemistry', icon_name: 'FlaskConical', color_hex: '#f59e0b', sort_order: 2 }
  ];

  it('renders correctly with properly mapped Folders, Drive, and Record action buttons', () => {
    const html = renderToString(
      <HomeTab
        recentAudio={mockAudio}
        subjects={mockSubjects}
        onPlayAudio={vi.fn()}
        onGoToRecord={vi.fn()}
        onNavigateToLibrary={vi.fn()}
        onNavigateToAccount={vi.fn()}
      />
    );

    // Verify action chips with correct titles
    expect(html).toContain('Open Audio Recorder');
    expect(html).toContain('Open Library &amp; Subject Folders');
    expect(html).toContain('View Sovereign Google Drive Storage');

    // Verify subject folders container & interactive subject buttons
    expect(html).toContain('Subject Folders');
    expect(html).toContain('Physics');
    expect(html).toContain('Chemistry');
    expect(html).toContain('Biology');
    expect(html).toContain('Math');

    // Verify Continue Listening studio card
    expect(html).toContain('Continue Listening');
    expect(html).toContain('Thermodynamics Carnot Cycle');
  });
});
