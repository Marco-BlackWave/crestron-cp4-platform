import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      border: 'border-red-500/50',
      shadow: 'shadow-red-500/30',
      gradient: 'from-red-500/10 via-orange-500/10 to-red-500/10',
      titleGradient: 'from-red-400 to-orange-400',
      icon: 'text-red-400',
      confirmBg: 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700',
      confirmShadow: 'shadow-red-500/30',
    },
    warning: {
      border: 'border-amber-500/50',
      shadow: 'shadow-amber-500/30',
      gradient: 'from-amber-500/10 via-yellow-500/10 to-amber-500/10',
      titleGradient: 'from-amber-400 to-yellow-400',
      icon: 'text-amber-400',
      confirmBg: 'from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700',
      confirmShadow: 'shadow-amber-500/30',
    },
    info: {
      border: 'border-blue-500/50',
      shadow: 'shadow-blue-500/30',
      gradient: 'from-blue-500/10 via-cyan-500/10 to-blue-500/10',
      titleGradient: 'from-blue-400 to-cyan-400',
      icon: 'text-blue-400',
      confirmBg: 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
      confirmShadow: 'shadow-blue-500/30',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[10001] animate-in fade-in duration-200">
      <div className={`bg-gradient-to-br from-zinc-900/98 via-zinc-900/95 to-zinc-800/98 border-2 ${styles.border} rounded-2xl w-[480px] shadow-2xl ${styles.shadow} backdrop-blur-xl animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className={`p-6 border-b border-zinc-700/50 bg-gradient-to-r ${styles.gradient}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${styles.confirmBg} flex items-center justify-center flex-shrink-0 shadow-lg ${styles.confirmShadow}`}>
              <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-xl font-semibold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent`}>
                {title}
              </h3>
              <p className="text-zinc-300 mt-2 text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-xl transition-all duration-200 hover:scale-105 font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 bg-gradient-to-r ${styles.confirmBg} rounded-xl transition-all duration-200 hover:scale-105 shadow-lg ${styles.confirmShadow} font-medium`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
