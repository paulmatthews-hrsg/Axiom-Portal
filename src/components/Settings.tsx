import { useState, useEffect, useRef } from 'react';
import {
  Save,
  CreditCard,
  Gauge,
  Plug,
  CheckCircle2,
  RefreshCw,
  Settings as SettingsIcon,
  DollarSign,
  Clock,
  Scale,
  Percent,
  Car,
  FileSpreadsheet,
  RotateCw,
  Hotel,
  FileSignature,
  SettingsIcon as SettingsGearIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from '../contexts/NavigationContext';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { CopilotReviewPanel } from './CopilotReviewPanel';

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'disconnected';
  lastSync: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  iconBg: string;
}

export function Settings() {
  const [adminFee, setAdminFee] = useState('30.00');
  const [xeroRevenueAccount, setXeroRevenueAccount] = useState('260 - Admin Fee Revenue');
  const [nominationSLA, setNominationSLA] = useState('10');
  const [ocrConfidenceThreshold, setOcrConfidenceThreshold] = useState('98');
  const [autoLockOCR, setAutoLockOCR] = useState(true);
  const [authorizedSignatory, setAuthorizedSignatory] = useState('Jenny Thompson');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const { registerNavigationBlocker, unregisterNavigationBlocker } = useNavigate();
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  const initialValuesRef = useRef({
    adminFee: '30.00',
    xeroRevenueAccount: '260 - Admin Fee Revenue',
    nominationSLA: '10',
    ocrConfidenceThreshold: '98',
    autoLockOCR: true,
    authorizedSignatory: 'Jenny Thompson'
  });

  const integrations: IntegrationStatus[] = [
    { name: 'Fleetio', status: 'connected', lastSync: '2 mins ago', icon: Car, iconColor: 'text-blue-600', iconBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { name: 'Xero', status: 'connected', lastSync: '5 mins ago', icon: FileSpreadsheet, iconColor: 'text-cyan-600', iconBg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { name: 'Loopit', status: 'connected', lastSync: '12 mins ago', icon: RotateCw, iconColor: 'text-purple-600', iconBg: 'bg-purple-50 dark:bg-purple-900/20' },
    { name: 'Lodgify', status: 'connected', lastSync: '8 mins ago', icon: Hotel, iconColor: 'text-orange-600', iconBg: 'bg-orange-50 dark:bg-orange-900/20' },
    { name: 'DocuSign', status: 'connected', lastSync: '3 mins ago', icon: FileSignature, iconColor: 'text-red-600', iconBg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  useEffect(() => {
    const hasChanges =
      adminFee !== initialValuesRef.current.adminFee ||
      xeroRevenueAccount !== initialValuesRef.current.xeroRevenueAccount ||
      nominationSLA !== initialValuesRef.current.nominationSLA ||
      ocrConfidenceThreshold !== initialValuesRef.current.ocrConfidenceThreshold ||
      autoLockOCR !== initialValuesRef.current.autoLockOCR ||
      authorizedSignatory !== initialValuesRef.current.authorizedSignatory;

    setIsDirty(hasChanges);
  }, [adminFee, xeroRevenueAccount, nominationSLA, ocrConfidenceThreshold, autoLockOCR, authorizedSignatory]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    registerNavigationBlocker(
      () => isDirty,
      (proceed) => {
        pendingNavigationRef.current = proceed;
        setShowUnsavedModal(true);
        return false;
      }
    );

    return () => {
      unregisterNavigationBlocker();
    };
  }, [isDirty, registerNavigationBlocker, unregisterNavigationBlocker]);

  const handleKeepEditing = () => {
    setShowUnsavedModal(false);
    pendingNavigationRef.current = null;
  };

  const handleDiscardChanges = () => {
    setShowUnsavedModal(false);
    setIsDirty(false);

    if (pendingNavigationRef.current) {
      const proceed = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      proceed();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    initialValuesRef.current = {
      adminFee,
      xeroRevenueAccount,
      nominationSLA,
      ocrConfidenceThreshold,
      autoLockOCR,
      authorizedSignatory
    };

    setIsDirty(false);
    toast.success('Success: Platform settings updated securely.');
    setIsSaving(false);
  };

  const handleSync = (integrationName: string) => {
    toast.success(`Syncing ${integrationName}...`);
  };

  return (
    <>
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onKeepEditing={handleKeepEditing}
        onDiscardChanges={handleDiscardChanges}
      />

      <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto p-6 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <SettingsIcon size={24} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Platform Settings
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 ml-14">
              Manage global variables, automation thresholds, and API integrations.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg disabled:cursor-not-allowed ${
              isDirty
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl text-white'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            } ${isSaving ? 'bg-blue-400' : ''}`}
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'No Changes'}
          </button>
        </div>

        {/* Section 1: Financial & Billing Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Financial & Billing Controls
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure default fees and billing parameters
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Default Admin Processing Fee
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign size={20} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={adminFee}
                  onChange={(e) => setAdminFee(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-lg"
                  placeholder="30.00"
                />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                This fee is automatically applied to Xero invoices when liability is transferred via the Alibi Engine.
              </p>
            </div>

            <div className="max-w-2xl mt-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Xero Revenue Account Code
              </label>
              <input
                type="text"
                value={xeroRevenueAccount}
                onChange={(e) => setXeroRevenueAccount(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="260 - Admin Fee Revenue"
              />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                The chart of accounts code where admin fees will be mapped in Xero.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Automation & SLA Rules */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-600 rounded-lg">
                <Gauge size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Automation & SLA Rules
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Define thresholds and automation behaviors
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Nomination SLA */}
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nomination SLA Threshold (Days)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Clock size={20} className="text-slate-400" />
                </div>
                <input
                  type="number"
                  value={nominationSLA}
                  onChange={(e) => setNominationSLA(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-lg"
                  placeholder="10"
                  min="1"
                  max="90"
                />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Number of days before an unassigned infringement escalates to the Fleet Manager.
              </p>
            </div>

            {/* OCR Confidence Threshold */}
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                OCR Confidence Threshold (%)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Percent size={20} className="text-slate-400" />
                </div>
                <input
                  type="number"
                  value={ocrConfidenceThreshold}
                  onChange={(e) => setOcrConfidenceThreshold(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-lg"
                  placeholder="98"
                  min="0"
                  max="100"
                />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Minimum confidence level required for automatic OCR approval.
              </p>
            </div>

            {/* Auto-Lock OCR Toggle */}
            <div className="max-w-2xl">
              <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Auto-Lock Verified OCR Data
                    </label>
                    {autoLockOCR && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically approve OCR extraction without Human-in-the-Loop verification when confidence exceeds the threshold above.
                  </p>
                </div>
                <button
                  onClick={() => setAutoLockOCR(!autoLockOCR)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    autoLockOCR ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      autoLockOCR ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Legal & Compliance */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600 rounded-lg">
                <Scale size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Legal & Compliance
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure legal documentation and signatory details
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Default Authorized Signatory
              </label>
              <input
                type="text"
                value={authorizedSignatory}
                onChange={(e) => setAuthorizedSignatory(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Jenny Thompson"
              />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                The authorized corporate officer whose name will automatically populate on generated Statutory Declarations.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Active Integrations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Plug size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Active Integrations
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Monitor and manage external API connections
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {integrations.map((integration) => {
              const IconComponent = integration.icon;
              return (
                <div
                  key={integration.name}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2.5 rounded-lg ${integration.iconBg}`}>
                      <IconComponent size={20} className={integration.iconColor} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {integration.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            Connected
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-500">•</span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Clock size={12} />
                          <span>Synced {integration.lastSync}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(integration.name)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Sync Now"
                    >
                      <RefreshCw size={16} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Configure"
                    >
                      <SettingsGearIcon size={16} className="text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <CopilotReviewPanel />

        {/* Save Button (Bottom) */}
        <div className="flex justify-end pt-2 pb-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all shadow-lg disabled:cursor-not-allowed ${
              isDirty
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl text-white'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            } ${isSaving ? 'bg-blue-400' : ''}`}
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
