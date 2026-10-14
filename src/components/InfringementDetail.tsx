import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Truck,
  Mail,
  FileCheck,
  CreditCard,
  Check,
  CheckCircle2,
  Clock,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Key,
  Power,
  MoreHorizontal,
  XCircle,
  Image,
  Paperclip,
  ImageOff,
  WifiOff,
  Sparkles,
  Database
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggeriPaaSWorkflow } from '../lib/webhook';
import type { Infringement, ActivityLog, AuditLog, StatutoryDeclarationPayload, XeroReimbursementPayload } from '../types/database';
import { ComplianceAuditLog } from './ComplianceAuditLog';
import { formatAppDate } from '../utils/formatters';
import { mockFleetioData, mockGeotabData } from '../data/mockIntegrations';
import { StatDecModal } from './StatDecModal';
import { COREmailModal } from './COREmailModal';
import { NoticeMetadata } from './NoticeMetadata';
import { XeroReimbursementModal } from './XeroReimbursementModal';
import { XeroReconciliation } from './XeroReconciliation';
import { GeotabMapReplay } from './GeotabMapReplay';
import { QuickAddMenu } from './QuickAddMenu';

interface InfringementDetailProps {
  infringement: Infringement;
  onBack: () => void;
}

const MARINE_WORKFLOW_STEPS = [
  { id: 1, label: 'Upload & Receipt', icon: FileText },
  { id: 2, label: 'Driver Nomination', icon: MapPin },
  { id: 3, label: 'Stat Dec Generation', icon: FileCheck },
  { id: 4, label: 'Fleet Payment', icon: CreditCard },
  { id: 5, label: 'Xero Reconciliation', icon: Check },
  { id: 6, label: 'Closed', icon: Check },
];

