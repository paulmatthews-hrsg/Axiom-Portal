import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscardChanges: () => void;
}

export function UnsavedChangesModal({ isOpen, onKeepEditing, onDiscardChanges }: UnsavedChangesModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onKeepEditing();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onKeepEditing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onKeepEditing}
      />

      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onKeepEditing}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 pt-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Unsaved Changes
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                You have unsaved changes on this page. If you leave now, your work will be lost.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onDiscardChanges}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
            >
              Discard Changes
            </button>
            <button
              onClick={onKeepEditing}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              Keep Editing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
