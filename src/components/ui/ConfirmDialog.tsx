import { useEffect, useState } from 'react';
import { Button } from './Form';

// In-app replacement for window.confirm(), which installed PWAs (notably iOS
// standalone) may silently suppress, returning false without showing anything.
interface Request {
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

let show: ((req: Request) => void) | null = null;

export function confirmAction(message: string, confirmLabel = 'Supprimer'): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) return resolve(window.confirm(message));
    show({ message, confirmLabel, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);

  useEffect(() => {
    show = setReq;
    return () => {
      show = null;
    };
  }, []);

  if (!req) return null;

  const close = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-nav/40 backdrop-blur-[2px] animate-fade-in" onClick={() => close(false)} />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-[var(--shadow-bento-hover)]">
        <p className="text-[15px] text-ink mb-5">{req.message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => close(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={() => close(true)} autoFocus>
            {req.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
