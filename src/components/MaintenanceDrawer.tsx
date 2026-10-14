import { useState } from 'react';
import { X, FileImage, Sparkles, Eye, CheckCircle, ArrowRight } from 'lucide-react';
import { formatCurrency, formatAppDate } from '../utils/formatters';

interface Invoice {
  id: string;
  vendor: string;
  vrn: string;
  date: string;
  labor_cost: number;
  parts_cost: number;
  tax: number;
  total: number;
  odometer: number;
  status: 'Needs Review' | 'Synced';
}

type DrawerTab = 'verification' | 'overview' | 'audit';

interface MaintenanceDrawerProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
}

export function MaintenanceDrawer({ invoice, isOpen, onClose, onApprove }: MaintenanceDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('verification');

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-[90vw] max-w-6xl bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(invoice.total)}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border font-medium ${
                    invoice.status === 'Needs Review'
                      ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30'
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                {invoice.vendor}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Vehicle: <span className="font-mono font-medium">{invoice.vrn}</span> • {invoice.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-700 -mx-6 px-6">
            <div className="flex gap-6 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab('verification')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'verification'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className={activeTab === 'verification' ? '' : 'text-slate-400'} />
                  Verification
                </div>
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye size={14} className={activeTab === 'overview' ? '' : 'text-slate-400'} />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'audit'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className={activeTab === 'audit' ? '' : 'text-slate-400'} />
                  Audit Log
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'verification' && (
            <div className="h-full grid grid-cols-2 gap-0">
              {/* LEFT PANE - Document Preview */}
              <div className="bg-slate-100 dark:bg-slate-800 flex flex-col justify-center items-center p-8 border-r border-slate-200 dark:border-slate-700 relative">
                <div className="text-center z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-12 rounded-2xl shadow-sm">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
                    <FileImage size={48} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Scanned Invoice: {invoice.vendor}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    PDF document preview would appear here
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Sparkles size={14} className="text-blue-400" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">AI Extracted Data</span>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE - AI Extraction Form */}
              <div className="bg-white dark:bg-slate-900 p-8 overflow-y-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Extracted Data
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Review and verify AI-extracted information before syncing
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Vehicle Registration Number
                      <CheckCircle size={14} className="text-emerald-500" />
                    </label>
                    <input
                      type="text"
                      value={invoice.vrn}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-none cursor-default font-mono"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Current Odometer
                      <CheckCircle size={14} className="text-emerald-500" />
                    </label>
                    <input
                      type="text"
                      value={`${invoice.odometer.toLocaleString()} miles`}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-none cursor-default"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Labor ($)
                      <CheckCircle size={14} className="text-emerald-500" />
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(invoice.labor_cost)}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-none cursor-default"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Parts ($)
                      <CheckCircle size={14} className="text-emerald-500" />
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(invoice.parts_cost)}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-none cursor-default"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tax ($)
                      <CheckCircle size={14} className="text-emerald-500" />
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(invoice.tax)}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-none cursor-default"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Total Invoice Amount
                      <CheckCircle size={14} className="text-emerald-500" />
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(invoice.total)}
                      readOnly
                      className="w-full px-4 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-300 font-bold text-2xl shadow-sm cursor-default"
                    />
                  </div>
                </div>

                {/* Sync Action */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={onApprove}
                    disabled={invoice.status === 'Synced'}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  >
                    {invoice.status === 'Synced' ? (
                      <>
                        <CheckCircle size={20} />
                        Already Synced
                      </>
                    ) : (
                      <>
                        Approve & Sync to Fleetio + Xero
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                  {invoice.status !== 'Synced' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
                      This will create service records in Fleetio and draft AP bills in Xero
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="p-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Invoice Summary</h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Invoice ID</label>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">{invoice.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Vendor</label>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">{invoice.vendor}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Vehicle</label>
                  <p className="text-base font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">{invoice.vrn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Date</label>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">{formatAppDate(invoice.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Odometer</label>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">{invoice.odometer.toLocaleString()} miles</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</label>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">{invoice.status}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Cost Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Labor</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(invoice.labor_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Parts</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(invoice.parts_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Tax</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(invoice.tax)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Total</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="p-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Audit Log</h3>

              <div className="space-y-4">
                <div className="flex gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Invoice uploaded</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">System • {formatAppDate(invoice.date)}</p>
                  </div>
                </div>
                <div className="flex gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">AI extraction completed</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alibi Engine • {formatAppDate(invoice.date)}</p>
                  </div>
                </div>
                {invoice.status === 'Synced' && (
                  <div className="flex gap-4 pb-4">
                    <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Synced to Fleetio and Xero</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">System User • {formatAppDate(new Date().toISOString())}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
