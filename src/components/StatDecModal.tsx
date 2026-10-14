import { useState, useEffect } from 'react';
import { X, FileCheck, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { StatutoryDeclarationPayload } from '../types/database';
import { formatAppDate } from '../utils/formatters';
import { SignaturePad } from './SignaturePad';

interface DriverData {
  driver_name: string;
  method: string;
}

const HRSG_CARE_OF_ADDRESS = 'c/o: HRSG Australasia Pty Ltd, Level 4, 66 Smith St, Darwin NT 0800';
const WITNESS_OPTIONS = {
  pragati: {
    name: 'Pragati Mahata',
    address: 'U 17-140 Dick Ward Drive, Coconut Grove NT 0810',
    phone: '0451639928',
  },
  jenny: {
    name: 'Jenny Licuanan',
    address: 'U 707/102 Esplanade Darwin NT 0800',
    phone: '0436 288 596',
  },
} as const;
type AddressOption = 'hrsg' | 'manual';
type WitnessOption = keyof typeof WITNESS_OPTIONS;

interface StatDecModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: StatutoryDeclarationPayload) => void;
  infringementNoticeNumber: string;
  vehicleRegistration: string;
  offenceDate: string;
  driverData?: DriverData;
  brandName?: string;
  sourceEmailHtml?: string | null;
  sourceEmailSender?: string;
}

