import type { Infringement } from '../types/database';

export function exportToCSV(data: Infringement[], filename: string) {
  const headers = [
    'Date Received',
    'Internal ID',
    'Reference Number',
    'Customer Base',
    'VRN/Rego',
    'Offence Type',
    'Assigned Driver',
    'Fine Amount',
    'Status',
    'Issuing State',
    'Issuing Authority',
  ];

  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const rows = data.map((item) => [
    escapeCSV(new Date(item.date_received).toLocaleDateString('en-AU')),
    escapeCSV(item.internal_id),
    escapeCSV(item.reference_number),
    escapeCSV(item.customer_base),
    escapeCSV(item.vrn),
    escapeCSV(item.offence_type),
    escapeCSV(item.assigned_driver),
    escapeCSV(item.fine_amount?.toString()),
    escapeCSV(item.status),
    escapeCSV(item.issuing_state),
    escapeCSV(item.issuing_authority),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
