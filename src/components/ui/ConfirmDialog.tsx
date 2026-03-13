'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-surface border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="text-muted text-sm mt-2">{description}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-text text-sm font-medium hover:border-accent hover:text-accent transition-colors duration-150 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              variant === 'danger'
                ? 'px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors duration-150 cursor-pointer'
                : 'px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-[#4F46E5] transition-colors duration-150 cursor-pointer'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
