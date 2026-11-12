import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Info, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '../alert';
import { Button } from '../button';

describe('shadcn Alert component', () => {
  it('renders default alert with icon, title, description, and action', () => {
    const html = renderToString(
      <Alert>
        <Info />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          You can add components and dependencies to your app using the cli.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline">Enable</Button>
        </AlertAction>
      </Alert>
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain('data-slot="alert-title"');
    expect(html).toContain('Heads up!');
    expect(html).toContain('data-slot="alert-description"');
    expect(html).toContain('data-slot="alert-action"');
    expect(html).toContain('Enable');
  });

  it('renders destructive variant', () => {
    const html = renderToString(
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong!</AlertDescription>
      </Alert>
    );

    expect(html).toContain('text-rose-950');
    expect(html).toContain('Error');
  });

  it('supports custom color classes (e.g. amber callout)', () => {
    const html = renderToString(
      <Alert className="bg-amber-50 dark:bg-amber-950">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please connect your drive.</AlertDescription>
      </Alert>
    );

    expect(html).toContain('bg-amber-50');
  });
});
