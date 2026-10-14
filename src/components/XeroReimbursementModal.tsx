import { X, DollarSign, FileText, Send } from 'lucide-react';
import { useState } from 'react';
import type { XeroReimbursementPayload } from '../types/database';
import { formatCurrency } from '../utils/formatters';

interface XeroReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: XeroReimbursementPayload) => void;
  driverName: string;
  corporateFineAmount: number | null;
  vrn: string;
  referenceNumber: string;
}

export function XeroReimbursementModal({
  isOpen,
  onClose,
  onSubmit,
  driverName,
  corporateFineAmount,
  vrn,
  referenceNumber,
}: XeroReimbursementModalProps) {
  const [reissuedAmount, setReissuedAmount] = useState<string>('30.00');
  const [attachDocuments, setAttachDocuments] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const amount = parseFloat(reissuedAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid admin processing fee amount');
      return;
    }

    onSubmit({
      driver_name: driverName,
      reissued_individual_fine_amount: amount,
      attach_documents: attachDocuments,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] md:max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Process Xero Reimbursement
              </h2>
              <p className="text-sm text-slate-600">Create accounts receivable invoice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">Invoice Summary</h3>
                <p className="text-sm text-blue-800">
                  Creating Accounts Receivable Invoice for <strong>{driverName}</strong>
                </p>
                <div className="text-xs text-blue-700 space-y-1 mt-2">
                  <div>
                    <span className="font-medium">Vehicle:</span> {vrn}
                  </div>
                  <div>
                    <span className="font-medium">Reference:</span> {referenceNumber}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {corporateFineAmount && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-sm text-amber-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Original Corporate Fine Paid:</span>
                  <span className="text-lg font-bold text-amber-700">
                    {formatCurrency(corporateFineAmount)}
                  </span>
                </div>
                <p className="text-xs text-amber-700">
                  This amount was paid by the fleet. The driver will be invoiced for the administrative processing fee below, not the original fine amount.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Admin Processing Fee <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={reissuedAmount}
                onChange={(e) => setReissuedAmount(e.target.value)}
                placeholder="30.00"
                className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-slate-600">
              Enter the administrative fee to charge the driver for processing this liability transfer.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={attachDocuments}
                  onChange={(e) => setAttachDocuments(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Attach Original Fine PDF & Payment Receipt
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Include supporting documentation with the Xero invoice for audit trail purposes.
                  This helps with reconciliation and record-keeping.
                </p>
              </div>
            </label>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
              <li>Xero invoice will be created as Accounts Receivable</li>
              <li>Invoice will be assigned to driver: {driverName}</li>
              <li>Driver will be invoiced for the administrative processing fee, not the original fine amount</li>
              <li>Driver will be notified via email of the fee due</li>
              <li>Payment terms will be set according to company policy</li>
              {attachDocuments && <li>Original fine and payment receipt will be attached</li>}
            </ul>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-150 active:scale-95 flex items-center gap-2"
          >
            <Send size={18} />
            Generate Xero Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
