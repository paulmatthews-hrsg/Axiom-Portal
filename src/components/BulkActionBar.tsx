import { UserPlus, Clock, Trash2, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkAssign: () => void;
  onMarkPending: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function BulkActionBar({
  selectedCount,
  onBulkAssign,
  onMarkPending,
  onDelete,
  onClose,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/60 dark:bg-slate-800/80 backdrop-blur-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
          {selectedCount}
        </div>
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          {selectedCount === 1 ? '1 record selected' : `${selectedCount} records selected`}
        </span>
      </div>

      <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBulkAssign}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <UserPlus size={18} />
          <span>Bulk Assign</span>
        </button>

        <button
          onClick={onMarkPending}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          <Clock size={18} />
          <span>Mark as Pending</span>
        </button>

        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all flex items-center justify-center"
          title="Delete selected"
        >
          <Trash2 size={18} />
        </button>

        <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 ml-2"></div>

        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Clear selection"
        >
          <X size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );
}
