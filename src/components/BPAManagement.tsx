import { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, Plus, FileSignature, TrendingUp, Clock,
  ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, CheckCircle, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { BpaAgreement } from '../types/database';
import { formatAppDate } from '../utils/formatters';
import { BPADrawer } from './BPADrawer';
import { BPACreateModal } from './BPACreateModal';

type SortColumn = 'agreement_number' | 'vendor_name' | 'vendor_category' | 'total_value' | 'start_date' | 'end_date' | 'status';
type SortDirection = 'asc' | 'desc';

const STATUS_TABS = ['All', 'Active', 'Draft', 'Expiring Soon', 'Expired', 'Terminated'] as const;

function getStatusBadge(status: string) {
  const base = 'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border';
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

function getCategoryIcon(category: string) {
  const iconClass = 'w-4 h-4';
  switch (category) {
    case 'Vehicle Supply':
      return <Building2 className={iconClass} />;
    case 'Parts & Maintenance':
      return <FileSignature className={iconClass} />;
    case 'Fuel':
      return <TrendingUp className={iconClass} />;
    case 'Insurance':
      return <CheckCircle className={iconClass} />;
    case 'Tyres':
      return <AlertCircle className={iconClass} />;
    default:
      return <FileSignature className={iconClass} />;
  }
}

function exportBpaToCSV(data: BpaAgreement[]) {
  const headers = ['Agreement #', 'Vendor', 'Category', 'Description', 'Total Value', 'Currency', 'Start Date', 'End Date', 'Status', 'Contact Name', 'Contact Email', 'Payment Terms'];
  const escape = (v: string | null | undefined) => {
    if (!v) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = data.map((b) => [
    escape(b.agreement_number), escape(b.vendor_name), escape(b.vendor_category),
    escape(b.description), b.total_value.toString(), escape(b.currency),
    escape(b.start_date), escape(b.end_date), escape(b.status),
    escape(b.contact_name), escape(b.contact_email), escape(b.payment_terms),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'bpa-agreements.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BPAManagement() {
  const [agreements, setAgreements] = useState<BpaAgreement[]>([]);
  const [filtered, setFiltered] = useState<BpaAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedBpa, setSelectedBpa] = useState<BpaAgreement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bpa_agreements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      console.error('Error fetching BPAs:', error);
      toast.error('Failed to load agreements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  useEffect(() => {
    let result = [...agreements];
    if (statusFilter !== 'All') {
      result = result.filter((b) => b.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((b) => b.vendor_category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) =>
        b.vendor_name.toLowerCase().includes(q) ||
        b.agreement_number.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.contact_name?.toLowerCase().includes(q)
      );
    }
    if (sortColumn) {
      result.sort((a, b) => {
        let aVal: string | number = a[sortColumn] || '';
        let bVal: string | number = b[sortColumn] || '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    setFiltered(result);
  }, [agreements, statusFilter, categoryFilter, searchQuery, sortColumn, sortDirection]);

  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  }

  function getSortIcon(col: SortColumn) {
    if (sortColumn !== col) return <ArrowUpDown size={12} className="text-slate-400" />;
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="text-blue-600 dark:text-blue-400" />
      : <ArrowDown size={12} className="text-blue-600 dark:text-blue-400" />;
  }

  function handleRowClick(bpa: BpaAgreement) {
    setSelectedBpa(bpa);
    setDrawerOpen(true);
  }

  function handleDrawerUpdate(updated: BpaAgreement) {
    setAgreements((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBpa(updated);
  }

  function handleDrawerDelete(id: string) {
    setAgreements((prev) => prev.filter((b) => b.id !== id));
    setDrawerOpen(false);
    setSelectedBpa(null);
  }

  function handleCreate(newBpa: BpaAgreement) {
    setAgreements((prev) => [newBpa, ...prev]);
    setShowCreateModal(false);
  }

  // KPI calculations
  const totalValue = agreements.reduce((sum, b) => sum + (Number(b.total_value) || 0), 0);
  const activeCount = agreements.filter((b) => b.status === 'Active').length;
  const expiringCount = agreements.filter((b) => b.status === 'Expiring Soon').length;
  const draftCount = agreements.filter((b) => b.status === 'Draft').length;

  const uniqueCategories = Array.from(new Set(agreements.map((b) => b.vendor_category))).sort();

  const columns: { id: SortColumn; label: string }[] = [
    { id: 'agreement_number', label: 'Agreement #' },
    { id: 'vendor_name', label: 'Vendor' },
    { id: 'vendor_category', label: 'Category' },
    { id: 'total_value', label: 'Total Value' },
    { id: 'start_date', label: 'Start Date' },
    { id: 'end_date', label: 'End Date' },
    { id: 'status', label: 'Status' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSignature className="text-blue-600 dark:text-blue-400" size={26} />
              Blanket Purchase Agreements
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage vendor contracts and supplier agreements across the fleet
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-150 active:scale-95 shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline text-sm">New BPA</span>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* KPI Cards */}
        <div className="px-4 md:px-6 pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-5">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Agreements</p>
                  <FileSignature size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{agreements.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{draftCount} in draft</p>
              </div>
            </div>
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-5">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active</p>
                  <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{activeCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Currently in force</p>
              </div>
            </div>
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-5">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Expiring Soon</p>
                  <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{expiringCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Within 90 days</p>
              </div>
            </div>
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-5">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Contract Value</p>
                  <TrendingUp size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  ${totalValue.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">AUD across all BPAs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky filter header */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 shadow-sm mt-4">
          {/* Status tabs */}
          <div className="px-4 md:px-6 pt-4">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                  {tab !== 'All' && (
                    <span className="ml-1.5 text-xs text-slate-400">
                      ({agreements.filter((b) => b.status === tab).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search + actions */}
          <div className="px-4 md:px-6 pb-4 pt-2 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by vendor, agreement #, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer transition-colors"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => { exportBpaToCSV(filtered); toast.success('BPA agreements exported'); }}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Export to CSV"
            >
              <Download size={18} />
              <span className="hidden md:inline text-sm font-medium">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 md:px-6 py-4 md:py-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        onClick={() => handleSort(col.id)}
                        className="bg-white dark:bg-slate-800 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{col.label}</span>
                          {getSortIcon(col.id)}
                        </div>
                      </th>
                    ))}
                    <th className="bg-white dark:bg-slate-800 px-4 py-3">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Description</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                            <FileSignature size={28} className="text-slate-400 dark:text-slate-500" />
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">No agreements found</p>
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                          >
                            Create your first BPA
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((bpa) => (
                      <tr
                        key={bpa.id}
                        onClick={() => handleRowClick(bpa)}
                        className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{bpa.agreement_number}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{bpa.vendor_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            {getCategoryIcon(bpa.vendor_category)}
                            {bpa.vendor_category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            ${Number(bpa.total_value).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">{bpa.currency}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{formatAppDate(bpa.start_date)}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {bpa.end_date ? (
                            <span className="text-sm text-slate-600 dark:text-slate-400">{formatAppDate(bpa.end_date)}</span>
                          ) : (
                            <span className="text-sm text-slate-400 italic">Ongoing</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">{getStatusBadge(bpa.status)}</td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{bpa.description || '—'}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedBpa && (
        <BPADrawer
          bpa={selectedBpa}
          isOpen={drawerOpen}
          onClose={() => { setDrawerOpen(false); setTimeout(() => setSelectedBpa(null), 300); }}
          onUpdate={handleDrawerUpdate}
          onDelete={handleDrawerDelete}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <BPACreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreate}
        />
      )}
    </div>
  );
}
