import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LibraryTab } from '../LibraryTab';
import { Subject, AudioItem } from '@/types';

describe('LibraryTab Apple Music Redesign', () => {
  const mockSubjects: Subject[] = [
    {
      id: 'sub-phys',
      name: 'Physics',
      icon_name: 'Atom',
      color_hex: '#38bdf8',
      sort_order: 1,
    },
    {
      id: 'sub-chem',
      name: 'Chemistry',
      icon_name: 'FlaskConical',
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
});
