import { Clock, FileText, Mail, FileCheck, CreditCard, Check } from 'lucide-react';
import type { ActivityLog, Infringement } from '../types/database';
import { formatAppDate } from '../utils/formatters';

interface ActivityFeedProps {
  logs: ActivityLog[];
  infringement: Infringement;
}

export function ActivityFeed({ logs, infringement }: ActivityFeedProps) {
  function getActionIcon(actionType: string) {
    const icons: Record<string, typeof Clock> = {
      'COR_GENERATED': Mail,
      'STAT_DEC_GENERATED': FileCheck,
      'PAYMENT_PROCESSED': CreditCard,
      'STATUS_UPDATED': Clock,
      'DOCUMENT_UPLOADED': FileText,
      'CLOSED': Check,
    };
    return icons[actionType] || Clock;
  }

  function getActionColor(actionType: string) {
    const colors: Record<string, string> = {
      'COR_GENERATED': 'bg-blue-100 text-blue-600',
      'STAT_DEC_GENERATED': 'bg-amber-100 text-amber-600',
      'PAYMENT_PROCESSED': 'bg-emerald-100 text-emerald-600',
      'STATUS_UPDATED': 'bg-slate-100 text-slate-600',
      'DOCUMENT_UPLOADED': 'bg-purple-100 text-purple-600',
      'CLOSED': 'bg-green-100 text-green-600',
    };
    return colors[actionType] || 'bg-slate-100 text-slate-600';
  }

  const allActivities = [
    {
      id: 'created',
      action_type: 'CREATED',
      action_description: `Infringement received and created in system`,
      performed_by: 'System',
      created_at: infringement.created_at,
      metadata: {},
    },
    ...logs,
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-white/40 shadow-sm h-full flex flex-col">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">Activity Feed</h2>
        <p className="text-xs text-slate-600 mt-1">{allActivities.length} events</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {allActivities.map((log, index) => {
            const Icon = getActionIcon(log.action_type);
            const isLast = index === allActivities.length - 1;

            return (
              <div key={log.id || `activity-${index}`} className="relative">
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-slate-200" />
                )}
                <div className="flex gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActionColor(
                      log.action_type
                    )}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {log.action_description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-600">{log.performed_by}</p>
                      <span className="text-xs text-slate-400">•</span>
                      <p className="text-xs text-slate-500">
                        {formatAppDate(log.created_at)} at {new Date(log.created_at).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 bg-slate-50 rounded-lg p-2">
                        <div className="space-y-1">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2 text-xs">
                              <span className="text-slate-500 font-medium">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-slate-900">
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
