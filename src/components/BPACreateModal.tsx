import { useState } from 'react';
import { X, FileSignature, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { BpaAgreement } from '../types/database';

// Cast to a loosely-typed client for bpa_agreements — the typed Database generic
// resolves insert/update payloads to `never` for tables it doesn't know about
// at compile time. This is a known supabase-js typing limitation.
const db = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

interface BPACreateModalProps {
  onClose: () => void;
  onCreated: (bpa: BpaAgreement) => void;
}

const BPA_CATEGORIES = ['Vehicle Supply', 'Parts & Maintenance', 'Fuel', 'Insurance', 'Tyres', 'Logistics', 'Other'];
const BPA_STATUSES = ['Draft', 'Active', 'Expiring Soon', 'Expired', 'Terminated'];
const PAYMENT_TERMS = ['Net 30', 'Net 45', 'Net 60', 'Monthly', 'Prepaid', '50% Deposit', 'COD'];

export function BPACreateModal({ onClose, onCreated }: BPACreateModalProps) {
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Vehicle Supply');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Draft');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const insertData = {
        vendor_name: vendorName.trim(),
        vendor_category: vendorCategory,
        description: description.trim() || null,
        total_value: parseFloat(totalValue) || 0,
        currency: 'AUD',
        start_date: startDate,
        end_date: endDate || null,
        status,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        payment_terms: paymentTerms || null,
        notes: notes.trim() || null,
      };
      const { data, error } = await db
        .from('bpa_agreements')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      onCreated(data as BpaAgreement);
      toast.success(`BPA created: ${data.agreement_number}`);
    } catch (error) {
      console.error('Error creating BPA:', error);
      toast.error('Failed to create agreement');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:opacity-50';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileSignature size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">New Blanket Purchase Agreement</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Create a new vendor contract or supplier agreement</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className={labelClass}>Vendor Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g., Toyota Fleet Sales Australia"
              className={inputClass}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              >
                {BPA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              >
                {BPA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[70px] resize-y`}
              placeholder="Summary of what the agreement covers..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className={labelClass}>Total Contract Value (AUD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">$</span>
              <input
                type="number"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="0.00"
                className={`${inputClass} pl-8`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className={labelClass}>End Date <span className="text-gray-400 text-xs font-normal ml-1">(leave blank for ongoing)</span></label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className={labelClass}>Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              >
                <option value="">Select terms...</option>
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="Monthly Direct Debit">Monthly Direct Debit</option>
                <option value="50% Deposit, 50% on Completion">50% Deposit, 50% on Completion</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[50px] resize-y`}
              placeholder="Internal notes not visible to vendor..."
              disabled={isSubmitting}
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex gap-2 items-start">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>An agreement number (e.g., BPA-000008) will be auto-generated when you save. You can edit all details later from the agreement drawer.</p>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!vendorName.trim() || isSubmitting}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 active:scale-95 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
            } ${!vendorName.trim() ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}
          >
            <Save size={18} />
            {isSubmitting ? 'Creating...' : 'Create Agreement'}
          </button>
        </div>
      </div>
    </div>
  );
}