export function StatDecModal({
  isOpen,
  onClose,
  onSubmit,
  infringementNoticeNumber,
  vehicleRegistration,
  offenceDate,
  driverData,
  brandName = 'Fleetcar',
  sourceEmailHtml,
  sourceEmailSender,
}: StatDecModalProps) {
  const getDefaultDriverData = () => {
    if (!driverData?.driver_name) {
      return {
        nominated_driver_name: '',
        nominated_driver_address: '',
        nominated_driver_license_number: '',
        nominated_driver_license_state: 'QLD',
        nominated_driver_license_expiry: '',
        nominated_driver_license_type: '',
        nominated_driver_dob: '',
        signature_declarant: '',
        signature_witness: '',
        witness_name: WITNESS_OPTIONS.pragati.name,
        witness_address: WITNESS_OPTIONS.pragati.address,
        witness_phone: WITNESS_OPTIONS.pragati.phone,
      };
    }

    return {
      nominated_driver_name: driverData.driver_name,
      nominated_driver_address: HRSG_CARE_OF_ADDRESS,
      nominated_driver_license_number: '88392017',
      nominated_driver_license_state: 'NSW',
      nominated_driver_license_expiry: '',
      nominated_driver_license_type: '',
      nominated_driver_dob: '1991-03-14',
      signature_declarant: '',
      signature_witness: '',
      witness_name: WITNESS_OPTIONS.pragati.name,
      witness_address: WITNESS_OPTIONS.pragati.address,
      witness_phone: WITNESS_OPTIONS.pragati.phone,
    };
  };

  const getCompanyName = () => 'HRSG Australasia Pty Ltd';

  const [formData, setFormData] = useState<StatutoryDeclarationPayload>({
    infringement_notice_number: infringementNoticeNumber,
    vehicle_registration: vehicleRegistration,
    offence_date: offenceDate,
    company_name: getCompanyName(),
    declarant_name: 'Paul Stewart Charles MATTHEWS',
    ...getDefaultDriverData(),
  });
  const [addressOption, setAddressOption] = useState<AddressOption>(driverData?.driver_name ? 'hrsg' : 'manual');
  const [witnessOption, setWitnessOption] = useState<WitnessOption>('pragati');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        infringement_notice_number: infringementNoticeNumber,
        vehicle_registration: vehicleRegistration,
        offence_date: offenceDate,
        company_name: getCompanyName(),
        declarant_name: 'Paul Stewart Charles MATTHEWS',
        ...getDefaultDriverData(),
      });
      setAddressOption(driverData?.driver_name ? 'hrsg' : 'manual');
      setWitnessOption('pragati');
    }
  }, [isOpen, driverData, infringementNoticeNumber, vehicleRegistration, offenceDate, brandName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof StatutoryDeclarationPayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressOptionChange = (option: AddressOption) => {
    setAddressOption(option);
    handleChange('nominated_driver_address', option === 'hrsg' ? HRSG_CARE_OF_ADDRESS : '');
  };

  const hasSourceEmail = Boolean(sourceEmailHtml);

  const handleWitnessChange = (option: WitnessOption) => {
    setWitnessOption(option);
    const witness = WITNESS_OPTIONS[option];
    setFormData((prev) => ({
      ...prev,
      witness_name: witness.name,
      witness_address: witness.address,
      witness_phone: witness.phone,
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] md:max-w-6xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileCheck size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Generate Statutory Declaration
              </h2>
              <p className="text-sm text-slate-600">Driver Nomination Form</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className={`p-6 ${hasSourceEmail ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-6'}`}>
            {/* Left column: form fields */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Infringement Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notice Number
                    </label>
                    <input
                      type="text"
                      value={formData.infringement_notice_number}
                      disabled
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Vehicle Registration
                    </label>
                    <input
                      type="text"
                      value={formData.vehicle_registration}
                      disabled
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Offence Date
                    </label>
                    <input
                      type="text"
                      value={formatAppDate(formData.offence_date)}
                      disabled
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Company Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      disabled
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Declarant Name
                    </label>
                    <input
                      type="text"
                      value={formData.declarant_name}
                      disabled
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Nominated Driver Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nominated_driver_name}
                      onChange={(e) => handleChange('nominated_driver_name', e.target.value)}
                      placeholder="Enter driver's full name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Postal / Care-of Address <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addressOption}
                      onChange={(e) => handleAddressOptionChange(e.target.value as AddressOption)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="hrsg">Use HRSG care-of address</option>
                      <option value="manual">Enter a different address</option>
                    </select>
                    <textarea
                      required
                      rows={3}
                      value={formData.nominated_driver_address}
                      onChange={(e) => handleChange('nominated_driver_address', e.target.value)}
                      placeholder="Enter the postal or care-of address to appear on the statutory declaration"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-slate-500">
                      This address will be used for the nominated driver on the statutory declaration.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nominated_driver_license_number}
                      onChange={(e) =>
                        handleChange('nominated_driver_license_number', e.target.value)
                      }
                      placeholder="e.g., 12345678"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      License State <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.nominated_driver_license_state}
                      onChange={(e) =>
                        handleChange('nominated_driver_license_state', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="QLD">Queensland</option>
                      <option value="NSW">New South Wales</option>
                      <option value="VIC">Victoria</option>
                      <option value="SA">South Australia</option>
                      <option value="WA">Western Australia</option>
                      <option value="TAS">Tasmania</option>
                      <option value="NT">Northern Territory</option>
                      <option value="ACT">Australian Capital Territory</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Licence Expiry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.nominated_driver_license_expiry}
                      onChange={(e) => handleChange('nominated_driver_license_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Licence Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nominated_driver_license_type}
                      onChange={(e) => handleChange('nominated_driver_license_type', e.target.value)}
                      placeholder="e.g., C"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.nominated_driver_dob}
                      onChange={(e) => handleChange('nominated_driver_dob', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Declaration Signatures</h3>
                <SignaturePad
                  label="Item 1 — Person making the declaration"
                  value={formData.signature_declarant}
                  onChange={(value) => handleChange('signature_declarant', value)}
                />
                <SignaturePad
                  label="Item 2 — Person before whom the declaration is made"
                  value={formData.signature_witness}
                  onChange={(value) => handleChange('signature_witness', value)}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Declaration Witness</h3>
                <label className="block text-sm font-medium text-slate-700">Item 3 witness</label>
                <select
                  value={witnessOption}
                  onChange={(e) => handleWitnessChange(e.target.value as WitnessOption)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="pragati">Pragati Mahata — Coconut Grove</option>
                  <option value="jenny">Jenny Licuanan — Darwin</option>
                </select>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <div>{formData.witness_name}</div>
                  <div>{formData.witness_address}</div>
                  <div>Tel {formData.witness_phone}</div>
                </div>
              </div>
            </div>

            {/* Right column: source email for comparison */}
            {hasSourceEmail && (
              <div className="lg:sticky lg:top-0 self-start">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-blue-200 bg-blue-50 flex items-center gap-2">
                    <Mail size={16} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                      Source Email — For Comparison
                    </h3>
                  </div>
                  <div className="px-4 py-2.5 border-b border-blue-100 bg-white">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">From:</span>
                      <span>{sourceEmailSender || 'Fleet Client'}</span>
                    </div>
                  </div>
                  <div className="max-h-[55vh] overflow-y-auto bg-white p-4">
                    <div
                      dangerouslySetInnerHTML={{ __html: sourceEmailHtml! }}
                      className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 text-slate-700"
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-900">Verify before submitting</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Compare each field on the left against the driver details in the email. Correct any
                        discrepancies before generating the statutory declaration.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">Quick checklist</p>
                      <ul className="text-xs text-emerald-700 mt-1 space-y-0.5">
                        <li>• Full name matches exactly</li>
                        <li>• Licence number has no typos</li>
                        <li>• Licence state is correct</li>
                        <li>• Date of birth format is correct</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <FileCheck size={18} />
              Generate PDF & Mark as Pending
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
