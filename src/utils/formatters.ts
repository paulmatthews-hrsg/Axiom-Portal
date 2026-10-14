export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatted = formatter.format(amount);

  return `${formatted} ${currency}`;
}

export function formatVehicleDescription(
  vrn: string,
  color?: string,
  year?: number,
  make?: string,
  model?: string,
  registrationState?: string
): string {
  if (!color && !year && !make && !model && !registrationState) {
    return vrn;
  }

  const parts: string[] = [];

  if (color) parts.push(color);
  if (year) parts.push(year.toString());
  if (make) parts.push(make);
  if (model) parts.push(model);

  const vehicleDesc = parts.join(' ');

  if (registrationState) {
    return `${vehicleDesc} (${registrationState} Reg: ${vrn})`;
  }

  return `${vehicleDesc} (${vrn})`;
}

export function formatAppDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return 'Invalid Date';

  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = dateObj.toLocaleDateString('en-AU', { month: 'short' });
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}
