import { type ReactNode, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full animate-scale-in flex-col overflow-hidden',
          'rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl',
          sizeClasses[size],
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div className="min-w-0">
              {title && (
                <h2 className="font-display text-lg font-semibold leading-tight text-slate-900">{title}</h2>
              )}
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

let confirmRoot: ReturnType<typeof createRoot> | null = null;
let confirmContainer: HTMLDivElement | null = null;

function ensureContainer() {
  if (!confirmContainer) {
    confirmContainer = document.createElement('div');
    document.body.appendChild(confirmContainer);
    confirmRoot = createRoot(confirmContainer);
  }
  return confirmContainer;
}

export function confirm(options: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions =
    typeof options === 'string' ? { title: 'Confirm', message: options } : options;

  return new Promise((resolve) => {
    ensureContainer();

    const settle = (result: boolean) => {
      confirmRoot?.render(null);
      resolve(result);
    };

    confirmRoot!.render(
      <Modal open onClose={() => settle(false)} title={normalized.title}>
        <p className="text-sm leading-relaxed text-slate-600">{normalized.message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => settle(false)}>
            {normalized.cancelText || 'Cancel'}
          </Button>
          <Button variant="danger" onClick={() => settle(true)}>
            {normalized.confirmText || 'Confirm'}
          </Button>
        </div>
      </Modal>,
    );
  });
}
