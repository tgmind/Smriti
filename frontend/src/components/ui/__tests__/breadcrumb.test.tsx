import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../breadcrumb';

describe('Breadcrumb component', () => {
  it('renders breadcrumb items, links, separators and page', () => {
    const html = renderToString(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Subjects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Physics</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Quantum Mechanics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(html).toContain('aria-label="breadcrumb"');
    expect(html).toContain('Subjects');
    expect(html).toContain('Physics');
    expect(html).toContain('Quantum Mechanics');
    expect(html).toContain('aria-current="page"');
  });
});
