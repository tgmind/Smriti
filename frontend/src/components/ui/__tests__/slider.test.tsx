import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Slider } from '../slider';
import { Badge } from '../badge';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from '../card';

describe('shadcn-ui primitives: Slider, Badge, Card', () => {
  it('renders Slider with correct value and loop range', () => {
    const html = renderToString(
      <Slider
        value={15}
        min={0}
        max={60}
        loopRange={{ startPercent: 20, endPercent: 50 }}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('role="slider"');
    expect(html).toContain('aria-valuenow="15"');
    expect(html).toContain('aria-valuemax="60"');
    expect(html).toContain('bg-emerald-500');
  });

  it('renders Badge with custom variants', () => {
    const defaultBadge = renderToString(<Badge>Default</Badge>);
    const emeraldBadge = renderToString(<Badge variant="emerald">Active</Badge>);
    const outlineBadge = renderToString(<Badge variant="outline">Study Mode</Badge>);

    expect(defaultBadge).toContain('bg-slate-950');
    expect(emeraldBadge).toContain('bg-emerald-50');
    expect(outlineBadge).toContain('Study Mode');
  });

  it('renders Card with composed children', () => {
    const html = renderToString(
      <Card className="test-card" size="sm">
        <CardHeader>
          <CardTitle>Session Title</CardTitle>
          <CardDescription>Session Details</CardDescription>
          <CardAction><button>Close</button></CardAction>
        </CardHeader>
        <CardContent>Audio Details</CardContent>
        <CardFooter><button>Submit</button></CardFooter>
      </Card>
    );

    expect(html).toContain('test-card');
    expect(html).toContain('data-size="sm"');
    expect(html).toContain('data-slot="card-action"');
    expect(html).toContain('Session Title');
    expect(html).toContain('Session Details');
    expect(html).toContain('Close');
    expect(html).toContain('Audio Details');
    expect(html).toContain('Submit');
  });
});
