import { Construction } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  description: string;
}

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6 animate-fade-in-up">
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center border border-blue-100/50 shadow-sm">
            <Construction size={42} className="text-blue-600/80" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-3 tracking-tight">{title}</h2>
        <p className="text-slate-600 text-base leading-relaxed mb-2">{description}</p>
        <p className="text-sm text-slate-400 mt-6 tracking-wide uppercase">Under Development</p>
      </div>
    </div>
  );
}
