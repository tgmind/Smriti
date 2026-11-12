import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Base UI Tabs (base-nova)', () => {
  it('renders tabs with default variant and default active tab', () => {
    const html = renderToString(
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="due">Due</TabsTrigger>
        </TabsList>
        <TabsContent value="all">All lessons content</TabsContent>
        <TabsContent value="due">Due lessons content</TabsContent>
      </Tabs>
    );

    expect(html).toContain('data-slot="tabs"');
    expect(html).toContain('data-slot="tabs-list"');
    expect(html).toContain('data-slot="tabs-trigger"');
    expect(html).toContain('data-slot="tabs-content"');
    expect(html).toContain('All lessons content');
    expect(html).not.toContain('Due lessons content');
  });

  it('renders line variant with variant="line" attribute', () => {
    const html = renderToString(
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview Content</TabsContent>
        <TabsContent value="details">Details Content</TabsContent>
      </Tabs>
    );

    expect(html).toContain('data-variant="line"');
    expect(html).toContain('Overview Content');
  });

  it('supports vertical orientation attribute', () => {
    const html = renderToString(
      <Tabs defaultValue="tab1" orientation="vertical">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Panel 1</TabsContent>
        <TabsContent value="tab2">Panel 2</TabsContent>
      </Tabs>
    );

    expect(html).toContain('data-orientation="vertical"');
    expect(html).toContain('Panel 1');
  });
});
