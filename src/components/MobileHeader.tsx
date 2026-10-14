import { Menu, X } from 'lucide-react';
import { APP_NAME } from '../constants/config';

interface MobileHeaderProps {
  onMenuClick: () => void;
  isMenuOpen: boolean;
}

export function MobileHeader({ onMenuClick, isMenuOpen }: MobileHeaderProps) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">{APP_NAME[0]}</span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-200">{APP_NAME}</span>
        </div>
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X size={24} className="text-slate-200" />
          ) : (
            <Menu size={24} className="text-slate-200" />
          )}
        </button>
      </div>
    </div>
  );
}
