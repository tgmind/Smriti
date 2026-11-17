import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Switch } from '../switch';

describe('Base UI Switch Component', () => {
  it('renders Switch with role="switch" and default state', () => {
    const html = renderToString(<Switch aria-label="Sync mode" />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('data-slot="switch"');
    expect(html).toContain('data-slot="switch-thumb"');
    expect(html).toContain('aria-label="Sync mode"');
    expect(html).toContain('data-unchecked=""');
  });

  it('renders Switch with checked state and emerald styling', () => {
    const html = renderToString(<Switch checked={true} aria-label="Sync mode" />);
    expect(html).toContain('data-checked=""');
    expect(html).toContain('aria-checked="true"');
  });

  it('renders small size switch with size="sm"', () => {
    const html = renderToString(<Switch size="sm" aria-label="Compact sync" />);
    expect(html).toContain('data-size="sm"');
    expect(html).toContain('h-4 w-7');
    expect(html).toContain('size-3');
  });
});
