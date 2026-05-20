'use client';

import { useState, useCallback } from 'react';

export interface ToastState {
  msg: string;
  ok: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), ok ? 3000 : 4000);
  }, []);

  return { toast, showToast };
}
