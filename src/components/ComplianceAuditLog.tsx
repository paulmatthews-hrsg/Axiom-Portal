import { Clock, FileText, Mail, FileCheck, CreditCard, Check, Shield, ScanLine } from 'lucide-react';
import type { AuditLog } from '../types/database';
import { formatAppDate } from '../utils/formatters';

interface ComplianceAuditLogProps {
  logs: AuditLog[];
  infringementId: string;
}

export function ComplianceAuditLog({ logs, infringementId }: ComplianceAuditLogProps) {
  function getActionIcon(action: string) {
    if (action.includes('OCR') || action.includes('extraction')) return ScanLine;
    if (action.includes('COR') || action.includes('email')) return Mail;
    if (action.includes('Stat Dec') || action.includes('declaration')) return FileCheck;
    if (action.includes('payment') || action.includes('BPAY')) return CreditCard;
    if (action.includes('verified') || action.includes('approved')) return Check;
    if (action.includes('encrypted') || action.includes('FIPS')) return Shield;
    if (action.includes('document') || action.includes('uploaded')) return FileText;
    return Clock;
  }

  function getActionColor(action: string, actorType: string) {
    if (actorType === 'system') {
      if (action.includes('OCR') || action.includes('extraction')) return 'bg-blue-100 text-blue-700 border-blue-300';
      if (action.includes('encrypted') || action.includes('FIPS')) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    return 'bg-indigo-100 text-indigo-700 border-indigo-300';
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const timezoneOffset = -date.getTimezoneOffset();
    const timezoneHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const australianTime = timezoneHours === 10 || timezoneHours === 11 ? ' AEST' : ' UTC';

    return `${formatAppDate(timestamp)} ${hours}:${minutes}:${seconds}${australianTime}`;
  }

  const filteredLogs = logs.filter(log =>
    !log.infringement_id || log.infringement_id === infringementId
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">
            DoD & DISP (ISM) Compliant: FIPS-140-2
          </span>
        </div>
        <p className="text-sm text-slate-600">
          {filteredLogs.length} auditable {filteredLogs.length === 1 ? 'event' : 'events'} recorded
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Shield size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm">No audit events recorded</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const Icon = getActionIcon(log.action);
              const isLast = index === filteredLogs.length - 1;

              return (
                <div key={log.id} className="relative">
                  {!isLast && (
                    <div className="absolute left-4 top-9 bottom-0 w-0.5 bg-slate-200" />
                  )}
                  <div className="flex gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${getActionColor(
                        log.action,
                        log.actor_type
                      )}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-slate-900 leading-snug">
                            {log.action}
                          </p>
                          {log.actor_type === 'system' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300 flex-shrink-0">
                              SYSTEM
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={12} className="flex-shrink-0" />
                            <span className="font-mono">{formatTimestamp(log.timestamp)}</span>
                          </div>

                          <div className="flex items-start gap-2 text-slate-600">
                            <span className="font-semibold text-slate-700 flex-shrink-0">Actor:</span>
                            <span className="font-medium">{log.actor}</span>
                          </div>

                          <div className="flex items-start gap-2 text-slate-600">
                            <span className="font-semibold text-slate-700 flex-shrink-0">IP:</span>
                            <span className="font-mono">{log.ip_address}</span>
                          </div>
                        </div>

                        {(log.action.includes('FIPS') || log.action.includes('encrypted')) && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                              <Shield size={12} />
                              <span className="font-medium">DoD & DISP (ISM) Compliant: FIPS-140-2</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
