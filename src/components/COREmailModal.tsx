import { useState } from 'react';
import { X, Mail, Send, MapPin, Clock, Car, User, Paperclip, FileText, Image, Check, Square } from 'lucide-react';
import { formatVehicleDescription, formatAppDate } from '../utils/formatters';

interface COREmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  vrn: string;
  offenceDate: string;
  offenceLocation: string;
  offenceType: string;
  speed?: string;
  speedLimit?: string;
  driverName?: string;
  fleetioAssetId?: string;
  referenceNumber: string;
  customerBase: 'GigCar' | 'Fleetcar' | 'Yonder';
  vehicleColor?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  registrationState?: string;
  hasEvidencePhoto?: boolean;
  hasTelemetry?: boolean;
}

export function COREmailModal({
  isOpen,
  onClose,
  onSend,
  vrn,
  offenceDate,
  offenceLocation,
  offenceType,
  speed,
  speedLimit,
  driverName,
  fleetioAssetId,
  referenceNumber,
  customerBase,
  vehicleColor,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  registrationState,
  hasEvidencePhoto = true,
  hasTelemetry = true,
}: COREmailModalProps) {
  const [includePdf, setIncludePdf] = useState(true);
  const [includePhoto, setIncludePhoto] = useState(true);
  const [includeForm, setIncludeForm] = useState(true);
  const [includeGeotab, setIncludeGeotab] = useState(true);

  if (!isOpen) return null;

  const vehicleDescription = formatVehicleDescription(
    vrn,
    vehicleColor,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    registrationState
  );

  const formattedDate = formatAppDate(offenceDate);

  const formattedTime = new Date(offenceDate).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getRecipientInfo = () => {
    switch (customerBase) {
      case 'Fleetcar':
        return {
          name: 'Capt. Sarah Jenkins',
          email: 's.jenkins@marines.mil',
          role: 'Contract Office Representative'
        };
      case 'GigCar':
        return {
          name: 'Fleet Operations',
          email: 'fleet.ops@gigcar.com.au',
          role: 'Fleet Manager'
        };
      case 'Yonder':
        return {
          name: 'Fleet Coordinator',
          email: 'fleet@yonder.com.au',
          role: 'Fleet Manager'
        };
    }
  };

  const recipient = getRecipientInfo();

  const getBrandName = () => {
    switch (customerBase) {
      case 'Fleetcar':
        return 'Fleetcar';
      case 'GigCar':
        return 'GigCar';
      case 'Yonder':
        return 'Yonder Campers';
      default:
        return 'Fleetcar';
    }
  };

  const brandName = getBrandName();

  const brandConfig = {
    'Fleetcar': {
      accentColor: 'border-[#00447C]',
      logoUrl: null // Strict DoD rule: No embedded images
    },
    'GigCar': {
      accentColor: 'border-[#E96146]',
      logoUrl: '/Gigcar_Logo.png'
    },
    'Yonder Campers': {
      accentColor: 'border-[#C51A20]',
      logoUrl: '/Yonder_Logo.png'
    }
  };

  const { accentColor, logoUrl } = brandConfig[brandName] || brandConfig['Fleetcar'];

  const getAttachmentText = () => {
    return 'To assist with your internal investigation, please find attached the original infringement notice, an extracted driver photograph, and the corresponding vehicle telemetry report.';
  };

  const handleSend = () => {
    onSend();
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] md:max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Preview Driver Nomination Request
              </h2>
              <p className="text-sm text-slate-600">Review before sending to client POC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-300">
              <div className="flex-1">
                <div className="text-sm text-slate-600 mb-1">To:</div>
                <div className="font-medium text-slate-900">
                  {recipient.name} &lt;{recipient.email}&gt;
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{recipient.role}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 mb-1">From:</div>
                <div className="font-medium text-slate-900">{brandName} Compliance Team</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-slate-600 mb-1">Subject:</div>
              <div className="font-semibold text-slate-900 text-lg">
                Action Required: Driver Nomination Request - {vehicleDescription}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 space-y-4 border border-slate-200">
              <div>
                <p className="text-slate-900 mb-4">Dear Fleet Manager,</p>
                <p className="text-slate-900 mb-4">
                  We are writing to notify you of a traffic infringement involving a vehicle currently assigned to your fleet group: <strong>{vehicleDescription}</strong>.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin size={18} />
                  Infringement Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Clock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-slate-900 font-bold">Date & Time:</span>{' '}
                      <span className="text-slate-900">
                        {formattedDate} at {formattedTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-slate-900 font-bold">Location:</span>{' '}
                      <span className="text-slate-900">{offenceLocation}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Car size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-slate-900 font-bold">Offence:</span>{' '}
                      <span className="text-slate-900">
                        {offenceType}
                        {speed && speedLimit && ` - ${speed}km/h in a ${speedLimit}km/h zone`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-slate-900 font-bold">Reference Number:</span>{' '}
                      <span className="text-slate-900">{referenceNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {getAttachmentText() && (
                <p className="text-slate-900 mb-4">
                  {getAttachmentText()}
                </p>
              )}

              <div className={`bg-white border-l-4 ${accentColor} rounded-lg p-4 shadow-sm`}>
                <h3 className="font-bold text-slate-900 text-base mb-2">Action Required</h3>
                {brandName === 'Fleetcar' && includeForm ? (
                  <p className="text-sm text-slate-900 mb-3">
                    Please open and complete the attached <strong>Fillable PDF form (DoD_Driver_Nomination_Form.pdf)</strong> with
                    the driver's details, and reply directly to this email with the completed file attached.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-900 mb-3">
                      Please conduct an internal review and reply directly to this email within <strong>7 days</strong> with
                      the following driver details, allowing us to formally transfer legal liability via Statutory Declaration:
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-900 space-y-1 ml-2">
                      <li>Driver's full legal name</li>
                      <li>Driver's residential address</li>
                      <li>Date of birth</li>
                      <li>Driver's license number and issuing state</li>
                    </ul>
                  </>
                )}
              </div>

              <div>
                <p className="text-slate-900 mb-4">
                  This information is legally required to identify the responsible party. Failure to nominate a driver within the specified timeframe may result in your entity remaining liable for the fine, including any associated corporate multipliers or administrative fees.
                </p>
                <p className="text-slate-900 mb-4">
                  If you require clarification, please reach out to our team.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-slate-900 mb-1">Kind regards,</p>
                <p className="font-semibold text-slate-900">{brandName} Compliance Team</p>
                <p className="text-sm text-slate-600">Traffic Infringement Management</p>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={`${brandName} Logo`}
                    className="h-8 object-contain mt-4"
                  />
                )}
              </div>

              <div className="bg-slate-100 rounded p-3 text-xs text-slate-600 mt-4">
                <p className="font-medium mb-1">Legal Notice:</p>
                <p>
                  This communication is being sent in accordance with obligations under state
                  road traffic legislation. All information provided will be treated confidentially
                  and used solely for the purpose of statutory declaration preparation and
                  infringement processing.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip size={18} className="text-slate-600" />
                  <span className="font-semibold text-slate-900">
                    Attachments ({[
                      includePdf,
                      hasEvidencePhoto && includePhoto,
                      brandName === 'Fleetcar' && includeForm,
                      hasTelemetry && includeGeotab
                    ].filter(Boolean).length})
                  </span>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setIncludePdf(!includePdf)}
                    className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-150 ${
                      includePdf
                        ? 'bg-white border-2 border-blue-500 hover:bg-blue-50'
                        : 'bg-slate-100 border-2 border-slate-300 opacity-50 hover:opacity-70'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${includePdf ? 'text-blue-600' : 'text-slate-400'}`}>
                      {includePdf ? <Check size={20} /> : <Square size={20} />}
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      includePdf ? 'bg-red-100' : 'bg-slate-200'
                    }`}>
                      <FileText size={20} className={includePdf ? 'text-red-600' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-sm font-medium truncate ${
                        includePdf ? 'text-slate-900' : 'text-slate-500'
                      }`}>
                        INF-{referenceNumber}_Original.pdf
                      </p>
                      <p className={`text-xs ${includePdf ? 'text-slate-600' : 'text-slate-400'}`}>
                        1.2 MB
                      </p>
                    </div>
                  </button>
                  {hasEvidencePhoto && (
                    <button
                      onClick={() => setIncludePhoto(!includePhoto)}
                      className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-150 ${
                        includePhoto
                          ? 'bg-white border-2 border-blue-500 hover:bg-blue-50'
                          : 'bg-slate-100 border-2 border-slate-300 opacity-50 hover:opacity-70'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${includePhoto ? 'text-blue-600' : 'text-slate-400'}`}>
                        {includePhoto ? <Check size={20} /> : <Square size={20} />}
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        includePhoto ? 'bg-blue-100' : 'bg-slate-200'
                      }`}>
                        <Image size={20} className={includePhoto ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${
                          includePhoto ? 'text-slate-900' : 'text-slate-500'
                        }`}>
                          Extracted_Driver_Photo.jpg
                        </p>
                        <p className={`text-xs ${includePhoto ? 'text-slate-600' : 'text-slate-400'}`}>
                          850 KB
                        </p>
                      </div>
                    </button>
                  )}
                  {brandName === 'Fleetcar' && (
                    <button
                      onClick={() => setIncludeForm(!includeForm)}
                      className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-150 ${
                        includeForm
                          ? 'bg-white border-2 border-blue-500 hover:bg-blue-50'
                          : 'bg-slate-100 border-2 border-slate-300 opacity-50 hover:opacity-70'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${includeForm ? 'text-blue-600' : 'text-slate-400'}`}>
                        {includeForm ? <Check size={20} /> : <Square size={20} />}
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        includeForm ? 'bg-green-100' : 'bg-slate-200'
                      }`}>
                        <FileText size={20} className={includeForm ? 'text-green-600' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${
                          includeForm ? 'text-slate-900' : 'text-slate-500'
                        }`}>
                          📝 DoD_Driver_Nomination_Form.pdf
                        </p>
                        <p className={`text-xs ${includeForm ? 'text-slate-600' : 'text-slate-400'}`}>
                          45 KB
                        </p>
                      </div>
                    </button>
                  )}
                  {hasTelemetry && (
                    <button
                      onClick={() => setIncludeGeotab(!includeGeotab)}
                      className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-150 ${
                        includeGeotab
                          ? 'bg-white border-2 border-blue-500 hover:bg-blue-50'
                          : 'bg-slate-100 border-2 border-slate-300 opacity-50 hover:opacity-70'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${includeGeotab ? 'text-blue-600' : 'text-slate-400'}`}>
                        {includeGeotab ? <Check size={20} /> : <Square size={20} />}
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        includeGeotab ? 'bg-purple-100' : 'bg-slate-200'
                      }`}>
                        <FileText size={20} className={includeGeotab ? 'text-purple-600' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${
                          includeGeotab ? 'text-slate-900' : 'text-slate-500'
                        }`}>
                          🗺️ Trip_Telemetry_Report.pdf
                        </p>
                        <p className={`text-xs ${includeGeotab ? 'text-slate-600' : 'text-slate-400'}`}>
                          1.5 MB
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
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
            onClick={handleSend}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-150 active:scale-95 flex items-center gap-2"
          >
            <Send size={18} />
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}
