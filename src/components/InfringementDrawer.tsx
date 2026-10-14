import { useState, useEffect, useRef } from 'react';
import { X, FileText, Activity, Eye, CheckCircle2, AlertCircle, AlertTriangle, User, MapPin, CreditCard, Send, Radio, Mail, DollarSign, Undo2, PenTool, TrendingUp, Navigation, Camera, Zap, Download, Sparkles, CheckCircle, Check, CheckCheck, XCircle, Smartphone, Wand2, MessageSquare, MessagesSquare, Bold, Italic, List, Type, Paperclip, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, ListOrdered, Undo, Redo, ChevronDown, Trash2, UploadCloud, Reply } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import type { Infringement, AuditLog, InfringementDocument, StatutoryDeclarationPayload } from '../types/database';
import { StatDecModal } from './StatDecModal';
import { generateStatDecPdf, getStatDecFileName } from '../utils/statDecPdf';
import { formatCurrency, formatAppDate } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { triggeriPaaSWorkflow } from '../lib/webhook';
import { toast } from 'sonner';

interface InfringementDrawerProps {
  infringement: Infringement;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedInfringement: Infringement) => void;
}

type Tab = 'overview' | 'telematics' | 'communications' | 'financials' | 'documents';

type CommunicationChannel = 'email' | 'sms' | 'whatsapp';

type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

interface CommunicationMessage {
  id: string | number;
  type: CommunicationChannel;
  text: string;
  date: string;
  sender: string;
  deliveryStatus?: DeliveryStatus;
  ccRecipients?: string[];
  bccRecipients?: string[];
  isInbound?: boolean;
}

