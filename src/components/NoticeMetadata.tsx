import { MapPin, AlertTriangle, Copy, Check, ScanLine } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import { Skeleton } from './Skeleton';

interface NoticeMetadataProps {
  issuingState: string | null;
  issuingAuthority: string | null;
  corporateFineAmount: number | null;
  bpayBillerCode: string | null;
  bpayReference: string | null;
  ocrVerified: boolean;
  onVerificationComplete?: () => void;
}

const STATE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NT: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  NSW: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  QLD: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  VIC: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  WA: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  SA: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  TAS: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  ACT: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
};

export function NoticeMetadata({
  issuingState,
  issuingAuthority,
  corporateFineAmount,
  bpayBillerCode,
  bpayReference,
  ocrVerified,
  onVerificationComplete,
}: NoticeMetadataProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(!ocrVerified);
  const [showData, setShowData] = useState(ocrVerified);

  const stateColors = issuingState ? STATE_COLORS[issuingState] : STATE_COLORS.NSW;
  const isHighValueFine = corporateFineAmount && corporateFineAmount > 1000;

  useEffect(() => {
    if (!ocrVerified) {
      setIsProcessing(true);
      setShowData(false);

      const timer = setTimeout(() => {
        setIsProcessing(false);
        setShowData(true);
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [ocrVerified, onVerificationComplete]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-lg border border-white/40 dark:border-slate-700/50 shadow-sm overflow-hidden transition-colors duration-300">
      <div className="bg-gradient-to-r from-slate-50/80 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-900/50 px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notice Metadata</h3>
      </div>
      <div className="p-4 space-y-4">
        {isProcessing && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center py-6">
              <div className="text-center space-y-4">
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
                  <div className="absolute w-16 h-16 border-4 border-blue-400 dark:border-blue-600 rounded-full animate-ping"></div>
                  <ScanLine size={32} className="text-blue-600 dark:text-blue-400 animate-pulse relative z-10" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Analysis in Progress</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                    Google Cloud Document AI: Extracting entity data via secure GovCloud node...
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton height="20px" width="140px" />
                <div className="flex items-center gap-2">
                  <Skeleton height="32px" width="60px" className="rounded-lg" />
                  <Skeleton height="20px" width="180px" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton height="16px" width="180px" />
                <Skeleton height="36px" width="150px" />
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <Skeleton height="16px" width="160px" />
                <div className="space-y-2">
                  <Skeleton height="56px" className="rounded-lg" />
                  <Skeleton height="56px" className="rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        )}

        {showData && (
          <>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-xs text-slate-400 tracking-wide uppercase mb-2">Issuing Jurisdiction</div>
            <div className="flex items-center gap-2">
              {issuingState && (
                <span
                  className={`px-3 py-1.5 rounded-lg font-semibold text-sm border ${stateColors.bg} ${stateColors.text} ${stateColors.border}`}
                >
                  {issuingState}
                </span>
              )}
              {issuingAuthority && (
                <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                  <MapPin size={14} className="text-slate-500 dark:text-slate-400" />
                  {issuingAuthority}
                </span>
              )}
            </div>
          </div>
        </div>

        {corporateFineAmount !== null && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 tracking-wide uppercase">Corporate Fine Amount</div>
            <div className="flex items-start gap-2">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(corporateFineAmount)}
              </div>
              {isHighValueFine && (
                <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs border border-red-200">
                  <AlertTriangle size={14} />
                  <span className="font-medium">Corporate Multiplier Applied</span>
                </div>
              )}
            </div>
            {isHighValueFine && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                <strong>Warning:</strong> Do not pay until driver has been nominated and individual
                fine re-issued. Corporate fines are significantly higher than individual fines.
              </p>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="text-xs text-slate-400 tracking-wide uppercase mb-2">BPAY Payment Details</div>

          {bpayBillerCode && (
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs text-slate-400 tracking-wide uppercase">Biller Code</div>
                <div className="font-mono font-medium text-slate-900">{bpayBillerCode}</div>
              </div>
              <button
                onClick={() => copyToClipboard(bpayBillerCode, 'biller')}
                className="p-2 hover:bg-slate-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copiedField === 'biller' ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} className="text-slate-600" />
                )}
              </button>
            </div>
          )}

          {bpayReference && (
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs text-slate-400 tracking-wide uppercase">Reference Number</div>
                <div className="font-mono font-medium text-slate-900">{bpayReference}</div>
              </div>
              <button
                onClick={() => copyToClipboard(bpayReference, 'reference')}
                className="p-2 hover:bg-slate-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copiedField === 'reference' ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} className="text-slate-600" />
                )}
              </button>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
