import { X, Mail, Copy, Check, Printer, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface EmailInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INBOX_EMAIL = 'inbox-fines@pennyos.com.au';

export function EmailInboxModal({ isOpen, onClose }: EmailInboxModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(INBOX_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] md:max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Email-to-Inbox Settings</h2>
              <p className="text-sm text-slate-600">Automated document ingestion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
            <div className="flex items-start gap-3 mb-4">
              <Mail size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-900 mb-1">
                  PennyOS Ingestion Email Address
                </h3>
                <p className="text-sm text-emerald-800">
                  Use this email address to automatically import infringement notices into your
                  triage inbox.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-emerald-300 rounded-lg p-4 flex items-center justify-between">
              <div className="font-mono text-lg font-semibold text-slate-900 select-all">
                {INBOX_EMAIL}
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">How to Set Up</h4>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-900 mb-1">Configure Your Photocopier</p>
                  <p className="text-sm text-slate-600">
                    Access your office photocopier or scanner's settings and add{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {INBOX_EMAIL}
                    </span>{' '}
                    as a destination email address.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-900 mb-1">Scan and Send</p>
                  <p className="text-sm text-slate-600">
                    When you receive infringement notices by mail, scan them using the photocopier
                    and send directly to this email address.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-slate-900 mb-1">Automatic Processing</p>
                  <p className="text-sm text-slate-600">
                    PennyOS will automatically receive the PDFs, run OCR to extract key data, and
                    create new records in your triage inbox with "New" status.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Printer size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900">Quick Setup Flow</h4>
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <span className="font-medium">Mail Arrives</span>
                  <ArrowRight size={14} />
                  <span className="font-medium">Scan to Email</span>
                  <ArrowRight size={14} />
                  <span className="font-medium">Auto-Import to PennyOS</span>
                  <ArrowRight size={14} />
                  <span className="font-medium">Review & Process</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-2">Benefits</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>No manual data entry required</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatic OCR extraction of VRN, offence dates, and fine amounts</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Instant visibility in your workflow</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Seamless integration with existing office equipment</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
