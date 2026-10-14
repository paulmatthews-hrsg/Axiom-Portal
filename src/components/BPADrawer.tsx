import { useState, useEffect } from 'react';
import {
  X, Building2, Mail, Phone, DollarSign, Calendar, FileText, Tag,
  Clock, AlertCircle, Save, Trash2, Edit3, Clock as ClockIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { BpaAgreement } from '../types/database';

// Cast to a loosely-typed client for bpa_agreements — same reason as BPACreateModal.
const db = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};
import { formatAppDate } from '../utils/formatters';

interface BPADrawerProps {
  bpa: BpaAgreement;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: BpaAgreement) => void;
  onDelete: (id: string) => void;
}

type Tab = 'overview' | 'edit';

const BPA_STATUSES = ['Draft', 'Active', 'Expiring Soon', 'Expired', 'Terminated'];
const BPA_CATEGORIES = ['Vehicle Supply', 'Parts & Maintenance', 'Fuel', 'Insurance', 'Tyres', 'Logistics', 'Other'];

function getStatusBadge(status: string) {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-sm border font-medium';
  switch (status) {
    case 'Active':
      return <span className={`${base} bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30`}>Active</span>;
    case 'Draft':
      return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600`}>Draft</span>;
    case 'Expiring Soon':
      return <span className={`${base} bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30`}>Expiring Soon</span>;
    case 'Expired':
      return <span className={`${base} bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-400/30`}>Expired</span>;
    case 'Terminated':
      return <span className={`${base} bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-400/30`}>Terminated</span>;
    default:
      return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300`}>{status}</span>;
  }
}

