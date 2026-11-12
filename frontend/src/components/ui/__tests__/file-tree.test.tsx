import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FileTree } from '../file-tree';
import { Subject, AudioItem } from '@/types';

describe('FileTree hierarchy component', () => {
  const mockSubjects: Subject[] = [
    {
      id: 'sub-phys',
      name: 'Physics',
      icon_name: 'Atom',
      color_hex: '#3b82f6',
      sort_order: 1,
    },
  ];

  const mockAudioItems: AudioItem[] = [
    {
      id: 'audio-1',
      title: 'Quantum Mechanics 101',
      file_format: 'audio/mp3',
      duration_seconds: 120,
      file_size_bytes: 1024,
      source_type: 'recorded',
      subject_id: 'sub-phys',
      key_terms: ['Wave-Particle Duality', 'Schrodinger'],
      created_at: new Date().toISOString(),
      audio_enhancement_applied: false,
      waveform_peaks: [50, 60],
      is_favorite: false,
    },
  ];

  it('renders subject folders, audio nodes, and concept tags', () => {
    const html = renderToString(
      <FileTree
        subjects={mockSubjects}
        audioItems={mockAudioItems}
        onSelectAudio={vi.fn()}
      />
    );

    expect(html).toContain('Physics');
    expect(html).toContain('Quantum Mechanics 101');
    expect(html).toContain('Wave-Particle Duality');
    expect(html).toContain('Schrodinger');
  });
});
