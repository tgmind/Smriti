import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ModalPortal } from '../modal-portal';

describe('ModalPortal Component', () => {
  it('renders children directly during SSR / renderToString', () => {
    const html = renderToString(
      <ModalPortal>
        <div data-testid="modal-content">
          <p>SSR Modal Content</p>
        </div>
      </ModalPortal>
    );

    expect(html).toContain('data-testid="modal-content"');
    expect(html).toContain('SSR Modal Content');
  });

  it('renders multiple children fragments during SSR', () => {
    const html = renderToString(
      <ModalPortal>
        <div className="backdrop">
          <dialog className="modal-dialog">
            <span>Inside Modal</span>
          </dialog>
        </div>
      </ModalPortal>
    );

    expect(html).toContain('class="backdrop"');
    expect(html).toContain('class="modal-dialog"');
    expect(html).toContain('Inside Modal');
  });
});
