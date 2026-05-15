import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 max-w-2xl w-full backdrop:bg-black/60"
    >
      <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
        <h2 className="text-base font-bold">{title}</h2>
        <button onClick={onClose} className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-lg leading-none">&times;</button>
      </div>
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {children}
      </div>
    </dialog>
  );
}