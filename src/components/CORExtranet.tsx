import { useState, useEffect } from 'react';
import { Shield, FileText, AlertCircle, CheckCircle, Clock, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Infringement } from '../types/database';
import { useRBAC } from '../contexts/RBACContext';
import { formatAppDate } from '../utils/formatters';

export function CORExtranet() {
  const [infringement, setInfringement] = useState<Infringement | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasResponded, setHasResponded] = useState(false);
  const { currentUser } = useRBAC();

  useEffect(() => {
    fetchPendingInfringement();
  }, []);

  async function fetchPendingInfringement() {
    setLoading(true);

    const { data } = await supabase
      .from('infringements')
      .select('*')
      .eq('vrn', 'ABC123')
      .eq('customer_base', 'Fleetcar')
      .maybeSingle();

    setInfringement(data);
    setLoading(false);
  }

  async function handleConfirmDriver() {
    if (!infringement) return;

    await supabase
      .from('activity_logs')
      .insert({
        infringement_id: infringement.id,
        action_type: 'COR_CONFIRMED',
        action_description: `${currentUser.name} confirmed they were the driver at time of offence`,
        performed_by: currentUser.name,
        metadata: {
          cor_officer: currentUser.name,
          confirmed_at: new Date().toISOString(),
        },
      });

    setHasResponded(true);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading secure extranet...</p>
        </div>
      </div>
    );
  }

  if (!infringement) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md text-center">
          <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">All Clear</h2>
          <p className="text-slate-600">
            You have no pending infringement notices awaiting your response at this time.
          </p>
        </div>
      </div>
    );
  }

  if (hasResponded) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md text-center">
          <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Response Recorded</h2>
          <p className="text-slate-600 mb-6">
            Thank you for confirming your details. The Marine Motion fleet team will process this
            infringement and handle the statutory declaration.
          </p>
          <p className="text-sm text-slate-500">
            You will receive a confirmation email shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 overflow-auto">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Marine Motion Secure Extranet</h1>
              <p className="text-sm text-slate-600">COR Officer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-slate-100 rounded-lg w-fit">
            <Lock size={14} className="text-slate-600" />
            <span className="text-xs font-medium text-slate-700">
              Logged in as: {currentUser.name} ({currentUser.email})
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Action Required</h3>
              <p className="text-sm text-amber-800">
                You have been identified as the responsible officer for a vehicle infringement. Please
                review the details below and confirm your information.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Infringement Notice Details</h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Vehicle Registration</p>
                <p className="text-lg font-bold text-slate-900">{infringement.vrn}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Reference Number</p>
                <p className="text-lg font-mono font-semibold text-slate-900">
                  {infringement.reference_number}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Offence Type</p>
                <p className="text-sm text-slate-900">{infringement.offence_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Offence Date</p>
                <p className="text-sm text-slate-900">
                  {formatAppDate(infringement.offence_date)} at {new Date(infringement.offence_date).toLocaleTimeString('en-AU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {infringement.offence_location && (
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Location</p>
                <p className="text-sm text-slate-900">{infringement.offence_location}</p>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-slate-600" />
                <p className="text-xs font-semibold text-slate-700">Notice Document</p>
              </div>
              <div className="bg-white rounded border border-slate-300 p-8 text-center">
                <FileText size={48} className="text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Infringement Notice PDF</p>
                <p className="text-xs text-slate-500 mt-1">
                  {infringement.reference_number}.pdf
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Confirm Your Details</h2>
          </div>

          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> By confirming below, you acknowledge that you were the
                responsible officer operating this vehicle at the time of the alleged offence. The
                Marine Motion fleet team will submit a statutory declaration on behalf of the company
                nominating you as the driver.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Clock size={20} className="text-slate-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    Were you operating vehicle {infringement.vrn} at this time?
                  </p>
                  <p className="text-xs text-slate-600">
                    {formatAppDate(infringement.offence_date)} at {new Date(infringement.offence_date).toLocaleTimeString('en-AU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleConfirmDriver}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <CheckCircle size={20} />
                Yes, I Confirm I Was the Driver
              </button>
              <button
                disabled
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-400 rounded-lg cursor-not-allowed font-medium"
              >
                No, I Was Not the Driver
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              If you were not the driver, please contact the Marine Motion fleet team directly at
              fleet@marinemotion.com.au
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Marine Motion Group • Secure COR Extranet Portal</p>
          <p className="mt-1">All actions are logged and audited for compliance purposes</p>
        </div>
      </div>
    </div>
  );
}
