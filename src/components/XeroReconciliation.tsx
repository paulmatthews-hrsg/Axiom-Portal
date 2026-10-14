import { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { formatCurrency, formatAppDate } from '../utils/formatters';

interface XeroReconciliationProps {
  ocrData: {
    amount: number;
    referenceNumber: string;
    issueDate: string;
    vrn: string;
  };
  databaseData: {
    amount: number | null;
    referenceNumber: string | null;
    dateReceived: string;
    vrn: string;
  };
  onApprove: () => void;
  onReject: () => void;
}

export function XeroReconciliation({
  ocrData,
  databaseData,
  onApprove,
  onReject,
}: XeroReconciliationProps) {
  const [editableAmount, setEditableAmount] = useState<string>(databaseData.amount?.toString() || '');
  const [editableReference, setEditableReference] = useState<string>(databaseData.referenceNumber || '');
  const [editableVrn, setEditableVrn] = useState<string>(databaseData.vrn || '');
  const [editableDate, setEditableDate] = useState<string>(databaseData.dateReceived || '');

  const amountsMatch = ocrData.amount === databaseData.amount;
  const referencesMatch = ocrData.referenceNumber === databaseData.referenceNumber;
  const vrnsMatch = ocrData.vrn === databaseData.vrn;
  const allMatch = amountsMatch && referencesMatch && vrnsMatch;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-blue-600 rounded-lg">
          <AlertCircle size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Verify Extracted Data
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Compare OCR-extracted data with the original source document
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0">
          <div className="p-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              OCR Extracted
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Fine Amount</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(ocrData.amount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Reference Number</div>
                <div className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {ocrData.referenceNumber}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">VRN/Rego</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {ocrData.vrn}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Issue Date</div>
                <div className="text-slate-700 dark:text-slate-300">
                  {formatAppDate(ocrData.issueDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={onApprove}
              className="w-full px-6 py-4 rounded-lg flex items-center justify-center gap-2 font-bold text-base shadow-lg transition-all duration-200 bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Check size={24} strokeWidth={3} />
              <span>Verify & Lock Data</span>
            </button>
          </div>

          <div className="p-6 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Proposed Record (Editable)
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Fine Amount</div>
                <input
                  type="number"
                  value={editableAmount}
                  onChange={(e) => setEditableAmount(e.target.value)}
                  className="w-full px-3 py-2 text-2xl font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Reference Number</div>
                <input
                  type="text"
                  value={editableReference}
                  onChange={(e) => setEditableReference(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-lg font-semibold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Reference number"
                />
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">VRN/Rego</div>
                <input
                  type="text"
                  value={editableVrn}
                  onChange={(e) => setEditableVrn(e.target.value)}
                  className="w-full px-3 py-2 font-semibold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Vehicle registration"
                />
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Issue Date</div>
                <input
                  type="date"
                  value={editableDate}
                  onChange={(e) => setEditableDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-sm">
        <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
          <Check size={16} className="text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-blue-700 dark:text-blue-400 leading-relaxed">
          Please compare extracted data against the original PDF document. Correct any errors in the proposed record, then click 'Verify & Lock Data' to save to PennyOS.
        </p>
      </div>
    </div>
  );
}