function getDaysUntilExpiry(endDate: string | null): number | null {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function BPADrawer({ bpa, isOpen, onClose, onUpdate, onDelete }: BPADrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<BpaAgreement>>({});

  useEffect(() => {
    setEditForm({
      vendor_name: bpa.vendor_name,
      vendor_category: bpa.vendor_category,
      description: bpa.description,
      total_value: bpa.total_value,
      start_date: bpa.start_date,
      end_date: bpa.end_date,
      status: bpa.status,
      contact_name: bpa.contact_name,
      contact_email: bpa.contact_email,
      contact_phone: bpa.contact_phone,
      payment_terms: bpa.payment_terms,
      notes: bpa.notes,
    });
    setActiveTab('overview');
  }, [bpa.id]);

  const daysUntilExpiry = getDaysUntilExpiry(bpa.end_date);

  function getExpiryBadge() {
    if (daysUntilExpiry === null) return null;
    if (daysUntilExpiry < 0) {
      return { text: `Expired ${Math.abs(daysUntilExpiry)}d ago`, icon: AlertCircle, className: 'text-red-600 dark:text-red-400' };
    }
    if (daysUntilExpiry <= 90) {
      return { text: `${daysUntilExpiry}d remaining`, icon: Clock, className: 'text-amber-600 dark:text-amber-400' };
    }
    return { text: `${daysUntilExpiry}d remaining`, icon: ClockIcon, className: 'text-emerald-600 dark:text-emerald-400' };
  }

  const expiryBadge = getExpiryBadge();
  const ExpiryIcon = expiryBadge?.icon;

  async function handleSaveEdit() {
    if (!editForm.vendor_name?.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const updateData = {
        vendor_name: editForm.vendor_name,
        vendor_category: editForm.vendor_category,
        description: editForm.description || null,
        total_value: Number(editForm.total_value) || 0,
        start_date: editForm.start_date,
        end_date: editForm.end_date || null,
        status: editForm.status,
        contact_name: editForm.contact_name || null,
        contact_email: editForm.contact_email || null,
        contact_phone: editForm.contact_phone || null,
        payment_terms: editForm.payment_terms || null,
        notes: editForm.notes || null,
      };
      const { data, error } = await db
        .from('bpa_agreements')
        .update(updateData)
        .eq('id', bpa.id)
        .select()
        .single();
      if (error) throw error;
      onUpdate(data as BpaAgreement);
      toast.success('Agreement updated successfully');
      setActiveTab('overview');
    } catch (error) {
      console.error('Error updating BPA:', error);
      toast.error('Failed to update agreement');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setIsSubmitting(true);
    try {
      const { data, error } = await db
        .from('bpa_agreements')
        .update({ status: newStatus })
        .eq('id', bpa.id)
        .select()
        .single();
      if (error) throw error;
      onUpdate(data as BpaAgreement);
      toast.success(`Status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      const { error } = await db
        .from('bpa_agreements')
        .delete()
        .eq('id', bpa.id);
      if (error) throw error;
      toast.success('Agreement deleted');
      onDelete(bpa.id);
    } catch (error) {
      console.error('Error deleting BPA:', error);
      toast.error('Failed to delete agreement');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-screen w-full sm:w-[640px] z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } bg-white dark:bg-slate-900 shadow-2xl flex flex-col`}>
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{bpa.vendor_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{bpa.agreement_number}</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge(bpa.status)}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Tag size={12} />
              {bpa.vendor_category}
            </span>
            {expiryBadge && ExpiryIcon && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${expiryBadge.className}`}>
                <ExpiryIcon size={14} />
                {expiryBadge.text}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex px-6 gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'edit'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Edit3 size={16} />
                Edit Details
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Value card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl p-5 border border-blue-200 dark:border-blue-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Contract Value</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      ${Number(bpa.total_value).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-lg font-medium text-slate-500 ml-1">{bpa.currency}</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
                    <DollarSign size={24} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Date</span>
                  </div>
                  <p className="text-base font-medium text-slate-900 dark:text-slate-100">{formatAppDate(bpa.start_date)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className={expiryBadge?.className?.includes('red') ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Date</span>
                  </div>
                  <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                    {bpa.end_date ? formatAppDate(bpa.end_date) : 'Ongoing — no expiry'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {bpa.description && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    {bpa.description}
                  </p>
                </div>
              )}

              {/* Contact info */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">Vendor Contact</h3>
                <div className="grid grid-cols-1 gap-3">
                  {bpa.contact_name && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Building2 size={18} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{bpa.contact_name}</span>
                    </div>
                  )}
                  {bpa.contact_email && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Mail size={18} className="text-slate-400 flex-shrink-0" />
                      <a href={`mailto:${bpa.contact_email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{bpa.contact_email}</a>
                    </div>
                  )}
                  {bpa.contact_phone && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Phone size={18} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{bpa.contact_phone}</span>
                    </div>
                  )}
                  {bpa.payment_terms && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <DollarSign size={18} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Payment Terms: {bpa.payment_terms}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {bpa.notes && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Internal Notes</label>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
                    {bpa.notes}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p>Created: {formatAppDate(bpa.created_at)}</p>
                <p className="mt-1">Last Updated: {formatAppDate(bpa.updated_at)}</p>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Vendor Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.vendor_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., Toyota Fleet Sales Australia"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={editForm.vendor_category || 'Other'}
                    onChange={(e) => setEditForm({ ...editForm, vendor_category: e.target.value })}
                    className={inputClass}
                  >
                    {BPA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={editForm.status || 'Draft'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className={inputClass}
                  >
                    {BPA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={`${inputClass} min-h-[80px] resize-y`}
                  placeholder="Summary of what the agreement covers..."
                />
              </div>

              <div>
                <label className={labelClass}>Total Value (AUD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={editForm.total_value ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, total_value: parseFloat(e.target.value) || 0 })}
                    className={`${inputClass} pl-8`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input
                    type="date"
                    value={editForm.start_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input
                    type="date"
                    value={editForm.end_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value || null })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input
                    type="text"
                    value={editForm.contact_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.contact_phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Contact Email</label>
                <input
                  type="email"
                  value={editForm.contact_email || ''}
                  onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Payment Terms</label>
                <input
                  type="text"
                  value={editForm.payment_terms || ''}
                  onChange={(e) => setEditForm({ ...editForm, payment_terms: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., Net 30, Net 60, Prepaid"
                />
              </div>

              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className={`${inputClass} min-h-[60px] resize-y`}
                  placeholder="Internal notes not visible to vendor..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        {activeTab === 'edit' ? (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex gap-3 justify-end">
            <button
              onClick={() => setActiveTab('overview')}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSubmitting}
              className={`px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'
              }`}
            >
              <Save size={18} />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : showDeleteConfirm ? (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20 p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Delete this agreement permanently?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Set status:</span>
              <select
                value={bpa.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isSubmitting}
                className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              >
                {BPA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
              >
                <Edit3 size={16} />
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
