import { useState } from 'react';
import { useLocation } from 'react-router-dom';

// Shared open/close state for the hamburger-triggered slide-in nav used by
// every sidebar-shell layout and the landing page - closes itself whenever
// the route changes, so navigating never leaves the panel open behind it.
// Resetting during render (rather than in an effect) avoids the extra
// render pass an effect-driven reset would cost.
export function useMobileNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return { open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) };
}
