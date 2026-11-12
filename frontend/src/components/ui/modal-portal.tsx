import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * ModalPortal
 * Renders modal overlays directly into document.body to break free from
 * any parent stacking contexts, transforms, or max-width containers.
 * Prevents body background scrolling while open and preserves SSR test compatibility.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // In SSR / Vitest renderToString or before mount, render children directly
  if (typeof document === 'undefined' || !mounted) {
    return <>{children}</>;
  }

  return createPortal(children, document.body);
};
