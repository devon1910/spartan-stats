'use client';

import { Check, AlertCircle } from 'lucide-react';
import type { ToastState } from '@/lib/useToast';

export default function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
        toast.ok
          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
      }`}
    >
      {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />}
      {toast.msg}
    </div>
  );
}
