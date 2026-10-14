import { X, UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { triggeriPaaSWorkflow } from '../lib/webhook';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadFile {
  name: string;
  status: 'uploading' | 'processing' | 'complete';
  progress: number;
}

const NT_NOTICE = {
  customer_base: 'Fleetcar' as const,
  vrn: 'CF30XP',
  offence_type: 'B/Corp Exceed speed limit up to 15km/h',
  issuing_state: 'NT' as const,
  issuing_authority: 'Northern Territory Police',
  fine_amount: 750,
  corporate_fine_amount: 750,
  victims_levy: 58,
  total_amount_payable: 808,
  due_date: '2026-06-04',
  reference_number: 'RL00281684',
  bpay_biller_code: '696344',
  bpay_reference: '2680145884',
  offence_location: '9001 - Stuart Hwy / Deviney Rd (Outbound)',
  offence_date: '2026-05-04T08:49:00+09:30',
};

export function BulkUploadModal({ isOpen, onClose, onUploadComplete }: BulkUploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    startUpload(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    startUpload(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const startUpload = (incomingFiles: File[]) => {
    if (isProcessing || incomingFiles.length === 0) return;

    const pdfFiles = incomingFiles.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')).slice(0, 50);
    if (pdfFiles.length === 0) return;

    setIsProcessing(true);
    setSelectedFiles(pdfFiles);
    const uploadFiles: UploadFile[] = pdfFiles.map((file) => ({
      name: file.name,
      status: 'uploading',
      progress: 0,
    }));
    setFiles(uploadFiles);

    uploadFiles.forEach((_, index) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'uploading', progress: 50 } : f
          )
        );
      }, index * 500);

      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'uploading', progress: 100 } : f
          )
        );
      }, index * 500 + 800);

      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'processing', progress: 0 } : f
          )
        );
      }, index * 500 + 1200);

      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'processing', progress: 100 } : f
          )
        );
      }, index * 500 + 2200);

      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'complete', progress: 100 } : f
          )
        );
      }, index * 500 + 2400);
    });
  };

  const allComplete = files.length > 0 && files.every((f) => f.status === 'complete');

  const handleDone = async () => {
    const records = selectedFiles.map((file) => ({
      ...NT_NOTICE,
      notes: `Uploaded document: ${file.name}`,
      status: 'New' as const,
      date_received: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('infringements').insert(records).select();

    if (error) {
      console.error('Failed to insert infringements:', error);
      toast.error('Failed to save infringements');
      return;
    }

    if (data) {
      // Upload each PDF to storage and create document records
      await Promise.all(
        data.map(async (inf, index) => {
          const file = selectedFiles[index];
          const storagePath = `${inf.id}/${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from('infringement-documents')
            .upload(storagePath, file, { contentType: file.type || 'application/pdf' });

          if (uploadError) {
            console.error('Failed to upload file:', file.name, uploadError);
            return;
          }

          await supabase.from('infringement_documents').insert({
            infringement_id: inf.id,
            file_name: file.name,
            storage_path: storagePath,
            file_size: file.size,
            mime_type: file.type || 'application/pdf',
          });
        })
      );

      await Promise.all(
        data.map((inf) =>
          triggeriPaaSWorkflow('infringement.created', {
            id: inf.id,
            internal_id: inf.internal_id,
            reference_number: inf.reference_number,
            vrn: inf.vrn,
            offence_type: inf.offence_type,
            offence_location: inf.offence_location,
            fine_amount: inf.fine_amount,
            corporate_fine_amount: inf.corporate_fine_amount,
            victims_levy: inf.victims_levy,
            total_amount_payable: inf.total_amount_payable,
            due_date: inf.due_date,
            customer_base: inf.customer_base,
            issuing_state: inf.issuing_state,
            issuing_authority: inf.issuing_authority,
            bpay_biller_code: inf.bpay_biller_code,
            bpay_reference: inf.bpay_reference,
            status: inf.status,
            offence_date: inf.offence_date,
            date_received: inf.date_received,
          })
        )
      );
    }

    onUploadComplete();
    onClose();
    setFiles([]);
    setSelectedFiles([]);
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (isProcessing && !allComplete) {
      if (!confirm('Upload in progress. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
    setFiles([]);
    setSelectedFiles([]);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95%] md:max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UploadCloud size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Bulk Upload Fines</h2>
              <p className="text-sm text-slate-600">Upload PDF infringement notices</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileSelect}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
            } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <UploadCloud
              size={64}
              className={`mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
            />
            <p className="text-lg font-medium text-slate-900 mb-2">
              {isDragging
                ? 'Drop files here'
                : 'Drag and drop up to 50 scanned fines (PDF) here'}
            </p>
            <p className="text-sm text-slate-600">or click to browse</p>
            <p className="text-xs text-slate-500 mt-4">Supported format: PDF (max 10MB each)</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  Upload Progress ({files.filter((f) => f.status === 'complete').length}/
                  {files.length})
                </h3>
                {allComplete && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle size={16} />
                    All files processed
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText size={20} className="text-slate-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'uploading' && (
                          <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                            <Loader2 size={14} className="animate-spin" />
                            Uploading...
                          </span>
                        )}
                        {file.status === 'processing' && (
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <Loader2 size={14} className="animate-spin" />
                            Processing OCR...
                          </span>
                        )}
                        {file.status === 'complete' && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle size={14} />
                            Complete
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          file.status === 'uploading'
                            ? 'bg-blue-500'
                            : file.status === 'processing'
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">
                    Upload Complete
                  </h4>
                  <p className="text-sm text-green-800">
                    {files.length} infringement notice{files.length !== 1 ? 's' : ''} have been
                    processed and added to the triage inbox. They will appear with a "New" status
                    and are ready for review.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            disabled={isProcessing && !allComplete}
          >
            Cancel
          </button>
          {allComplete && (
            <button
              onClick={handleDone}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-150 active:scale-95 flex items-center gap-2"
            >
              <CheckCircle size={18} />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
