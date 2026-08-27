import { useCallback, useRef, useState } from 'react';

export function useFlash() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const flash = useCallback((message, kind = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return [toast, flash];
}
