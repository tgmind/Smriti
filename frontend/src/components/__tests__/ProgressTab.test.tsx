import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ProgressTab } from '../ProgressTab';
import { AudioItem } from '@/types';

describe('ProgressTab Verified Play Count Mastery Component', () => {
  const mockAudioItems: AudioItem[] = [
    {
      id: 'aud-mastered',
      title: 'Thermodynamics Second Law',
      file_format: 'm4a',
      duration_seconds: 180,
      file_size_bytes: 2000000,
      source_type: 'recorded',
      subject_id: 'sub-physics',
      subject_name: 'Physics',
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [10, 20, 30],
      key_terms: ['Entropy'],
      is_favorite: true,
      is_downloaded_offline: true,
      play_count: 85
    },
    {
      id: 'aud-in-memory',
      title: 'Eigenvalues and Eigenvectors',
      file_format: 'm4a',
      duration_seconds: 240,
      file_size_bytes: 3000000,
      source_type: 'recorded',
      subject_id: 'sub-math',
      subject_name: 'Mathematics',
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [20, 40, 60],
      key_terms: ['Linear Algebra'],
      is_favorite: false,
      is_downloaded_offline: false,
      play_count: 55
    },
    {
      id: 'aud-building',
      title: 'Organic Reaction Mechanisms',
      file_format: 'm4a',
      duration_seconds: 150,
      file_size_bytes: 1800000,
      source_type: 'recorded',
      subject_id: 'sub-chem',
      subject_name: 'Chemistry',
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [15, 25, 35],
      key_terms: ['Nucleophile'],
      is_favorite: false,
      is_downloaded_offline: false,
      play_count: 32
    },
    {
      id: 'aud-not-learned',
      title: 'Introduction to Cell Biology',
      file_format: 'm4a',
      duration_seconds: 120,
      file_size_bytes: 1500000,
      source_type: 'recorded',
      subject_id: 'sub-bio',
      subject_name: 'Biology',
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [5, 10, 15],
      key_terms: ['Mitochondria'],
      is_favorite: false,
      is_downloaded_offline: false,
      play_count: 7
    }
  ];

  it('renders all four mastery tier cards with exact labels and metrics', () => {
    const html = renderToString(
      <ProgressTab
        audioItems={mockAudioItems}
        dailyStats={[]}
      />
    );

    // Verify 4 Tier Labels are present
    expect(html).toContain('Learned by Heart');
    expect(html).toContain('In Memory');
    expect(html).toContain('Building Memory');
    expect(html).toContain('Not Still Learned');

    // Verify Tier Ranges are present
    expect(html).toContain('&gt; 70 Plays');
    expect(html).toContain('50–70 Plays');
    expect(html).toContain('20–49 Plays');
    expect(html).toContain('&lt; 20 Plays');
  });

  it('renders mastery filters and track items with formatted play counts', () => {
    const html = renderToString(
      <ProgressTab
        audioItems={mockAudioItems}
        dailyStats={[]}
      />
    );

    // Verify filter buttons
    expect(html).toContain('Most Played');
    expect(html).toContain('Yet to Learn');
    expect(html).toContain('Learned');

    // Verify track titles
    expect(html).toContain('Thermodynamics Second Law');
    expect(html).toContain('Eigenvalues and Eigenvectors');
    expect(html).toContain('Organic Reaction Mechanisms');
    expect(html).toContain('Introduction to Cell Biology');

    // Verify formatted play count badges (85×, 55×, 32×, 7×)
    expect(html).toContain('85×');
    expect(html).toContain('55×');
    expect(html).toContain('32×');
    expect(html).toContain('7×');

    // Verify subjects and durations are displayed
    expect(html).toContain('Physics');
    expect(html).toContain('Mathematics');
    expect(html).toContain('Chemistry');
    expect(html).toContain('Biology');
  });

  it('renders clean empty state when no notes exist', () => {
    const html = renderToString(
      <ProgressTab
        audioItems={[]}
        dailyStats={[]}
      />
    );

    expect(html).toContain('No tracks in this category');
    expect(html).toContain('Upload or record study notes to begin your memorization journey');
  });
});
