import { MapPin } from 'lucide-react';

interface GeotabMapReplayProps {
  latitude: string;
  longitude: string;
  location: string;
}

export function GeotabMapReplay({ latitude, longitude, location }: GeotabMapReplayProps) {
  return (
    <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-64">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 10,120 Q 80,100 150,130 T 300,110"
            stroke="#94a3b8"
            strokeWidth="3"
            fill="none"
            strokeDasharray="0"
          />
          <path
            d="M 50,80 L 200,85 L 250,90"
            stroke="#94a3b8"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 80,180 Q 120,170 180,190"
            stroke="#94a3b8"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="120" cy="140" r="2" fill="#64748b" />
          <circle cx="200" cy="120" r="2" fill="#64748b" />
          <circle cx="180" cy="160" r="2" fill="#64748b" />
        </svg>
      </div>

      <div className="absolute top-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">Trip Telemetry Snapshot</div>
        <div className="text-xs text-slate-600 dark:text-slate-400">Live telemetry feed</div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-1 h-12 bg-red-500"></div>
          <div className="relative">
            <MapPin
              size={48}
              className="text-red-600 dark:text-red-500 drop-shadow-lg"
              fill="currentColor"
            />
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 rounded-lg shadow-xl text-sm font-semibold whitespace-nowrap">
              Offence Timestamp Match
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-100 rotate-45"></div>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-red-500/20 rounded-full animate-ping"></div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-lg shadow-lg px-4 py-3 border border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">GPS Coordinates</div>
        <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {latitude}, {longitude}
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
          {location}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse shadow-lg"></div>
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 px-2 py-1 rounded">
          Live Feed
        </div>
      </div>
    </div>
  );
}
