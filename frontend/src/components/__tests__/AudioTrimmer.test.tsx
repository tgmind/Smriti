import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AudioTrimmer } from '../AudioTrimmer';

describe('AudioTrimmer Component', () => {
  it('renders audio trimmer with adaptive ruler ticks and title', () => {
    const handleTrimChange = vi.fn();
    const html = renderToString(
      <AudioTrimmer
        durationSeconds={12}
        audioUrl={null}
        waveformPeaks={[20, 40, 60, 80, 50]}
        initialStartSeconds={0}
        initialEndSeconds={12}
        onTrimChange={handleTrimChange}
      />
    );

    expect(html).toContain('Visual Audio Trimmer');
    expect(html).toContain('0s');
    expect(html).toContain('12s');
    expect(html).toContain('Preview');
    expect(html).toContain('Tune');
    expect(html).toContain('Fade In');
    expect(html).toContain('Fade Out');
  });

  it('renders with short duration without generating duplicate ticks', () => {
    const handleTrimChange = vi.fn();
    const html = renderToString(
      <AudioTrimmer
        durationSeconds={2.5}
        initialStartSeconds={0}
        initialEndSeconds={2.5}
        onTrimChange={handleTrimChange}
      />
    );

    expect(html).toContain('Visual Audio Trimmer');
    expect(html).toContain('0.0s');
    expect(html).toContain('0.5s');
    expect(html).toContain('1.0s');
    expect(html).toContain('1.5s');
    expect(html).toContain('2.0s');
  });
});
