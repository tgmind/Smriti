import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext
} from '../carousel';

describe('shadcn Carousel Component', () => {
  it('renders carousel structure with slides and navigation buttons', () => {
    const html = renderToString(
      <Carousel opts={{ align: 'start', loop: true }}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
          <CarouselItem>Slide 3</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('Slide 1');
    expect(html).toContain('Slide 2');
    expect(html).toContain('Slide 3');
    expect(html).toContain('Previous slide');
    expect(html).toContain('Next slide');
  });
});
