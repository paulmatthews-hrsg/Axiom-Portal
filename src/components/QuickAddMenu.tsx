import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, AlertTriangle, FileText } from 'lucide-react';

interface QuickAddMenuProps {
  onUploadFine: () => void;
}

export function QuickAddMenu({ onUploadFine }: QuickAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const menuItems = [
    {
      icon: Upload,
      label: 'Upload Fine',
      description: 'Add scanned infringement notice',
      action: () => {
        onUploadFine();
        setIsOpen(false);
      },
    },
    {
      icon: AlertTriangle,
      label: 'Log Vehicle Issue',
      description: 'Report maintenance or damage',
      action: () => {
        setIsOpen(false);
      },
    },
    {
      icon: FileText,
      label: 'Process Service Invoice',
      description: 'Submit fleet service bill',
      action: () => {
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-150 active:scale-95 font-medium shadow-sm"
      >
        <Plus size={20} />
        <span className="hidden sm:inline">Quick Add</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick Add</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Create new records</p>
          </div>

          <div className="py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg mt-0.5">
                    <Icon size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