function parseEmailAddresses(value: string): string[] {
  return value
    .split(/[;,\s]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDriverNominationTemplate(infringement: Infringement): string {
  const reference = escapeHtml(infringement.reference_number || 'N/A');
  const vehicle = escapeHtml(infringement.vrn || 'N/A');
  const offenceDate = escapeHtml(formatAppDate(infringement.offence_date || infringement.date_received));

  return `<p>Dear Fleet Manager,</p>
<p>&nbsp;</p>
<p>We are writing to request driver nomination details for a recent traffic infringement so that we can complete the necessary statutory declaration and submit it to the issuing authority.</p>
<p>&nbsp;</p>
<p><strong>Infringement Details</strong></p>
<ul>
  <li><strong>Notice Number:</strong> ${reference}</li>
  <li><strong>Vehicle:</strong> ${vehicle}</li>
  <li><strong>Offence Date:</strong> ${offenceDate}</li>
</ul>
<p>&nbsp;</p>
<p>Could you please assist by identifying and nominating the driver at the time of the offence and submit the following details below via email:</p>
<p>&nbsp;</p>
<p><strong>Driver Details Required</strong></p>
<ul>
  <li><strong>Traffic Infringement Reference (Issue/Infringement Number):</strong></li>
  <li><strong>Full Name:</strong></li>
  <li><strong>Date of Birth (DD/Month/YYYY):</strong></li>
  <li><strong>Licence Number:</strong></li>
  <li><strong>State:</strong></li>
  <li><strong>Licence Type (Class):</strong></li>
  <li><strong>Licence Expiry Date (DD/Month/YYYY):</strong></li>
  <li><strong>Military Email Address:</strong></li>
</ul>
<p>&nbsp;</p>
<p><strong>Note:</strong> The fines for these citations will be reduced to approximately one-fifth of the original amount once a driver is nominated.</p>
<p>&nbsp;</p>
<p>Please let us know if you have any questions or concerns.</p>
<p>&nbsp;</p>
<p>Best regards,</p>
<p>&nbsp;</p>
<p><strong>HRSG Compliance Team</strong></p>`;
}

export function InfringementDrawer({ infringement, isOpen, onClose, onUpdate }: InfringementDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [documents, setDocuments] = useState<InfringementDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [nominatedDriver, setNominatedDriver] = useState<{ name: string; method: string } | null>(null);
  const [isStatDecModalOpen, setIsStatDecModalOpen] = useState(false);
  const [statDecPayload, setStatDecPayload] = useState<StatutoryDeclarationPayload | null>(null);
  const [sourceEmailHtml, setSourceEmailHtml] = useState<string | null>(null);
  const [sourceEmailSender, setSourceEmailSender] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const [messageHistory, setMessageHistory] = useState<CommunicationMessage[]>([
    { id: 1, type: 'email', text: 'Initial nomination request sent.', date: '24-Feb-2026 10:00 AM', sender: 'System', deliveryStatus: 'read' },
    { id: 2, type: 'sms', text: 'Please check your email regarding infringement FLC002.', date: '24-Feb-2026 10:05 AM', sender: 'Jenny', deliveryStatus: 'delivered' }
  ]);
  const [messageText, setMessageText] = useState('');
  const [activeChannel, setActiveChannel] = useState<CommunicationChannel>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [bccRecipients, setBccRecipients] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [trackEmailOpens, setTrackEmailOpens] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageHistory]);

  useEffect(() => {
    const defaultRecipients: Record<string, string> = {
      Fleetcar: 's.jenkins@marines.mil',
      GigCar: 'fleet.ops@gigcar.com.au',
      Yonder: 'fleet@yonder.com.au',
    };
    setRecipientEmail(defaultRecipients[infringement.customer_base] || defaultRecipients.Fleetcar);
  }, [infringement.customer_base]);

  useEffect(() => {
    let isActive = true;

    async function loadEmailHistory() {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, body_html, sent_at, sent_by, delivery_status, status, cc_recipients, bcc_recipients')
        .eq('infringement_id', infringement.id)
        .order('sent_at', { ascending: true });

      if (!isActive || error || !data?.length) return;

      setMessageHistory(data.map((email) => ({
        id: email.id,
        type: 'email' as const,
        text: email.body_html,
        date: email.sent_at ? new Date(email.sent_at).toLocaleString('en-AU', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Unknown date',
        sender: email.sent_by || 'System',
        deliveryStatus: email.status === 'failed' ? 'failed' : (email.delivery_status as DeliveryStatus) || 'sent',
        ccRecipients: email.cc_recipients || [],
        bccRecipients: email.bcc_recipients || [],
      })));
    }

    loadEmailHistory();
    return () => { isActive = false; };
  }, [infringement.id]);

  const GMAIL_COLORS = [
    // Grayscale
    '#000000', '#434343', '#666666', '#999999', '#cccccc', '#efefef', '#f3f3f3',
    // Brights
    '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff',
    // Lightest
    '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9',
    // Light
    '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6',
    // Medium-Light
    '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3',
    // Medium
    '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7',
    // Dark
    '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75',
    // Darkest
    '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d'
  ];

  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(new Set());

  const toggleAttachmentSelection = (docId: string) => {
    setSelectedAttachmentIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleSimulateClientReply = async () => {
    const senderMap: Record<string, string> = {
      Fleetcar: 'Capt. Sarah Jenkins',
      GigCar: 'Fleet Operations',
      Yonder: 'Fleet Coordinator',
    };
    const sender = senderMap[infringement?.customer_base as string] || senderMap['Fleetcar'];
    const reference = escapeHtml(infringement?.reference_number || 'N/A');

    const driverName = 'James Patterson';
    const driverDob = '1991-03-14';
    const driverLicence = '88392017';
    const driverLicenceState = 'NSW';

    const replyHtml = `<p>Hi Jenny,</p>
<p>&nbsp;</p>
<p>Thanks for reaching out regarding infringement <strong>${reference}</strong>. I've reviewed our dispatch logs and can confirm the following driver was operating the vehicle at the time of the offence:</p>
<p>&nbsp;</p>
<ul>
  <li><strong>Full Name:</strong> ${driverName}</li>
  <li><strong>Date of Birth:</strong> 14/March/1991</li>
  <li><strong>Licence Number:</strong> ${driverLicence}</li>
  <li><strong>State:</strong> ${driverLicenceState}</li>
  <li><strong>Licence Type (Class):</strong> C (Car)</li>
  <li><strong>Licence Expiry Date:</strong> 22/September/2028</li>
  <li><strong>Military Email Address:</strong> j.patterson@marines.mil</li>
</ul>
<p>&nbsp;</p>
<p>Please proceed with the statutory declaration. Let me know if you need anything else.</p>
<p>&nbsp;</p>
<p>Best regards,</p>
<p><strong>${escapeHtml(sender)}</strong></p>`;

    const replyMessage: CommunicationMessage = {
      id: Date.now(),
      type: 'email',
      text: replyHtml,
      date: new Date().toLocaleString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      sender,
      deliveryStatus: 'read',
      isInbound: true,
    };

    setMessageHistory((prev) => [...prev, replyMessage]);

    setNominatedDriver({ name: driverName, method: 'Email nomination' });
    setSourceEmailHtml(replyHtml);
    setSourceEmailSender(sender);

    const companyName = infringement?.customer_base === 'GigCar' ? 'GigCar Pty Ltd'
      : infringement?.customer_base === 'Yonder' ? 'Yonder Pty Ltd'
      : 'Fleetcar Pty Ltd';

    const payload: StatutoryDeclarationPayload = {
      infringement_notice_number: infringement?.reference_number || 'N/A',
      vehicle_registration: infringement?.vrn || 'N/A',
      offence_date: infringement?.offence_date || infringement?.date_received || new Date().toISOString(),
      company_name: companyName,
      declarant_name: 'Jenny Thompson',
      nominated_driver_name: driverName,
      nominated_driver_address: 'c/o: HRSG Australasia Pty Ltd, Level 4, 66 Smith St, Darwin NT 0800',
      nominated_driver_license_number: driverLicence,
      nominated_driver_license_state: driverLicenceState,
      nominated_driver_dob: driverDob,
    };
    setStatDecPayload(payload);

    try {
      await supabase
        .from('infringements')
        .update({
          status: 'Pending Driver Nomination',
          assigned_driver: driverName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', infringement?.id);

      await supabase.from('audit_logs').insert({
        infringement_id: infringement?.id,
        timestamp: new Date().toISOString(),
        actor: sender,
        actor_type: 'external',
        ip_address: '127.0.0.1',
        action: 'Driver nomination received from fleet client (simulated)',
      });

      if (onUpdate && infringement) {
        onUpdate({
          ...infringement,
          status: 'Pending Driver Nomination',
          assigned_driver: driverName,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating infringement status:', error);
    }

    toast.success('Client reply simulated', {
      description: 'Driver nomination details received — review the stat dec to continue.',
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] })
    ],
    content: messageText,
    onUpdate: ({ editor }) => {
      setMessageText(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[120px] p-4 focus:outline-none text-slate-900 dark:text-slate-100 prose dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 ![&_strong]:text-inherit ![&_em]:text-inherit',
      },
      handleKeyDown: (view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          handleSendMessage();
          return true;
        }
        return false;
      }
    },
  });

  const handleSendMessage = async () => {
    if (!editor || editor.isEmpty) return;

    const htmlBody = editor.getHTML();
    const newMessage: CommunicationMessage = {
      id: Date.now(),
      type: activeChannel,
      text: messageText,
      ccRecipients: activeChannel === 'email' ? parseEmailAddresses(ccRecipients) : [],
      bccRecipients: activeChannel === 'email' ? parseEmailAddresses(bccRecipients) : [],
      date: new Date().toLocaleString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      sender: 'Jenny',
      deliveryStatus: activeChannel === 'email' ? 'sent' : 'delivered'
    };

    if (activeChannel === 'email') {
      const toRecipients = parseEmailAddresses(recipientEmail);
      const ccRecipientList = parseEmailAddresses(ccRecipients);
      const bccRecipientList = parseEmailAddresses(bccRecipients);

      if (toRecipients.length === 0) {
        toast.error('Add at least one recipient');
        return;
      }

      const recipientMap: Record<string, { name: string; email: string }> = {
        Fleetcar: { name: 'Capt. Sarah Jenkins', email: 's.jenkins@marines.mil' },
        GigCar: { name: 'Fleet Operations', email: 'fleet.ops@gigcar.com.au' },
        Yonder: { name: 'Fleet Coordinator', email: 'fleet@yonder.com.au' },
      };
      const recipient = recipientMap[infringement?.customer_base as string] || recipientMap['Fleetcar'];
      const subject = `Driver Nomination Required | TIN: ${infringement?.reference_number || 'N/A'} | Date of Issue: ${formatAppDate(infringement?.date_received || new Date().toISOString())}`;

      const emailAttachments = documents
        .filter((document) => selectedAttachmentIds.has(document.id))
        .map((document) => ({
          name: document.file_name,
          url: getDocumentPublicUrl(document.storage_path),
          content_type: document.mime_type,
        }));

      const trackingToken = crypto.randomUUID();
      const statusEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-status`;
      const trackedBodyHtml = trackEmailOpens
        ? `${htmlBody}<img src="${statusEndpoint}?token=${trackingToken}" width="1" height="1" alt="" style="display:none" />`
        : htmlBody;
      const { error: logError } = await supabase.from('email_logs').insert({
        infringement_id: infringement?.id || null,
        recipient_email: toRecipients.join(', '),
        recipient_name: recipient.name,
        cc_recipients: ccRecipientList,
        bcc_recipients: bccRecipientList,
        subject,
        body_html: trackedBodyHtml,
        tracking_token: trackingToken,
        status: 'sent',
        delivery_status: 'sent',
        error_message: null,
        sent_by: 'Jenny',
      });

      if (logError) {
        console.error('Unable to create email tracking record:', logError);
        toast.error('Email could not be prepared');
        return;
      }

      const result = await triggeriPaaSWorkflow('SEND_EMAIL', {
        infringement_id: infringement?.id,
        recipient_name: recipient.name,
        recipient_email: toRecipients.join(', '),
        to: toRecipients,
        cc: ccRecipientList,
        bcc: bccRecipientList,
        sender_name: 'HRSG Compliance',
        sender_email: 'infringements@hrsg.com.au',
        subject,
        body_html: trackedBodyHtml,
        attachments: emailAttachments,
        tracking_token: trackingToken,
        status_callback_url: statusEndpoint,
        track_email_opens: trackEmailOpens,
        vrn: infringement?.vrn,
        reference_number: infringement?.reference_number,
      });

      if (!result.success) {
        await supabase.from('email_logs').update({
          status: 'failed',
          delivery_status: 'failed',
          error_message: result.reason || result.error?.toString() || 'Unknown error',
        }).eq('tracking_token', trackingToken);
      }

      if (!result.success) {
        toast.error('Email send failed', {
          description: 'Check Make webhook configuration',
        });
      }
    }

    setMessageHistory([...messageHistory, newMessage]);
    setMessageText('');
    editor?.commands.setContent('');
    toast.success(`${activeChannel.toUpperCase()} message sent`);
  };

  function handleDraftWithGemini() {
    // Simulating an API call to Gemini 1.5 Pro
    const promptContext = `Drafting email for ${infringement.vrn} regarding a ${infringement.offence_type} fine. Assigned to: ${infringement.assigned_driver || 'Unknown'}.`;

    const aiDraft = `Hi Team,

I'm reviewing a ${infringement.offence_type} infringement (Ref: ${infringement.reference_number || 'N/A'}) that occurred on ${formatAppDate(infringement.date_received)} involving vehicle ${infringement.vrn}.

Our system indicates ${infringement.assigned_driver || 'a team member'} had the vehicle during this time. Could you please review and process the driver nomination so we can close this out with ${infringement.issuing_authority || 'the authority'}?

Thanks,
Jenny`;

    setMessageText(aiDraft);
    editor?.commands.setContent(aiDraft.replace(/\n/g, '<br>'));
    toast.success('Draft generated by Gemini');
  }

  const handleApplyTemplate = (type: 'nomination' | 'reminder') => {
    let text = '';
    if (type === 'nomination') {
      text = getDriverNominationTemplate(infringement);
      setSelectedAttachmentIds(new Set(documents.map(d => d.id)));
    } else if (type === 'reminder') {
      text = `URGENT: Outstanding Infringement ${infringement.reference_number || 'N/A'}\n\nPlease note that the infringement for vehicle ${infringement.vrn} is approaching its due date. Please nominate the driver or process payment immediately to avoid late fees.`;
    }
    setMessageText(text);
    editor?.commands.setContent(type === 'nomination' ? text : text.replace(/\n/g, '<br>'));
    setIsTemplateMenuOpen(false);
  };

  const generateEmailPreview = () => {
    let preview = `Dear Fleet Manager,\n\nWe are writing to request driver nomination details for the following traffic infringement:\n\nNotice Number: ${infringement?.reference_number || 'N/A'}\nVehicle: ${infringement?.vrn || 'N/A'}\nOffence Date: ${infringement?.offence_date ? formatAppDate(infringement.offence_date) : 'N/A'}\nLocation: ${infringement?.offence_location || 'N/A'}\n\n`;

    const selectedDocs = documents.filter(d => selectedAttachmentIds.has(d.id));
    if (selectedDocs.length > 0) {
      preview += `I have attached the following document(s) for your review:\n\n`;
      selectedDocs.forEach(d => { preview += `• ${d.file_name}\n`; });
      preview += `\n`;
    }

    preview += `Please provide the driver details at your earliest convenience.\n\nBest regards,\nCompliance Team`;
    return preview;
  };

  function calculateDueDate(dateReceived: string): Date {
    const received = new Date(dateReceived);
    const dueDate = new Date(received);
    dueDate.setDate(received.getDate() + 21);
    return dueDate;
  }

  function getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getUrgencyBadge(daysUntilDue: number) {
    if (daysUntilDue < 0) {
      return {
        text: 'Overdue',
        icon: AlertCircle,
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-400/30'
      };
    } else if (daysUntilDue <= 5) {
      return {
        text: 'Due Soon',
        icon: AlertTriangle,
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30'
      };
    } else {
      return {
        text: 'Safe',
        icon: CheckCircle2,
        className: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
      };
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      'Awaiting Driver Nomination': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
      'Pending Driver Nomination': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
      'Stat Dec Pending': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
      'Pending Fleet Payment': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
      'Awaiting Reimbursement (Xero)': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
      'Closed': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  }

  const handleStatDecSubmit = async (payload: StatutoryDeclarationPayload) => {
    setIsStatDecModalOpen(false);
    setStatDecPayload(payload);
    setIsGeneratingPdf(true);

    try {
      // Use the original two-page statutory declaration when it is attached.
      let sourcePdfBuffer: ArrayBuffer | undefined;
      const generatedFileName = getStatDecFileName(payload);
      const sourceDocument = documents.find(
        (d) => d.mime_type === 'application/pdf'
          && d.file_name !== generatedFileName
          && d.file_name.includes(payload.infringement_notice_number),
      ) || documents.find(
        (d) => d.mime_type === 'application/pdf' && d.file_name !== generatedFileName,
      );
      if (sourceDocument) {
        const { data: sourcePdf } = await supabase.storage
          .from('infringement-documents')
          .download(sourceDocument.storage_path);
        if (sourcePdf) {
          sourcePdfBuffer = await sourcePdf.arrayBuffer();
        }
      }

      const pdfBlob = await generateStatDecPdf(payload, sourcePdfBuffer);
      const fileName = getStatDecFileName(payload);
      const storagePath = `${infringement?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('infringement-documents')
        .upload(storagePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) {
        console.error('PDF upload failed:', uploadError);
        toast.error('Could not save the statutory declaration PDF');
        return;
      }

      const { data: docRecord, error: dbError } = await supabase
        .from('infringement_documents')
        .insert({
          infringement_id: infringement!.id,
          file_name: fileName,
          storage_path: storagePath,
          file_size: pdfBlob.size,
          mime_type: 'application/pdf',
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB insert failed for PDF document:', dbError);
        toast.error('PDF was saved but could not be recorded in the document list');
      } else if (docRecord) {
        setDocuments(prev => [docRecord as InfringementDocument, ...prev]);
      }

      await supabase
        .from('infringements')
        .update({
          status: 'Stat Dec Pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', infringement?.id);

      await supabase.from('audit_logs').insert({
        infringement_id: infringement?.id,
        timestamp: new Date().toISOString(),
        actor: 'System User',
        actor_type: 'system',
        ip_address: '127.0.0.1',
        action: `Generated statutory declaration PDF: ${fileName}`,
      });

      const publicUrl = getDocumentPublicUrl(storagePath);
      setGeneratedPdfUrl(publicUrl);

      if (onUpdate && infringement) {
        onUpdate({
          ...infringement,
          status: 'Stat Dec Pending',
          updated_at: new Date().toISOString(),
        });
      }

      toast.success('Statutory declaration generated', {
        description: sourcePdfBuffer
          ? `${fileName} includes the completed form and page 1 of the infringement notice.`
          : `${fileName} saved to documents.`,
      });

      setShowSignaturePad(true);
    } catch (error) {
      console.error('Error generating stat dec PDF:', error);
      toast.error('Failed to generate the statutory declaration PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  async function handleSubmitNomination() {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('infringements')
        .update({
          status: 'Stat Dec Pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', infringement?.id);

      if (error) throw error;

      await supabase
        .from('audit_logs')
        .insert({
          infringement_id: infringement?.id,
          timestamp: new Date().toISOString(),
          actor: 'System User',
          actor_type: 'user',
          ip_address: '127.0.0.1',
          action: 'Submitted statutory declaration to issuing authority'
        });

      if (onUpdate && infringement) {
        onUpdate({
          ...infringement,
          status: 'Stat Dec Pending',
          updated_at: new Date().toISOString()
        });
      }

      toast.success('Nomination submitted successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting nomination:', error);
      toast.error('Failed to submit nomination');
    } finally {
      setIsSubmitting(false);
    }
  }

  const dueDate = calculateDueDate(infringement?.date_received || new Date().toISOString());
  const totalAmountDue = infringement?.total_amount_payable ?? (
    (infringement?.fine_amount ?? 0) + (infringement?.victims_levy ?? 0)
  );
  const daysUntil = getDaysUntilDue(dueDate);
  const urgency = getUrgencyBadge(daysUntil);
  const UrgencyIcon = urgency.icon;

  // Reset verification state when infringement changes
  useEffect(() => {
    setIsVerified(false);
    setSelectedAttachmentIds(new Set());
    setNominatedDriver(null);
    setStatDecPayload(null);
    setSourceEmailHtml(null);
    setGeneratedPdfUrl(null);
    if (isOpen && infringement?.id) {
      fetchDocuments(infringement.id);
    }
  }, [infringement?.id, isOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function fetchDocuments(infringementId: string) {
    setLoadingDocuments(true);
    const { data, error } = await supabase
      .from('infringement_documents')
      .select('*')
      .eq('infringement_id', infringementId)
      .order('uploaded_at', { ascending: false });
    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    setLoadingDocuments(false);
  }

  function getDocumentPublicUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from('infringement-documents')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleDocumentDownload(doc: InfringementDocument) {
    const url = getDocumentPublicUrl(doc.storage_path);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = doc.file_name;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }

  async function handleDocumentPreview(doc: InfringementDocument) {
    const { data, error } = await supabase.storage
      .from('infringement-documents')
      .download(doc.storage_path);

    if (error || !data) {
      console.error('Error loading document preview:', error);
      toast.error('Unable to preview this document');
      return;
    }

    setPreviewUrl(URL.createObjectURL(data));
  }

  async function handleDocumentDelete(doc: InfringementDocument) {
    const { error: storageError } = await supabase.storage
      .from('infringement-documents')
      .remove([doc.storage_path]);
    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      toast.error('Failed to delete document file');
      return;
    }
    const { error: dbError } = await supabase
      .from('infringement_documents')
      .delete()
      .eq('id', doc.id);
    if (dbError) {
      console.error('Error deleting document record:', dbError);
      toast.error('Failed to delete document record');
      return;
    }
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast.success('Document deleted');
  }

  async function handleDocFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files || []);
    e.target.value = '';
    if (incoming.length === 0 || !infringement?.id) return;

    setIsUploadingDoc(true);
    for (const file of incoming) {
      const storagePath = `${infringement.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('infringement-documents')
        .upload(storagePath, file, { contentType: file.type || 'application/pdf' });
      if (uploadError) {
        console.error('Upload failed:', file.name, uploadError);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      const { error: dbError } = await supabase.from('infringement_documents').insert({
        infringement_id: infringement.id,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
      });
      if (dbError) {
        console.error('DB insert failed:', file.name, dbError);
        toast.error(`Failed to record ${file.name}`);
      }
    }
    await fetchDocuments(infringement.id);
    setIsUploadingDoc(false);
    toast.success('Document(s) uploaded');
  }

  async function handleApproveAIMatch() {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('infringements')
        .update({
          status: 'Pending Driver Nomination',
          updated_at: new Date().toISOString()
        })
        .eq('id', infringement?.id);

      if (error) throw error;

      await supabase
        .from('audit_logs')
        .insert({
          infringement_id: infringement?.id,
          timestamp: new Date().toISOString(),
          actor: 'System User',
          actor_type: 'user',
          ip_address: '127.0.0.1',
          action: `Approved AI driver match: ${infringement?.assigned_driver}`
        });

      if (onUpdate && infringement) {
        onUpdate({
          ...infringement,
          status: 'Pending Driver Nomination',
          updated_at: new Date().toISOString()
        });
      }

      setIsVerified(true);
      toast.success('Driver match verified');
    } catch (error) {
      console.error('Error approving AI match:', error);
      toast.error('Failed to approve AI match');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRejectAIMatch() {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('infringements')
        .update({
          assigned_driver: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', infringement?.id);

      if (error) throw error;

      await supabase
        .from('audit_logs')
        .insert({
          infringement_id: infringement?.id,
          timestamp: new Date().toISOString(),
          actor: 'System User',
          actor_type: 'user',
          ip_address: '127.0.0.1',
          action: 'Rejected AI driver match - reassigning required'
        });

      if (onUpdate && infringement) {
        onUpdate({
          ...infringement,
          assigned_driver: null,
          updated_at: new Date().toISOString()
        });
      }

      toast.success('AI match rejected - ready for manual reassignment');
    } catch (error) {
      console.error('Error rejecting AI match:', error);
      toast.error('Failed to reject AI match');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: '.prose strong, .prose b, .prose em, .prose i { color: inherit !important; }' }} />
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className={`fixed top-0 right-0 h-screen w-[600px] sm:w-[800px] z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } bg-white dark:bg-slate-900 shadow-2xl flex flex-col`}>
        {/* Sticky Entity Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {infringement?.total_amount_payable != null || infringement?.fine_amount != null || infringement?.victims_levy != null
                    ? formatCurrency(Number(totalAmountDue))
                    : 'Amount TBC'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${urgency.className}`}>
                  <UrgencyIcon size={12} />
                  {urgency.text}
                </span>
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                {infringement?.offence_type || 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ref: {infringement?.reference_number || '—'} • ID: {infringement?.internal_id || '—'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getStatusColor(infringement?.status || 'New')} font-medium`}
            >
              {infringement?.status || 'New'}
            </span>
          </div>
        </div>

        {/* AI Confidence Card - Compact Horizontal Banner with Verified State */}
        {infringement?.assigned_driver && infringement?.status !== 'Closed' && (
          <>
            {!isVerified ? (
              // State 1: Pending Verification (Purple Banner)
              <div className="bg-purple-50 dark:bg-purple-900/10 px-4 py-3 border border-purple-200 dark:border-purple-800/50 shadow-sm my-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left Side: Icon + Title + Explanation */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300">
                        AI Match (98%): <span className="font-bold text-purple-950 dark:text-purple-200">{infringement?.assigned_driver}</span>
                      </h3>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                        Cross-referenced timestamp with Fleetio GPS and booking logs. Vehicle <span className="font-semibold text-slate-900 dark:text-slate-100">{infringement?.vrn}</span> was checked out to this driver during the time of the offence.
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleApproveAIMatch}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-500 dark:to-emerald-500 dark:hover:from-green-600 dark:hover:to-emerald-600 text-white font-bold rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>
                    <button
                      onClick={handleRejectAIMatch}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // State 2: Verified (Compact Green Banner)
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between px-4 py-2 rounded-lg my-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                    AI Match Verified: {infringement?.assigned_driver}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsVerified(false);
                    toast.success('Verification undone');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Undo
                </button>
              </div>
            )}
          </>
        )}

        {/* Dynamic Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex px-6 gap-6 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye size={16} />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('telematics')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'telematics'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Radio size={16} />
                Telematics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('communications')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'communications'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail size={16} />
                Messages
              </div>
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'financials'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign size={16} />
                Finance
              </div>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                Documents
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    VRN/Rego
                  </label>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {infringement?.vrn || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Customer Base
                  </label>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {infringement?.customer_base || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Issue Date
                  </label>
                  <p className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">
                    {infringement?.offence_date ? formatAppDate(infringement.offence_date) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Due Date
                  </label>
                  <p className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">
                    {formatAppDate(dueDate.toISOString())}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Issuing Authority
                  </label>
                  <p className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">
                    {infringement?.issuing_authority || '—'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Issuing State
                  </label>
                  <p className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">
                    {infringement?.issuing_state || '—'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assigned Driver
                  </label>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {infringement?.assigned_driver || 'Not assigned'}
                  </p>
                </div>
                {infringement?.offence_location && (
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Offence Location
                    </label>
                    <p className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">
                      {infringement?.offence_location}
                    </p>
                  </div>
                )}
                {infringement?.notes && (
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Notes
                    </label>
                    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      {infringement?.notes}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'telematics' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Radio size={18} className="text-blue-600 dark:text-blue-400" />
                  Geotab Trip Replay
                </h3>
                <div className="bg-white dark:bg-slate-950 rounded-lg h-80 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800">
                    <div className="absolute top-4 left-4 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Navigation size={16} className="text-blue-600 dark:text-blue-400" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {infringement?.offence_location || 'Location unavailable'}
                        </p>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-lg"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Zap size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        NFC Driver ID
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {infringement?.assigned_driver || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Verified via Geotab NFC tag scan at trip start
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <TrendingUp size={20} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Speed Data
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        68 km/h in 60 zone
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Recorded speed vs posted limit at offence time
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <Camera size={20} className="text-slate-600 dark:text-slate-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Traffic Camera Evidence
                  </h4>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg h-48 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <div className="text-center">
                    <Camera size={48} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Camera Photo Available
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      VRN {infringement?.vrn} captured
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="space-y-4 flex flex-col h-full">
              {/* Chat Timeline */}
              <div className="overflow-y-auto max-h-[400px] mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-4">
                  {messageHistory.map((message) => {
                    const inbound = message.isInbound;
                    return (
                    <div key={message.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-lg border p-3 shadow-sm ${inbound ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {inbound ? (
                            <Reply size={14} className="text-blue-600 dark:text-blue-400" />
                          ) : message.type === 'email' ? (
                            <Mail size={14} className="text-blue-600 dark:text-blue-400" />
                          ) : message.type === 'sms' ? (
                            <Smartphone size={14} className="text-purple-600 dark:text-purple-400" />
                          ) : (
                            <MessagesSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {message.sender}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {message.date}
                          </span>
                          {message.deliveryStatus && (
                            <span
                              className={`ml-auto inline-flex items-center ${message.deliveryStatus === 'read' ? 'text-blue-600 dark:text-blue-400' : message.deliveryStatus === 'failed' ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
                              title={message.deliveryStatus === 'read' ? 'Read' : message.deliveryStatus === 'delivered' ? 'Delivered' : message.deliveryStatus === 'failed' ? 'Not sent' : 'Sent'}
                              aria-label={message.deliveryStatus === 'read' ? 'Read' : message.deliveryStatus === 'delivered' ? 'Delivered' : message.deliveryStatus === 'failed' ? 'Not sent' : 'Sent'}
                            >
                              {message.deliveryStatus === 'failed' ? <XCircle size={15} /> : message.deliveryStatus === 'sent' ? <Check size={15} strokeWidth={2.5} /> : <CheckCheck size={15} strokeWidth={2.5} />}
                            </span>
                          )}
                        </div>
                        {((message.ccRecipients?.length ?? 0) > 0 || (message.bccRecipients?.length ?? 0) > 0) && (
                          <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                            {message.ccRecipients?.length ? `Cc: ${message.ccRecipients.join(', ')}` : ''}
                            {message.ccRecipients?.length && message.bccRecipients?.length ? ' • ' : ''}
                            {message.bccRecipients?.length ? `Bcc: ${message.bccRecipients.join(', ')}` : ''}
                          </p>
                        )}
                        <div dangerouslySetInnerHTML={{ __html: message.text }} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 ![&_strong]:text-inherit ![&_em]:text-inherit" />
                      </div>
                    </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Simulate Client Reply Bar */}
              <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Reply size={16} className="text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Test the stat dec review process</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400/80">Simulate an inbound reply from the fleet client with driver nomination details.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateClientReply}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Reply size={14} />
                  Simulate Client Reply
                </button>
              </div>

              {/* Omnichannel Composer */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                {/* Channel Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveChannel('email')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeChannel === 'email'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mail size={14} />
                      Email
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveChannel('sms')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeChannel === 'sms'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} />
                      SMS
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveChannel('whatsapp')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeChannel === 'whatsapp'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessagesSquare size={16} />
                      WhatsApp
                    </div>
                  </button>
                </div>

                {/* Input Area */}
                {activeChannel === 'email' && (
                  <div className="mb-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <label htmlFor="recipient-email" className="w-8 flex-shrink-0 text-sm text-slate-500 dark:text-slate-400">To</label>
                      <input
                        id="recipient-email"
                        type="text"
                        value={recipientEmail}
                        onChange={(event) => setRecipientEmail(event.target.value)}
                        placeholder="recipient@example.com"
                        aria-describedby="recipient-help"
                        className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                      />
                      <div className="flex flex-shrink-0 items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <button type="button" onClick={() => setShowCc((visible) => !visible)} className={`hover:text-blue-600 dark:hover:text-blue-400 ${showCc ? 'text-blue-600 dark:text-blue-400' : ''}`}>Cc</button>
                        <button type="button" onClick={() => setShowBcc((visible) => !visible)} className={`hover:text-blue-600 dark:hover:text-blue-400 ${showBcc ? 'text-blue-600 dark:text-blue-400' : ''}`}>Bcc</button>
                      </div>
                    </div>
                    {showCc && (
                      <div className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
                        <label htmlFor="cc-recipients" className="w-8 flex-shrink-0 text-sm text-slate-500 dark:text-slate-400">Cc</label>
                        <input
                          id="cc-recipients"
                          type="text"
                          value={ccRecipients}
                          onChange={(event) => setCcRecipients(event.target.value)}
                          placeholder="Add Cc recipients"
                          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                        />
                      </div>
                    )}
                    {showBcc && (
                      <div className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
                        <label htmlFor="bcc-recipients" className="w-8 flex-shrink-0 text-sm text-slate-500 dark:text-slate-400">Bcc</label>
                        <input
                          id="bcc-recipients"
                          type="text"
                          value={bccRecipients}
                          onChange={(event) => setBccRecipients(event.target.value)}
                          placeholder="Add Bcc recipients"
                          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                        />
                      </div>
                    )}
                    <p id="recipient-help" className="px-3 pb-2 text-[11px] text-slate-400 dark:text-slate-500">Separate multiple addresses with commas.</p>
                    <div className="mx-3 mb-3 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Track email opens</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Adds a read indicator. Leave off for DoD recipients.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={trackEmailOpens}
                        aria-label="Track email opens"
                        onClick={() => setTrackEmailOpens((enabled) => !enabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${trackEmailOpens ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${trackEmailOpens ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="mx-3 mb-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <Paperclip size={14} className="text-slate-500" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Attachments</p>
                        {selectedAttachmentIds.size > 0 && (
                          <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">{selectedAttachmentIds.size} selected</span>
                        )}
                      </div>
                      {loadingDocuments ? (
                        <p className="px-3 py-2.5 text-[11px] text-slate-400 dark:text-slate-500">Loading documents...</p>
                      ) : documents.length === 0 ? (
                        <p className="px-3 py-2.5 text-[11px] text-slate-400 dark:text-slate-500">No documents uploaded for this infringement.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto">
                          {documents.map((doc) => (
                            <div
                              key={doc.id}
                              onClick={() => toggleAttachmentSelection(doc.id)}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                              <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedAttachmentIds.has(doc.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                {selectedAttachmentIds.has(doc.id) && <Check size={12} className="text-white" />}
                              </div>
                              <FileText size={14} className="flex-shrink-0 text-slate-400" />
                              <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{doc.file_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Unified Composer Card */}
                <div className="flex flex-col border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  {/* Formatting Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="p-1.5 text-slate-500 hover:text-slate-700 disabled:opacity-50"><Undo size={16} /></button>
                    <button onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="p-1.5 text-slate-500 hover:text-slate-700 disabled:opacity-50"><Redo size={16} /></button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                    <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-1.5 rounded ${editor?.isActive('bold') ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><Bold size={16} /></button>
                    <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-1.5 rounded ${editor?.isActive('italic') ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><Italic size={16} /></button>
                    <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded ${editor?.isActive('underline') ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><UnderlineIcon size={16} /></button>

                    <div className="relative">
                      <button onClick={() => setIsColorMenuOpen(!isColorMenuOpen)} className="flex items-center justify-center gap-1 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Type size={16} style={{ color: editor?.getAttributes('textStyle').color || 'inherit' }} />
                        <ChevronDown size={12} className="text-slate-500" />
                      </button>
                      {isColorMenuOpen && (
                        <div className="absolute top-full left-0 mt-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xl z-50 w-max">
                          <div className="grid grid-cols-7 gap-0.5">
                            {GMAIL_COLORS.map(color => (
                              <button
                                key={color}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { editor?.chain().focus().setColor(color).run(); setIsColorMenuOpen(false); }}
                                className="w-5 h-5 rounded-sm border border-transparent hover:border-slate-400 dark:hover:border-slate-500 hover:scale-110 transition-all"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                    <button onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'left' }) ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><AlignLeft size={16} /></button>
                    <button onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'center' }) ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><AlignCenter size={16} /></button>
                    <button onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'right' }) ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><AlignRight size={16} /></button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                    <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded ${editor?.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><ListOrdered size={16} /></button>
                    <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded ${editor?.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100'}`}><List size={16} /></button>
                  </div>

                  {/* Editor */}
                  <EditorContent editor={editor} />

                  {/* Action Bar */}
                  <div className="flex items-center justify-between px-3 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Wand2 size={16} />
                        Templates
                      </button>
                      {isTemplateMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                            Insert Template
                          </div>
                          <button
                            onClick={() => handleApplyTemplate('nomination')}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
                          >
                            Driver Nomination Request
                          </button>
                          <button
                            onClick={() => handleApplyTemplate('reminder')}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            Urgent Payment Reminder
                          </button>
                        </div>
                      )}
                    </div>

                    {/* New Gemini Button */}
                    <button
                      onClick={handleDraftWithGemini}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800/50 rounded-lg dark:text-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-colors"
                    >
                      <Sparkles size={16} />
                      <span className="hidden sm:inline">Draft with Gemini</span>
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!editor || editor.isEmpty}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${!editor || editor.isEmpty ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' : activeChannel === 'email' ? 'bg-blue-600 hover:bg-blue-700 shadow-sm' : activeChannel === 'sms' ? 'bg-purple-600 hover:bg-purple-700 shadow-sm' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'}`}
                  >
                    <Send size={16} />
                    Send Message
                  </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              {/* Xero-style Create Bill Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-sm">X</span>
                    </div>
                    <h3 className="text-base font-bold text-blue-900 dark:text-blue-100">
                      Create Bill in Xero
                    </h3>
                  </div>
                </div>

                {/* Who/What/Why Inputs */}
                <div className="px-6 py-5 space-y-4">
                  {/* Row 1: Who */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Who
                    </label>
                    <div className="col-span-10">
                      <input
                        type="text"
                        value={infringement?.issuing_authority || ''}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Row 2: What */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      What
                    </label>
                    <div className="col-span-10">
                      <select
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      >
                        <option>429 - General Expenses</option>
                        <option>200 - Sales</option>
                        <option>400 - Advertising</option>
                        <option>410 - Bank Fees</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Why */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Why
                    </label>
                    <div className="col-span-10">
                      <input
                        type="text"
                        value={`Infringement ${infringement?.reference_number || 'N/A'} - ${infringement?.vrn || 'N/A'}`}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Line Item Grid */}
                <div className="px-6 pb-5">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tracking Category
                        </label>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                          {infringement?.customer_base || 'N/A'}
                        </p>
                      </div>
                      <div className="col-span-4">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tax Rate
                        </label>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                          BAS Excluded
                        </p>
                      </div>
                      <div className="col-span-4 text-right">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Amount
                        </label>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {formatCurrency(Number(totalAmountDue))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-6 pb-6 flex justify-end">
                  <button className="px-8 py-3 bg-[#10a852] hover:bg-[#0e9247] text-white font-semibold rounded-md transition-colors shadow-sm hover:shadow-md flex items-center gap-2">
                    <DollarSign size={18} />
                    Push to Xero
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <input
                ref={docFileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                onChange={handleDocFileUpload}
                className="hidden"
              />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                    Source Documents
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Original notices and supporting documentation from government authorities and internal systems.
                  </p>
                </div>
                <button
                  onClick={() => docFileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <UploadCloud size={16} />
                  {isUploadingDoc ? 'Uploading...' : 'Upload'}
                </button>
              </div>

              {loadingDocuments ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  <FileText size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No documents uploaded yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click "Upload" to add a PDF</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={20} className="text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {doc.file_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Uploaded {formatAppDate(doc.uploaded_at)}
                            {doc.file_size ? ` • ${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDocumentPreview(doc)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDocumentDownload(doc)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDocumentDelete(doc)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {previewUrl && (
                <div className="fixed inset-0 z-[60] bg-slate-900/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
                  <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Document Preview</span>
                      <button onClick={() => setPreviewUrl(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} className="text-slate-600 dark:text-slate-400" />
                      </button>
                    </div>
                    <iframe src={previewUrl} className="flex-1 w-full rounded-b-lg" title="Document Preview" />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ocr' && (
            <div className="space-y-6">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg h-64 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                <div className="text-center">
                  <FileText size={48} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Scanned PDF Document
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Document preview placeholder
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Extracted Fields
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        VRN Match
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      99%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Reference Number
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      98%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Fine Amount
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      97%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Offence Date
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      89%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Issuing Authority
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      95%
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                        OCR Verification Complete
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        {infringement.ocr_verified_by || 'System'} verified on {infringement.ocr_verified_at ? formatAppDate(infringement.ocr_verified_at) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              {loadingAudit ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading audit trail...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No audit events found</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                  <div className="space-y-4">
                    {auditLogs.map((log, index) => (
                      <div key={log.id} className="relative pl-8">
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {log.action}
                            </p>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatAppDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            by {log.actor} ({log.actor_type})
                          </p>
                          {log.ip_address && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        {isGeneratingPdf ? (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Generating Statutory Declaration PDF...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Building the document and saving to the infringement file</p>
            </div>
          </div>
        ) : showSignaturePad ? (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <PenTool size={18} className="text-blue-600 dark:text-blue-400" />
              Electronic Signature
            </h3>
            {generatedPdfUrl && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
                <FileText size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Statutory declaration generated</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate">PDF saved to the Documents tab</p>
                </div>
                <a
                  href={generatedPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                >
                  <Download size={14} />
                  View PDF
                </a>
              </div>
            )}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center mb-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Signature pad placeholder</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowSignaturePad(false)}
                className="px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNomination}
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            {nominatedDriver ? (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  Driver nominated: <strong>{nominatedDriver.name}</strong> — review the statutory declaration before signing.
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => toast.info('Undo functionality coming soon')}
                className="px-4 py-3 flex items-center justify-center gap-2 border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Undo2 size={18} />
                Undo Last Step
              </button>
              <button
                onClick={() => nominatedDriver ? setIsStatDecModalOpen(true) : setShowSignaturePad(true)}
                disabled={!nominatedDriver}
                className={`px-4 py-3 flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors shadow-sm ${nominatedDriver ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}
              >
                <PenTool size={18} />
                {nominatedDriver ? 'Review & Sign Stat Dec' : 'Awaiting Driver Nomination'}
              </button>
            </div>
          </div>
        )}
      </div>

      <StatDecModal
        isOpen={isStatDecModalOpen}
        onClose={() => setIsStatDecModalOpen(false)}
        onSubmit={handleStatDecSubmit}
        infringementNoticeNumber={statDecPayload?.infringement_notice_number || infringement?.reference_number || 'N/A'}
        vehicleRegistration={statDecPayload?.vehicle_registration || infringement?.vrn || 'N/A'}
        offenceDate={statDecPayload?.offence_date || infringement?.offence_date || infringement?.date_received || new Date().toISOString()}
        driverData={nominatedDriver ? { driver_name: nominatedDriver.name, method: nominatedDriver.method } : undefined}
        brandName={infringement?.customer_base as string | undefined}
        sourceEmailHtml={sourceEmailHtml}
        sourceEmailSender={sourceEmailSender}
      />
    </>
  );
}
