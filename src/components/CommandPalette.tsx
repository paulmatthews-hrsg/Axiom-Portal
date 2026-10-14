import { useState, useEffect, useRef } from 'react';
import { Search, Moon, Sun, Upload, Truck, FileDown, Command } from 'lucide-react';
import { useNavigate } from '../contexts/NavigationContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkUpload: () => void;
}

interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  action: () => void;
  keywords: string[];
}

export function CommandPalette({ isOpen, onClose, onBulkUpload }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateTo } = useNavigate();

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    onClose();
  };

  const handleExport = () => {
    const event = new CustomEvent('export-csv');
    window.dispatchEvent(event);
    onClose();
  };

  const commands: Command[] = [
    {
      id: 'toggle-dark-mode',
      label: 'Toggle Dark Mode',
      icon: document.documentElement.classList.contains('dark') ? Sun : Moon,
      action: toggleDarkMode,
      keywords: ['dark', 'light', 'theme', 'mode'],
    },
    {
      id: 'bulk-upload',
      label: 'Upload Scanned Fines',
      icon: Upload,
      action: () => {
        onBulkUpload();
        onClose();
      },
      keywords: ['upload', 'bulk', 'fines', 'scan'],
    },
    {
      id: 'fleet-assets',
      label: 'Go to Fleet Assets',
      icon: Truck,
      action: () => {
        navigateTo('fleet-assets');
        onClose();
      },
      keywords: ['fleet', 'assets', 'vehicles', 'navigate'],
    },
    {
      id: 'export-data',
      label: 'Export Data to CSV',
      icon: FileDown,
      action: handleExport,
      keywords: ['export', 'csv', 'download', 'data'],
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.keywords.some((keyword) => keyword.includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-down">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <Command size={20} className="text-slate-600 dark:text-slate-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
          />
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
              <Search size={48} className="mx-auto mb-3 opacity-50" />
              <p>No commands found</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => {
                const Icon = command.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={command.id}
                    onClick={command.action}
                    className={`w-full flex items-center gap-4 px-4 py-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-800/50'
                          : 'bg-slate-100 dark:bg-slate-700'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="font-medium">{command.label}</span>
                    {isSelected && (
                      <kbd className="ml-auto px-2 py-1 text-xs bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600">↵</kbd>
              <span>to select</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
