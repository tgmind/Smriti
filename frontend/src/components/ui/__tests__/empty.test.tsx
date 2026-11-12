import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '../empty';
import { Button } from '../button';
import { Mic, Sparkles } from 'lucide-react';

describe('Empty Component (shadcn/ui style)', () => {
  it('renders standard empty state with composition: Header, Media, Title, Description, and Content', () => {
    const html = renderToString(
      <Empty className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-sky-50 text-[#24A1DE]">
            <Mic className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No Audio Notes Yet</EmptyTitle>
          <EmptyDescription>
            Record a lecture note or import audio to start your personalized study session.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Record First Lesson</Button>
        </EmptyContent>
      </Empty>
    );

    expect(html).toContain('data-slot="empty"');
    expect(html).toContain('data-slot="empty-header"');
    expect(html).toContain('data-slot="empty-media"');
    expect(html).toContain('data-variant="icon"');
    expect(html).toContain('data-slot="empty-title"');
    expect(html).toContain('No Audio Notes Yet');
    expect(html).toContain('data-slot="empty-description"');
    expect(html).toContain('Record a lecture note or import audio to start your personalized study session.');
    expect(html).toContain('data-slot="empty-content"');
    expect(html).toContain('Record First Lesson');
  });

  it('renders outline empty state with default media', () => {
    const html = renderToString(
      <Empty className="border border-dashed border-slate-300 p-8">
        <EmptyHeader>
          <EmptyMedia variant="default">
            <span className="avatar-placeholder">Avatar</span>
          </EmptyMedia>
          <EmptyTitle>No data</EmptyTitle>
          <EmptyDescription>No data found</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button">Add data</button>
        </EmptyContent>
      </Empty>
    );

    expect(html).toContain('border-dashed');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('Avatar');
    expect(html).toContain('No data');
    expect(html).toContain('No data found');
    expect(html).toContain('Add data');
  });

  it('renders secondary empty state with Sparkles icon and custom classes', () => {
    const html = renderToString(
      <Empty className="bg-white border border-slate-200/80 rounded-3xl p-7 shadow-2xs">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="w-10 h-10 rounded-full bg-slate-100 text-slate-400">
            <Sparkles size={18} />
          </EmptyMedia>
          <EmptyTitle className="text-xs font-semibold text-slate-800">
            No plays recorded yet. Start listening to see your most reviewed lessons here.
          </EmptyTitle>
          <EmptyDescription className="text-[11px] text-slate-500 mt-1">
            Tap &#39;Most Played&#39; or &#39;Drive&#39; to explore your study content.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

    expect(html).toContain('No plays recorded yet. Start listening to see your most reviewed lessons here.');
    expect(html).toContain('Most Played');
    expect(html).toContain('Drive');
    expect(html).toContain('to explore your study content.');
  });
});
