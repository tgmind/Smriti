import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
} from '../progress';

describe('Progress component', () => {
  it('renders default progress bar with percentage', () => {
    const html = renderToString(<Progress value={45} max={100} />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="45"');
    expect(html).toContain('width:45%');
  });

  it('renders compound progress with label and custom value', () => {
    const html = renderToString(
      <Progress value={60} max={100}>
        <ProgressLabel>Google Drive Storage</ProgressLabel>
        <ProgressValue />
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
    );

    expect(html).toContain('Google Drive Storage');
    expect(html).toContain('60%');
    expect(html).toContain('width:60%');
  });

  it('supports multi-segmented indicators inside track', () => {
    const html = renderToString(
      <Progress value={80} max={100}>
        <ProgressTrack>
          <ProgressIndicator value={20} className="bg-blue-600" />
          <ProgressIndicator value={30} className="bg-amber-500" />
          <ProgressIndicator value={30} className="bg-rose-500" />
        </ProgressTrack>
      </Progress>
    );

    expect(html).toContain('width:20%');
    expect(html).toContain('width:30%');
    expect(html).toContain('bg-blue-600');
    expect(html).toContain('bg-amber-500');
    expect(html).toContain('bg-rose-500');
  });
});
