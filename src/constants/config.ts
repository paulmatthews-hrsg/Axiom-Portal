export const APP_NAME = 'PennyOS';

export const CUSTOMER_BASES = {
  GigCar: { name: 'GigCar', color: 'bg-[#E96146] bg-opacity-10 dark:bg-opacity-20 text-[#BB4131] dark:text-slate-100 border-[#E96146]' },
  Fleetcar: { name: 'Fleetcar', color: 'bg-[#2BACE2] bg-opacity-15 dark:bg-opacity-20 text-[#00447C] dark:text-slate-100 border-[#2BACE2]' },
  Yonder: { name: 'Yonder', color: 'bg-[#0B0C15] bg-opacity-5 dark:bg-opacity-100 text-[#0B0C15] dark:text-white border-[#0B0C15] border-opacity-20 dark:border-[#C51A20] dark:border-opacity-100' },
} as const;

export const INFRINGEMENT_STATUS = {
  NEW: 'New',
  AWAITING_COR: 'Awaiting COR Identification',
  STAT_DEC_PENDING: 'Stat Dec Pending',
  PENDING_FLEET_PAYMENT: 'Pending Fleet Payment',
  AWAITING_REIMBURSEMENT: 'Awaiting Reimbursement (Xero)',
  CLOSED: 'Closed',
} as const;

export const OFFENCE_TYPES = [
  'Speeding',
  'Red Light',
  'Parking',
  'Toll Violation',
  'Mobile Phone',
  'Seat Belt',
  'Other',
] as const;