export function InfringementDetail({ infringement, onBack }: InfringementDetailProps) {
  const brandAssets = {
    'Fleetcar': { light: '/Fleetcar_Logo.png', dark: '/Fleetcar_negative.png' },
    'GigCar': { light: '/Gigcar_Logo.png', dark: '/gigcar_negative.png' },
    'Yonder': { light: '/Yonder_Logo.png', dark: '/Yonder_negative.png' }
  };

  const brandName = infringement.customer_base;
  const currentBrand = brandAssets[brandName as keyof typeof brandAssets] || brandAssets['Fleetcar'];

  const stepToStatusMap: Record<number, string> = {
    1: 'New',
    2: 'Pending Driver Nomination',
    3: 'Stat Dec Pending',
    4: 'Pending Fleet Payment',
    5: 'Awaiting Reimbursement (Xero)',
    6: 'Closed',
  };

  const statusToStepMap: Record<string, number> = {
    'New': 1,
    'Pending Driver Nomination': 2,
    'Awaiting Driver Nomination': 2,
    'Stat Dec Pending': 3,
    'Awaiting Signature': 3,
    'Ready for Submission': 3,
    'Pending Fleet Payment': 4,
    'Awaiting Reimbursement (Xero)': 5,
    'Closed': 6,
  };

  const [hasEvidencePhoto, setHasEvidencePhoto] = useState(true);
  const [hasTelemetry, setHasTelemetry] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(infringement.status);
  const [currentStep, setCurrentStep] = useState(1);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isStatDecModalOpen, setIsStatDecModalOpen] = useState(false);
  const [isCOREmailModalOpen, setIsCOREmailModalOpen] = useState(false);
  const [isXeroModalOpen, setIsXeroModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [pendingRevertStep, setPendingRevertStep] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [ocrProcessed, setOcrProcessed] = useState(infringement.ocr_verified);
  const [dataVerified, setDataVerified] = useState(infringement.ocr_verified);
  const [showVerificationBlock, setShowVerificationBlock] = useState(infringement.status === 'New');
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  const fleetioData = mockFleetioData.find((v) => v.vrn === infringement.vrn);
  const geotabData = mockGeotabData.find((t) => t.vrn === infringement.vrn);

  const hasAPIDriverIdentified = geotabData?.driver_identification?.verified && hasTelemetry;
  const isDriverNominationStepComplete = statusToStepMap[currentStatus] > 2;
  const [driverAutoIdentified, setDriverAutoIdentified] = useState(
    hasAPIDriverIdentified && isDriverNominationStepComplete
  );

  useEffect(() => {
    fetchActivityLogs();
    fetchAuditLogs();
    determineCurrentStep();
    initializeOCRProcessing();

    if (hasAPIDriverIdentified && isDriverNominationStepComplete) {
      setDriverAutoIdentified(true);
    }
  }, [infringement]);

  useEffect(() => {
    determineCurrentStep();
  }, [currentStatus]);

  async function initializeOCRProcessing() {
    if (!infringement.ocr_verified && infringement.status === 'New') {
      setShowVerificationBanner(true);
      await createAuditLog(
        'System (DocAI)',
        'system',
        '10.0.0.1',
        'Executed zero-retention data extraction. FIPS-140-2 Encrypted payload saved to database.'
      );
    }
  }

  async function fetchActivityLogs() {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('infringement_id', infringement.id)
      .order('created_at', { ascending: false });

    setActivityLogs(data || []);
  }

  async function fetchAuditLogs() {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('infringement_id', infringement.id)
      .order('timestamp', { ascending: false });

    setAuditLogs(data || []);
  }

  async function createAuditLog(actor: string, actorType: 'user' | 'system', ipAddress: string, action: string) {
    await supabase.from('audit_logs').insert({
      infringement_id: infringement.id,
      actor,
      actor_type: actorType,
      ip_address: ipAddress,
      action,
    });
    fetchAuditLogs();
  }

  function determineCurrentStep() {
    setCurrentStep(statusToStepMap[currentStatus] || 1);
  }

  function handleStepClick(stepId: number) {
    if (stepId >= currentStep) return;

    setPendingRevertStep(stepId);
    setIsRevertModalOpen(true);
  }

  async function confirmRevert() {
    if (pendingRevertStep === null) return;

    const stepId = pendingRevertStep;
    const newStatus = stepToStatusMap[stepId];
    if (!newStatus) return;

    setIsRevertModalOpen(false);
    setLoading(true);

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      `Manually reverted workflow from ${currentStatus} to ${newStatus}. Downstream documents voided.`
    );

    await logActivity(
      'WORKFLOW_REVERT',
      `Workflow reverted to ${MARINE_WORKFLOW_STEPS[stepId - 1].label}`,
      {
        previous_status: currentStatus,
        new_status: newStatus,
        reverted_to_step: stepId,
      }
    );

    const updates: Record<string, unknown> = { status: newStatus };

    if (stepId === 1) {
      updates.ocr_verified = false;
      updates.ocr_verified_at = null;
      updates.ocr_verified_by = null;
      setDataVerified(false);
      setShowVerificationBlock(true);
    }

    await supabase
      .from('infringements')
      .update(updates)
      .eq('id', infringement.id);

    setCurrentStatus(newStatus);
    setPendingRevertStep(null);
    setLoading(false);

    toast.warning(`Workflow Reverted to ${MARINE_WORKFLOW_STEPS[stepId - 1].label}`, {
      description: 'Downstream documents voided',
    });
  }

  async function handleVoidInfringement() {
    if (!voidReason.trim()) {
      toast.error('Please provide a reason for voiding this infringement');
      return;
    }

    setIsVoidModalOpen(false);
    setLoading(true);

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      `Infringement voided. Reason: ${voidReason}`
    );

    await logActivity(
      'INFRINGEMENT_VOIDED',
      `Case permanently closed and voided`,
      {
        previous_status: currentStatus,
        void_reason: voidReason,
        voided_by: 'Jenny (Admin)',
      }
    );

    await supabase
      .from('infringements')
      .update({ status: 'Voided' })
      .eq('id', infringement.id);

    setCurrentStatus('Voided');
    setVoidReason('');
    setLoading(false);

    toast.error('Infringement Voided', {
      description: 'Reason logged to audit trail',
    });
  }

  async function logActivity(actionType: string, description: string, metadata: Record<string, unknown> = {}) {
    await supabase.from('activity_logs').insert({
      infringement_id: infringement.id,
      action_type: actionType,
      action_description: description,
      performed_by: 'System',
      metadata,
    });
    fetchActivityLogs();
  }

  async function handleApproveExtraction() {
    setLoading(true);

    const hasDriverIdentified = geotabData?.driver_identification?.verified && hasTelemetry;
    const targetStatus = hasDriverIdentified ? 'Stat Dec Pending' : 'Pending Driver Nomination';
    const targetStep = hasDriverIdentified ? 3 : 2;

    await supabase
      .from('infringements')
      .update({
        ocr_verified: true,
        ocr_verified_at: new Date().toISOString(),
        ocr_verified_by: 'Jenny (Admin)',
        status: targetStatus,
      })
      .eq('id', infringement.id);

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      'Approved OCR data extraction. Human verification complete. Data locked for workflow processing.'
    );

    if (hasDriverIdentified) {
      await createAuditLog(
        'System (Alibi Engine)',
        'system',
        '10.0.0.1',
        `AI/Telemetry auto-identified driver: ${geotabData.driver_identification.driver_name}. Skipping manual Driver Nomination step.`
      );
      setDriverAutoIdentified(true);

      toast.success('OCR Data Verified & Driver Auto-Identified', {
        description: `Alibi Engine identified ${geotabData.driver_identification.driver_name} - Skip to Stat Dec`,
      });
    } else {
      toast.success('OCR Data Verified and Locked', {
        description: 'Financial metadata ready for workflow processing',
      });
    }

    setOcrProcessed(true);
    setDataVerified(true);
    setShowVerificationBanner(true);
    setCurrentStatus(targetStatus);
    setCurrentStep(targetStep);
    setLoading(false);
  }

  async function handleUndoVerification() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await supabase
      .from('infringements')
      .update({
        ocr_verified: false,
        status: 'New',
      })
      .eq('id', infringement.id);

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      'Reverted OCR verification. Data unlocked for re-review.'
    );

    setOcrProcessed(false);
    setDataVerified(false);
    setShowVerificationBanner(false);
    setDriverAutoIdentified(false);
    setCurrentStatus('New');
    setCurrentStep(1);
    setLoading(false);

    toast.info('Verification Undone', {
      description: 'OCR data unlocked for re-review',
    });
  }

  function handleOCRVerificationComplete() {
    if (!ocrProcessed) {
      setOcrProcessed(true);
    }
  }

  async function handleSendCOREmail() {
    setLoading(true);
    setIsCOREmailModalOpen(false);

    const recipientMap: Record<string, { name: string; email: string }> = {
      Fleetcar: { name: 'Capt. Sarah Jenkins', email: 's.jenkins@marines.mil' },
      GigCar: { name: 'Fleet Operations', email: 'fleet.ops@gigcar.com.au' },
      Yonder: { name: 'Fleet Coordinator', email: 'fleet@yonder.com.au' },
    };
    const recipient = recipientMap[brandName as string] || recipientMap['Fleetcar'];
    const subject = `Driver Nomination Required | TIN: ${infringement.reference_number || 'N/A'} | Date of Issue: ${formatAppDate(infringement.date_received)}`;
    const bodyHtml = `<p>Dear Fleet Manager,</p><p>We are writing to request driver nomination details for the traffic infringement involving vehicle <strong>${infringement.vrn}</strong>.</p><p><strong>Reference:</strong> ${infringement.reference_number || 'N/A'}<br><strong>Offence:</strong> ${infringement.offence_type}<br><strong>Date:</strong> ${infringement.offence_date}<br><strong>Location:</strong> ${infringement.offence_location || 'Location not specified'}</p><p>Please reply with the responsible driver's details within 7 days.</p><p>Kind regards,<br>${brandName} Compliance Team</p>`;

    const emailPayload = {
      infringement_id: infringement.id,
      reference_number: infringement.reference_number || 'N/A',
      vrn: infringement.vrn,
      offence_type: infringement.offence_type,
      offence_date: infringement.offence_date,
      offence_location: infringement.offence_location || 'Location not specified',
      speed: geotabData?.speed || null,
      speed_limit: geotabData?.speed_limit || null,
      driver_name: geotabData?.driver || null,
      customer_base: infringement.customer_base,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      sender_name: `${brandName} Compliance Team`,
      sender_email: 'infringements@hrsg.com.au',
      subject,
      body_html: bodyHtml,
      vehicle_make: fleetioData?.make || null,
      vehicle_model: fleetioData?.model || null,
      vehicle_year: fleetioData?.year || null,
      vehicle_color: fleetioData?.color || null,
      registration_state: fleetioData?.registration_state || null,
    };

    const result = await triggeriPaaSWorkflow('SEND_DRIVER_NOMINATION_EMAIL', emailPayload);

    const logStatus = result.success ? 'sent' : 'failed';
    const errorMessage = result.success ? null : (result.reason || result.error?.toString() || 'Unknown error');

    await supabase.from('email_logs').insert({
      infringement_id: infringement.id,
      recipient_email: recipient.email,
      recipient_name: recipient.name,
      subject,
      body_html: `Driver nomination request for ${infringement.vrn} - ${infringement.offence_type} on ${infringement.offence_date}. Sent via Make Gmail integration.`,
      status: logStatus,
      error_message: errorMessage,
      sent_by: 'Jenny (Admin)',
    });

    if (result.success) {
      await logActivity(
        'DRIVER_NOMINATION_REQUESTED',
        `Driver nomination request sent to ${recipient.name} (${recipient.email})`,
        { recipient: recipient.email, driver_name: geotabData?.driver, vrn: infringement.vrn, offence_type: infringement.offence_type }
      );

      await createAuditLog(
        'Jenny (Admin)',
        'user',
        '192.168.1.45',
        `Sent driver nomination email to ${recipient.name} (${recipient.email}) for ${infringement.vrn} via Make Gmail module`
      );

      await supabase
        .from('infringements')
        .update({ status: 'Awaiting Driver Nomination' })
        .eq('id', infringement.id);

      setCurrentStatus('Awaiting Driver Nomination');
      toast.success('Driver Nomination Request Sent', {
        description: `Email delivered to ${recipient.email} via Gmail`,
      });
    } else {
      await createAuditLog(
        'Jenny (Admin)',
        'user',
        '192.168.1.45',
        `Failed to send driver nomination email to ${recipient.email} for ${infringement.vrn}. Error: ${errorMessage}`
      );

      toast.error('Email Send Failed', {
        description: errorMessage || 'Check Make webhook configuration',
      });
    }

    setLoading(false);
  }

  async function handleGenerateStatDec(payload: StatutoryDeclarationPayload) {
    setLoading(true);
    setIsStatDecModalOpen(false);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const docId = 'STATDEC-' + Math.random().toString(36).substring(7).toUpperCase();

    await logActivity(
      'STAT_DEC_GENERATED',
      `Generated Statutory Declaration nominating ${payload.nominated_driver_name}`,
      {
        document_id: docId,
        nominated_driver: payload.nominated_driver_name,
        driver_license: payload.nominated_driver_license_number,
        declarant: payload.declarant_name,
        company: payload.company_name,
      }
    );

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      `Generated Statutory Declaration PDF. Document ID: ${docId}. Nominated Driver: ${payload.nominated_driver_name}. Ready for authorized signature.`
    );

    await supabase
      .from('infringements')
      .update({ status: 'Awaiting Signature' })
      .eq('id', infringement.id);

    setCurrentStatus('Awaiting Signature');
    setLoading(false);

    toast.success('PDF Generated. Ready for authorized signature', {
      description: `Document ID: ${docId}`,
    });
  }

  async function handleGenerateStatDecPDF() {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const docId = 'STATDEC-' + Math.random().toString(36).substring(7).toUpperCase();

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      `Generated Statutory Declaration PDF. Document ID: ${docId}. Ready for authorized signature.`
    );

    await supabase
      .from('infringements')
      .update({ status: 'Awaiting Signature' })
      .eq('id', infringement.id);

    setCurrentStatus('Awaiting Signature');
    setLoading(false);

    toast.success('PDF Generated', {
      description: 'Ready for authorized signature',
    });
  }

  async function handleRouteForSignature() {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      'Routed Statutory Declaration to Authorized Officer via DocuSign for electronic signature.'
    );

    await supabase
      .from('infringements')
      .update({ status: 'Ready for Submission' })
      .eq('id', infringement.id);

    setCurrentStatus('Ready for Submission');
    setLoading(false);

    toast.success('Sent to Authorized Officer via DocuSign', {
      description: 'Awaiting electronic signature',
    });
  }

  async function handleSimulateSignature() {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    await createAuditLog(
      'System (UAT)',
      'system',
      '192.168.1.45',
      '[UAT ONLY] Simulated signature received. Stat Dec marked as ready for submission.'
    );

    await supabase
      .from('infringements')
      .update({ status: 'Ready for Submission' })
      .eq('id', infringement.id);

    setCurrentStatus('Ready for Submission');
    setLoading(false);

    toast.info('Signature Simulated', {
      description: 'UAT override applied - Ready for submission',
    });
  }

  async function handleEmailToAuthority() {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      `Executed Statutory Declaration submitted to ${infringement.issuing_authority || 'Issuing Authority'} via secure email.`
    );

    await supabase
      .from('infringements')
      .update({ status: 'Pending Fleet Payment' })
      .eq('id', infringement.id);

    setCurrentStatus('Pending Fleet Payment');
    setLoading(false);

    toast.success('Executed Stat Dec submitted to Authority', {
      description: 'Workflow advanced to Fleet Payment stage',
    });
  }

  async function handleXeroReimbursement(payload: XeroReimbursementPayload) {
    setLoading(true);
    setIsXeroModalOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const invoiceNumber = 'INV-' + Math.random().toString(36).substring(7).toUpperCase();

    await logActivity(
      'XERO_INVOICE_CREATED',
      `Created Xero A/R invoice for ${payload.driver_name} - Admin Fee: $${payload.reissued_individual_fine_amount.toFixed(2)}`,
      {
        invoice_number: invoiceNumber,
        driver_name: payload.driver_name,
        admin_fee: payload.reissued_individual_fine_amount,
        corporate_amount: infringement.corporate_fine_amount,
        documents_attached: payload.attach_documents,
        xero_contact: payload.driver_name,
      }
    );

    await createAuditLog(
      'Jenny (Admin)',
      'user',
      '192.168.1.45',
      `Created Xero invoice ${invoiceNumber} for ${payload.driver_name} - Admin Fee: $${payload.reissued_individual_fine_amount.toFixed(2)}. Liability transferred to driver. Workflow complete - case closed.`
    );

    await supabase
      .from('infringements')
      .update({
        status: 'Closed',
        reissued_individual_fine_amount: payload.reissued_individual_fine_amount,
      })
      .eq('id', infringement.id);

    setCurrentStatus('Closed');
    setLoading(false);

    toast.success('Workflow Complete - Liability Transferred', {
      description: `Invoice ${invoiceNumber} created. Admin fee invoiced to driver.`,
    });
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={currentBrand.light}
                alt={`${brandName} Logo`}
                className="h-8 md:h-9 object-contain dark:hidden"
              />
              <img
                src={currentBrand.dark}
                alt={`${brandName} Logo`}
                className="h-8 md:h-9 object-contain hidden dark:block"
              />
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {infringement.vrn}
              </h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                currentStatus === 'Voided'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}>
                {currentStatus}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {infringement.offence_type} • {infringement.reference_number}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <QuickAddMenu onUploadFine={() => {}} />
            <button
              onClick={() => setIsAuditDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <ShieldCheck size={18} />
              <span className="font-medium">Audit Log</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="flex items-center justify-center w-10 h-10 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>
              {isMoreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMoreMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-20">
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsVoidModalOpen(true);
                      }}
                      disabled={currentStatus === 'Voided'}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle size={18} />
                      <span className="font-medium">Void Infringement</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">Dev/UAT Controls</span>
              <span className="text-xs text-amber-600 dark:text-amber-400">(Testing Only)</span>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-amber-900 dark:text-amber-100">Evidence Photo</span>
                <button
                  onClick={() => setHasEvidencePhoto(!hasEvidencePhoto)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    hasEvidencePhoto ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hasEvidencePhoto ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-amber-900 dark:text-amber-100">Telemetry</span>
                <button
                  onClick={() => setHasTelemetry(!hasTelemetry)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    hasTelemetry ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hasTelemetry ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>
        </div>

        <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 transition-opacity ${
          currentStatus === 'Voided' ? 'opacity-40 pointer-events-none' : ''
        }`}>
          <div className="flex items-center justify-between mb-4">
            {MARINE_WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isFuture = currentStep < step.id;
              const isClickable = isCompleted;
              const isAIAutomated = step.id === 2 && isCompleted && driverAutoIdentified;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center relative">
                    <button
                      onClick={() => isClickable && handleStepClick(step.id)}
                      disabled={!isClickable || loading}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? isAIAutomated
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 dark:from-purple-600 dark:to-indigo-600 border-purple-600 dark:border-purple-600 text-white cursor-pointer hover:from-purple-700 hover:to-indigo-700 hover:ring-2 hover:ring-offset-2 hover:ring-purple-500 dark:hover:ring-purple-400'
                            : 'bg-green-600 dark:bg-green-600 border-green-600 dark:border-green-600 text-white cursor-pointer hover:bg-green-700 hover:ring-2 hover:ring-offset-2 hover:ring-green-500 dark:hover:ring-green-400'
                          : isCurrent
                          ? 'bg-blue-600 dark:bg-blue-600 border-blue-600 dark:border-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30 cursor-default'
                          : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      } ${loading && isClickable ? 'opacity-50' : ''}`}
                    >
                      {isCompleted ? (isAIAutomated ? <Sparkles size={18} /> : <Check size={18} />) : <Icon size={18} />}
                    </button>
                    {isAIAutomated && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-purple-600 dark:bg-purple-700 text-white text-[9px] font-bold rounded-full border border-white dark:border-slate-800 shadow-sm">
                        AI
                      </span>
                    )}
                    <span
                      className={`text-xs mt-2 text-center font-medium ${
                        isCompleted || isCurrent ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < MARINE_WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors ${
                        currentStep > step.id
                          ? (step.id === 2 && driverAutoIdentified)
                            ? 'bg-gradient-to-r from-purple-600 to-green-600 dark:from-purple-600 dark:to-green-600'
                            : 'bg-green-600 dark:bg-green-600'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6">
          <div className="space-y-6">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-lg border border-white/40 dark:border-slate-700/50 shadow-sm overflow-hidden transition-colors duration-300">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Document Viewer</h2>
              </div>
              <div className="p-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 h-[600px] relative transition-colors duration-300">
                <div className="absolute inset-0 dark:border-4 dark:border-slate-700/50 dark:shadow-inner rounded-b-lg pointer-events-none"></div>
                <div className="text-center relative z-10">
                  <FileText size={64} className="text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">PDF Document Preview</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    {infringement.reference_number}.pdf
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                    Google Workspace / Hubdoc integration placeholder
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-lg border border-white/40 dark:border-slate-700/50 shadow-sm overflow-hidden transition-colors duration-300">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 px-4 py-3 border-b border-blue-200 dark:border-blue-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Image size={18} className="text-blue-600 dark:text-blue-400" />
                  Extracted Evidence Photo
                </h2>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 transition-colors duration-300">
                {hasEvidencePhoto ? (
                  <>
                    <div className="relative rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                      <img
                        src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=60&blur=8"
                        alt="Extracted driver evidence"
                        className="w-full h-64 object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent flex items-end p-4">
                        <div className="flex items-center gap-2 text-white">
                          <Check size={16} className="text-green-400" />
                          <span className="text-sm font-medium">AI-extracted from page 1 of notice</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                      Document AI automatically isolates driver/vehicle imagery for identification
                    </p>
                  </>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                    <div className="h-64 flex flex-col items-center justify-center text-center px-6">
                      <div className="p-4 bg-slate-200 dark:bg-slate-700 rounded-full mb-4">
                        <ImageOff size={32} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        No Evidence Photo Provided
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        The issuing authority did not include photographic evidence with this notice type.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-white/40 shadow-sm dark:bg-slate-800/80 dark:border-slate-700">
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 px-4 py-3 border-b border-orange-200 dark:border-orange-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin size={18} className="text-orange-600 dark:text-orange-400" />
                  Vehicle Telemetry
                </h2>
              </div>
              {geotabData && hasTelemetry ? (
                  <div className="p-4 space-y-4">
                  <GeotabMapReplay
                    latitude={geotabData.telemetry_at_offence.latitude}
                    longitude={geotabData.telemetry_at_offence.longitude}
                    location={geotabData.telemetry_at_offence.location_description}
                  />

                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-600 dark:bg-blue-700 rounded-lg">
                        <Database size={18} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Active Sensed Driver</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {geotabData.driver_identification.driver_name}
                        </p>
                        <button
                          onClick={() => {
                            toast.info('Driver Re-assignment Opened', {
                              description: 'Opening driver assignment interface',
                            });
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mt-1 transition-colors"
                        >
                          (Re-assign)
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {geotabData.driver_identification.verified ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold border border-purple-200 dark:border-purple-800">
                            <Sparkles size={14} />
                            {geotabData.driver_identification.bookingReference
                              ? `${geotabData.driver_identification.source.split(' (')[0]} (Ref: ${geotabData.driver_identification.bookingReference})`
                              : geotabData.driver_identification.source}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold border border-amber-200 dark:border-amber-800">
                          <AlertTriangle size={14} />
                          {geotabData.driver_identification.bookingReference
                            ? `${geotabData.driver_identification.source.split(' (')[0]} (Ref: ${geotabData.driver_identification.bookingReference})`
                            : geotabData.driver_identification.source}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Offence Time</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {geotabData.date}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                        {geotabData.offence_time}
                      </p>
                    </div>

                    {geotabData.offence_type === 'Speeding' ? (
                      <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border-2 border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Gauge size={16} className="text-red-600 dark:text-red-400" />
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Speed at Offence</p>
                          </div>
                          {geotabData.exception_match && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold">
                              <Sparkles size={12} />
                              Auto-Matched
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {geotabData.telemetry_at_offence.speed_kmh} km/h
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-500 mt-1">
                          in a {geotabData.telemetry_at_offence.posted_limit} km/h zone
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border-2 border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">Parking Fine</p>
                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                          {geotabData.telemetry_at_offence.speed_kmh} km/h
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
                          Vehicle stationary
                        </p>
                      </div>
                    )}

                    <div className={`rounded-lg p-4 border-2 ${
                      geotabData.telemetry_at_offence.ignition_status === 'ON'
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Power size={16} className={geotabData.telemetry_at_offence.ignition_status === 'ON' ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'} />
                        <p className={`text-xs font-medium ${geotabData.telemetry_at_offence.ignition_status === 'ON' ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          Ignition Status
                        </p>
                      </div>
                      <p className={`text-lg font-semibold ${geotabData.telemetry_at_offence.ignition_status === 'ON' ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {geotabData.telemetry_at_offence.ignition_status}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {geotabData.telemetry_at_offence.trip_status}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Trip ID</p>
                      <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {geotabData.trip_id}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Check size={14} className="text-green-600 dark:text-green-400" />
                      <span className="font-medium">Telematics data queried automatically based on infringement timestamp.</span>
                    </p>
                  </div>
                </div>
                ) : (
                  <div className="p-6">
                    <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                      <div className="h-48 flex flex-col items-center justify-center text-center px-6">
                        <div className="p-4 bg-slate-200 dark:bg-slate-700 rounded-full mb-4">
                          <WifiOff size={32} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          No Telemetry Data Available
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                          No telemetry data available for this vehicle at the time of offence.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-white/40 shadow-sm dark:bg-slate-800/80 dark:border-slate-700">
              <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Fleetio Assignment
                </h2>
              </div>
              {fleetioData ? (
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Truck size={24} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{fleetioData.vrn}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {fleetioData.year} {fleetioData.make} {fleetioData.model}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Assigned To</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {fleetioData.current_assignment.driver_name}
                          </p>
                          <button
                            onClick={() => {
                              toast.info('Driver Re-assignment Opened', {
                                description: 'Opening Fleetio assignment interface',
                              });
                            }}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mt-1 transition-colors"
                          >
                            (Re-assign)
                          </button>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Fleet Group</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{fleetioData.fleet_group}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">COR Officer</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {fleetioData.current_assignment.cor_officer}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Vehicle ID</p>
                          <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{fleetioData.vehicle_id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Assignment Start</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {formatAppDate(fleetioData.current_assignment.assignment_start)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                    <div className="h-48 flex flex-col items-center justify-center text-center px-6">
                      <div className="p-4 bg-slate-200 dark:bg-slate-700 rounded-full mb-4">
                        <Truck size={32} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        No Assignment Data Available
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        No active assignment found in Fleetio database.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-white/40 shadow-sm dark:bg-slate-800/80 dark:border-slate-700">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 px-4 py-3 border-b border-indigo-200 dark:border-indigo-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Truck size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Fleetio History
                </h2>
              </div>
              {fleetioData ? (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge size={16} className="text-slate-600 dark:text-slate-400" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Current Odometer</p>
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">45,210 km</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Last updated 2 days ago</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Check size={16} className="text-green-600 dark:text-green-400" />
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">Open Issues</p>
                      </div>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">0</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">All clear</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Recent Service</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">30,000 km Service</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Completed 15 Jan 2026</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Next Service Due</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">60,000 km Service</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due at 60,000 km (14,790 km away)</p>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors font-medium">
                    <AlertTriangle size={18} />
                    Log Issue in Fleetio
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                    <div className="h-48 flex flex-col items-center justify-center text-center px-6">
                      <div className="p-4 bg-slate-200 dark:bg-slate-700 rounded-full mb-4">
                        <Truck size={32} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        No History Data Available
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        No active assignment found in Fleetio database.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="space-y-6">
            {showVerificationBanner ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    Data verified and locked for workflow
                  </span>
                </div>
                <button
                  onClick={handleUndoVerification}
                  className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 underline"
                >
                  Undo Verification
                </button>
              </div>
            ) : (
              currentStatus === 'New' && !dataVerified && (
                <XeroReconciliation
                  ocrData={{
                    amount: infringement.fine_amount || 0,
                    referenceNumber: infringement.reference_number || '',
                    issueDate: infringement.issue_date || infringement.date_received,
                    vrn: infringement.vrn,
                  }}
                  databaseData={{
                    amount: infringement.fine_amount,
                    referenceNumber: infringement.reference_number,
                    dateReceived: infringement.date_received,
                    vrn: infringement.vrn,
                  }}
                  onApprove={handleApproveExtraction}
                  onReject={() => {
                    toast.error('Data mismatch flagged for review');
                  }}
                />
              )
            )}

            <NoticeMetadata
              issuingState={infringement.issuing_state}
              issuingAuthority={infringement.issuing_authority}
              corporateFineAmount={infringement.corporate_fine_amount}
              bpayBillerCode={infringement.bpay_biller_code}
              bpayReference={infringement.bpay_reference}
              ocrVerified={infringement.ocr_verified}
              onVerificationComplete={handleOCRVerificationComplete}
            />

            {currentStatus !== 'Voided' && (
              <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-white/40 shadow-sm dark:bg-slate-800/80 dark:border-slate-700">
                <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">Workflow Actions</h2>
                </div>
                <div className="p-4 space-y-3">
                {currentStatus === 'Pending Driver Nomination' && (
                  <>
                    {geotabData?.driver_identification?.verified && hasTelemetry ? (
                      <button
                        onClick={() => setIsStatDecModalOpen(true)}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-slate-200 disabled:hover:to-slate-200 disabled:active:scale-100 dark:disabled:bg-slate-700 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500"
                      >
                        <FileText size={20} />
                        <div className="text-left flex-1">
                          <p className="font-medium">Generate Statutory Declaration</p>
                          <p className="text-xs text-blue-100">
                            Auto-fill liability transfer for identified driver ({geotabData.driver_identification.driver_name})
                          </p>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsCOREmailModalOpen(true)}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-slate-200 disabled:hover:to-slate-200 disabled:active:scale-100 dark:disabled:bg-slate-700 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500"
                      >
                        <Mail size={20} />
                        <div className="text-left flex-1">
                          <p className="font-medium">Request Driver Nomination</p>
                          <p className="text-xs text-blue-100">
                            Email client POC to identify driver
                          </p>
                        </div>
                      </button>
                    )}
                  </>
                )}

                <div>
                  {currentStatus === 'Awaiting Driver Nomination' && (
                    <>
                      <button
                        disabled={true}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-slate-200 from-slate-200 to-slate-200 text-slate-400 cursor-not-allowed shadow-none dark:bg-slate-700 dark:from-slate-700 dark:to-slate-700 dark:text-slate-500"
                      >
                        <Clock size={20} />
                        <div className="text-left flex-1">
                          <p className="font-medium">Awaiting Client Response</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Waiting for driver details from fleet manager
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={async () => {
                          setLoading(true);

                          await createAuditLog(
                            'System (UAT)',
                            'system',
                            '192.168.1.45',
                            '[UAT ONLY] Simulated client response received with driver details.'
                          );

                          await supabase
                            .from('infringements')
                            .update({ status: 'Stat Dec Pending' })
                            .eq('id', infringement.id);

                          setCurrentStatus('Stat Dec Pending');
                          setLoading(false);

                          toast.info('Client Response Simulated', {
                            description: 'Mock driver details received - ready to generate Stat Dec',
                          });
                        }}
                        disabled={loading}
                        className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mt-1.5 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        [UAT] Simulate Client Reply
                      </button>
                    </>
                  )}

                  {currentStatus === 'Stat Dec Pending' && (
                    <button
                      onClick={() => setIsStatDecModalOpen(true)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-slate-200 disabled:hover:to-slate-200 disabled:active:scale-100 dark:disabled:bg-slate-700 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500"
                    >
                      <FileCheck size={20} />
                      <div className="text-left flex-1">
                        <p className="font-medium">Generate Stat Dec PDF</p>
                        <p className="text-xs text-blue-100">
                          Create declaration document
                        </p>
                      </div>
                    </button>
                  )}

                  {currentStatus === 'Awaiting Signature' && (
                    <>
                      <button
                        onClick={handleRouteForSignature}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-slate-200 disabled:hover:to-slate-200 disabled:active:scale-100 dark:disabled:bg-slate-700 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500"
                      >
                        <FileCheck size={20} />
                        <div className="text-left flex-1">
                          <p className="font-medium">Route for E-Signature</p>
                          <p className="text-xs text-blue-100">
                            Send to authorized officer via DocuSign
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={handleSimulateSignature}
                        disabled={loading}
                        className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mt-1.5 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        [UAT] Simulate Signature Received
                      </button>
                    </>
                  )}

                  {currentStatus === 'Ready for Submission' && (
                    <button
                      onClick={handleEmailToAuthority}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-slate-200 disabled:hover:to-slate-200 disabled:active:scale-100 dark:disabled:bg-slate-700 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500"
                    >
                      <Mail size={20} />
                      <div className="text-left flex-1">
                        <p className="font-medium">Email to Issuing Authority</p>
                        <p className="text-xs text-blue-100">
                          Submit executed stat dec
                        </p>
                      </div>
                    </button>
                  )}

                  {(currentStatus === 'Awaiting Signature' || currentStatus === 'Ready for Submission') && (
                    <button
                      onClick={async () => {
                        setLoading(true);

                        await createAuditLog(
                          'Jenny (Admin)',
                          'user',
                          '192.168.1.45',
                          'Voided previous Statutory Declaration - reverting to Stat Dec Pending'
                        );

                        await supabase
                          .from('infringements')
                          .update({ status: 'Stat Dec Pending' })
                          .eq('id', infringement.id);

                        setCurrentStatus('Stat Dec Pending');
                        setLoading(false);

                        toast.info('Stat Dec Voided, Workflow Reverted', {
                          description: 'Document invalidated - ready to regenerate',
                        });
                      }}
                      disabled={loading}
                      className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mt-1.5 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Void & Regenerate Document
                    </button>
                  )}
                </div>

                {currentStatus === 'Pending Fleet Payment' && (
                  <button
                    onClick={async () => {
                      setLoading(true);

                      await createAuditLog(
                        'Jenny (Admin)',
                        'user',
                        '192.168.1.45',
                        'Fleet payment confirmed - proceeding to Xero reconciliation'
                      );

                      await logActivity(
                        'FLEET_PAYMENT_CONFIRMED',
                        'Fleet payment received and confirmed',
                        {
                          payment_method: 'Bank Transfer',
                        }
                      );

                      await supabase
                        .from('infringements')
                        .update({ status: 'Awaiting Reimbursement (Xero)' })
                        .eq('id', infringement.id);

                      setCurrentStatus('Awaiting Reimbursement (Xero)');
                      setLoading(false);

                      toast.success('Fleet Payment Confirmed', {
                        description: 'Ready for Xero reconciliation',
                      });
                    }}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-slate-200 disabled:hover:to-slate-200 disabled:active:scale-100 dark:disabled:bg-slate-700 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500"
                  >
                    <CreditCard size={20} />
                    <div className="text-left flex-1">
                      <p className="font-medium">Confirm Fleet Payment</p>
                      <p className="text-xs text-blue-100">
                        Mark payment as received from fleet
                      </p>
                    </div>
                  </button>
                )}

                {currentStatus === 'Awaiting Reimbursement (Xero)' && (
                  <div>
                    <button
                      onClick={() => setIsXeroModalOpen(true)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-slate-200 disabled:hover:to-slate-200 disabled:active:scale-100 dark:disabled:bg-slate-700 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-500"
                    >
                      <CreditCard size={20} />
                      <div className="text-left flex-1">
                        <p className="font-medium">Pay & Push to Xero</p>
                        <p className="text-xs text-blue-100">
                          Process payment and create invoice
                        </p>
                      </div>
                    </button>
                  </div>
                )}

                {currentStatus === 'Closed' && (
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 dark:bg-green-900">
                          <Check size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-900 dark:text-green-100">Workflow Complete</h3>
                          <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                            Liability transferred and admin fee invoiced to driver.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        setLoading(true);

                        await createAuditLog(
                          'Jenny (Admin)',
                          'user',
                          '192.168.1.45',
                          'Voided Xero draft invoice - reverting to Awaiting Reimbursement (Xero)'
                        );

                        await supabase
                          .from('infringements')
                          .update({ status: 'Awaiting Reimbursement (Xero)' })
                          .eq('id', infringement.id);

                        setCurrentStatus('Awaiting Reimbursement (Xero)');
                        setLoading(false);

                        toast.success('Xero Invoice Voided Successfully', {
                          description: 'Draft invoice deleted - ready to reprocess',
                        });
                      }}
                      disabled={loading}
                      className="w-full text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-3 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Void Xero Draft Invoice
                    </button>
                  </div>
                )}
              </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Slide-over Drawer */}
      {isAuditDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setIsAuditDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full md:w-[95%] lg:w-[600px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in overflow-y-auto">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">Compliance & Audit Log</h2>
              </div>
              <button
                onClick={() => setIsAuditDrawerOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-700"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ComplianceAuditLog logs={auditLogs} infringementId={infringement.id} />
            </div>
          </div>
        </>
      )}

      <StatDecModal
        isOpen={isStatDecModalOpen}
        onClose={() => setIsStatDecModalOpen(false)}
        onSubmit={handleGenerateStatDec}
        infringementNoticeNumber={infringement.reference_number || ''}
        vehicleRegistration={infringement.vrn}
        offenceDate={infringement.offence_date}
        driverData={geotabData?.driver_identification.verified ? {
          driver_name: geotabData.driver_identification.driver_name,
          method: geotabData.driver_identification.method,
        } : undefined}
        brandName={brandName}
      />

      <COREmailModal
        isOpen={isCOREmailModalOpen}
        onClose={() => setIsCOREmailModalOpen(false)}
        onSend={handleSendCOREmail}
        vrn={infringement.vrn}
        offenceDate={infringement.offence_date}
        offenceLocation={infringement.offence_location || 'Location not specified'}
        offenceType={infringement.offence_type}
        speed={geotabData?.speed}
        speedLimit={geotabData?.speed_limit}
        driverName={geotabData?.driver}
        fleetioAssetId={fleetioData?.asset_id}
        referenceNumber={infringement.reference_number || 'N/A'}
        customerBase={infringement.customer_base}
        vehicleColor={fleetioData?.color}
        vehicleYear={fleetioData?.year}
        vehicleMake={fleetioData?.make}
        vehicleModel={fleetioData?.model}
        registrationState={fleetioData?.registration_state}
        hasEvidencePhoto={hasEvidencePhoto}
        hasTelemetry={hasTelemetry}
      />

      <XeroReimbursementModal
        isOpen={isXeroModalOpen}
        onClose={() => setIsXeroModalOpen(false)}
        onSubmit={handleXeroReimbursement}
        driverName={geotabData?.driver || 'Driver'}
        corporateFineAmount={infringement.corporate_fine_amount}
        vrn={infringement.vrn}
        referenceNumber={infringement.reference_number || 'N/A'}
      />

      {isRevertModalOpen && pendingRevertStep !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-red-50 dark:from-amber-950 dark:to-red-950 px-6 py-5 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Revert Workflow Stage?
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Manual actions required
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                You are about to revert this infringement back to{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {stepToStatusMap[pendingRevertStep]}
                </span>.
              </p>

              {currentStep >= 3 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-2">
                        Action Required
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        You must manually void the pending Statutory Declaration envelope in DocuSign/Hubdoc.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep >= 4 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100 text-sm mb-2">
                        Critical Action Required
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        This fine has been marked as paid. You must manually contact the issuing jurisdiction to request a refund.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep >= 5 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-2">
                        Accounting Action Required
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        You must manually void the draft invoice or ledger entry in your Xero dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-slate-600 dark:text-slate-400 pt-2">
                The system will update the workflow status, but cannot automate external actions.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsRevertModalOpen(false);
                  setPendingRevertStep(null);
                }}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevert}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Reverting...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} />
                    I Understand, Revert Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isVoidModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 px-6 py-5 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <XCircle size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Void Infringement Record
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Danger Zone - This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                  This will permanently close this case and halt all workflows. This action cannot be undone.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Reason for Voiding <span className="text-red-500">*</span>
                </label>
                <select
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                >
                  <option value="">Select a reason...</option>
                  <option value="Edited wrong record">Edited wrong record</option>
                  <option value="Duplicate entry">Duplicate entry</option>
                  <option value="Notice withdrawn by Police">Notice withdrawn by Police</option>
                  <option value="Incorrect data entry">Incorrect data entry</option>
                  <option value="Vehicle sold before offence">Vehicle sold before offence</option>
                  <option value="Administrative error">Administrative error</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsVoidModalOpen(false);
                  setVoidReason('');
                }}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidInfringement}
                disabled={loading || !voidReason}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Voiding...
                  </>
                ) : (
                  <>
                    <XCircle size={18} />
                    Confirm Void
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
