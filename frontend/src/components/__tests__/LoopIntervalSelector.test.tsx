import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LoopIntervalSelector } from '../LoopIntervalSelector';
import { RangeSlider } from '../ui/range-slider';

describe('LoopIntervalSelector & RangeSlider Components', () => {
  it('renders RangeSlider with A and B handles and active highlight range', () => {
    const html = renderToString(
      <RangeSlider
        startValue={10}
        endValue={30}
        min={0}
        max={100}
        currentPlaybackPosition={15}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('Point A');
    expect(html).toContain('Point B');
    expect(html).toContain('Playback: 0:15');
    expect(html).toContain('bg-gradient-to-r from-amber-400 to-amber-500');
  });

  it('renders LoopIntervalSelector with interactive fine-tuning cards and quick presets', () => {
    const html = renderToString(
      <LoopIntervalSelector
        currentPosition={6}
        duration={60}
        activeLoop={null}
        onSetLoop={vi.fn()}
        onClearLoop={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(html).toContain('Repeat Interval');
    expect(html).toContain('Drag handles A &amp; B or slide range');
    expect(html).toContain('Start Point');
    expect(html).toContain('End Point');
    expect(html).toContain('Quick Interval Presets');
    expect(html).toContain('5s Loop');
    expect(html).toContain('15s Loop');
    expect(html).toContain('Activate Loop');
  });

  it('renders active loop state correctly when loop is enabled', () => {
    const html = renderToString(
      <LoopIntervalSelector
        currentPosition={12}
        duration={120}
        activeLoop={{ enabled: true, startSeconds: 10, endSeconds: 25 }}
        onSetLoop={vi.fn()}
        onClearLoop={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(html).toContain('0:10');
    expect(html).toContain('0:25');
    expect(html).toContain('Active Repeat Loop');
    expect(html).toContain('Clear');
  });
});
