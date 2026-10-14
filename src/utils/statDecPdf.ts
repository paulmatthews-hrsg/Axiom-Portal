import { PDFDocument, StandardFonts, rgb, LineCapStyle } from 'pdf-lib';
import type { StatutoryDeclarationPayload } from '../types/database';
import { formatAppDate } from './formatters';

const DECLARANT_GIVEN_NAMES = 'Paul Stewart Charles';
const DECLARANT_SURNAME = 'MATTHEWS';
const DECLARANT_CONTACT_NUMBER = '+61 436 288 596';
const DECLARANT_COMPANY = 'HRSG Australasia Pty Ltd';

const STATE_NAMES: Record<string, string> = {
  QLD: 'Queensland',
  NSW: 'New South Wales',
  VIC: 'Victoria',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
  ACT: 'Australian Capital Territory',
};

function formatDob(dob: string): string {
  if (!dob) return '';
  const date = new Date(dob);
  if (isNaN(date.getTime())) return dob;
  return formatAppDate(dob);
}

type PdfPage = ReturnType<PDFDocument['getPage']>;

function line(page: PdfPage, x1: number, y1: number, x2: number, y2: number, thickness = 0.5, gray = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: rgb(gray, gray, gray), lineCap: LineCapStyle.Butt });
}

function fieldLine(page: PdfPage, x: number, y: number, w: number) {
  line(page, x, y, x + w, y, 0.5, 0.4);
}

function value(page: PdfPage, text: string, x: number, y: number, size: number, font: ReturnType<PDFDocument['embedFont'] extends PromiseLike<infer U> ? () => PromiseLike<U> : never>) {
  if (!text) return;
  page.drawText(text, { x, y, size, font, color: rgb(0.05, 0.05, 0.4) });
}

function valueRight(page: PdfPage, text: string, rightX: number, y: number, size: number, font: ReturnType<PDFDocument['embedFont'] extends PromiseLike<infer U> ? () => PromiseLike<U> : never>) {
  if (!text) return;
  page.drawText(text, { x: rightX - font.widthOfTextAtSize(text, size), y, size, font, color: rgb(0.05, 0.05, 0.4) });
}

async function drawSignature(page: PdfPage, doc: PDFDocument, dataUrl: string, x: number, y: number, width: number, height: number) {
  if (!dataUrl) return;
  const base64 = dataUrl.split(',')[1];
  if (!base64) return;
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const image = await doc.embedPng(bytes);
  page.drawImage(image, { x, y, width, height });
}

async function buildStatDecPage(doc: PDFDocument, payload: StatutoryDeclarationPayload, basePage?: PdfPage): Promise<void> {
  const page = basePage || doc.addPage([595, 842]);
  if (basePage) {
    // Blank the full page — we redraw everything including the barcode box ourselves
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
  }
  const W = 595;
  const m = 40;

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let y = 800;

  // ── Header ──────────────────────────────────────────────────────────────────
  page.drawText('Important Information for Body Corporate Registered Owners and Operators of Vehicles', {
    x: m, y, size: 7, font: bold, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 10;
  const smallText = [
    'Speeding and disobeying a red traffic light are demerit points offences. When a driver is found to be responsible for one of these offences, demerit points are recorded against the driver licence.',
    'If a body corporate does not identify the person who had control of the vehicle (by returning the completed Driver/Ownership Statement Section) the following may happen:',
    '* A significantly higher infringement penalty applies (five times the amount applying to an individual).',
    '* Additionally, it is an offence if a body corporate, more than twice within 3 years, fails to identify the person who had control of the vehicle.',
  ];
  for (const t of smallText) {
    const wrapped = splitText(t, W - m * 2, 6.5, regular);
    for (const row of wrapped) {
      page.drawText(row, { x: m, y, size: 6.5, font: regular, color: rgb(0.2, 0.2, 0.2) });
      y -= 8;
    }
  }
  y -= 4;

  // ── Section title ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: m, y: y - 2, width: W - m * 2, height: 18, color: rgb(0.95, 0.95, 0.95) });
  page.drawText('Driver/Ownership Statement Section ', {
    x: m + 4, y: y + 3, size: 11, font: bold, color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('DO NOT MAKE PAYMENT IF A DRIVER IS BEING NOMINATED', {
    x: m + 4 + bold.widthOfTextAtSize('Driver/Ownership Statement Section ', 11), y: y + 3, size: 10, font: bold, color: rgb(0.8, 0, 0),
  });
  y -= 22;

  line(page, m, y + 2, W - m, y + 2);
  y -= 12;

  // ── I, [declarant] ───────────────────────────────────────────────────────────
  page.drawText('I,', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  fieldLine(page, m + 14, y - 1, 175);
  value(page, DECLARANT_GIVEN_NAMES, m + 16, y, 9, regular);
  page.drawText('Given Names', { x: m + 14, y: y - 10, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });

  fieldLine(page, m + 200, y - 1, 130);
  value(page, DECLARANT_SURNAME, m + 202, y, 9, regular);
  page.drawText('Surname', { x: m + 202, y: y - 10, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });

  page.drawText('(contact No.', { x: m + 342, y, size: 8, font: regular, color: rgb(0.3, 0.3, 0.3) });
  fieldLine(page, m + 392, y - 1, 120);
  value(page, DECLARANT_CONTACT_NUMBER, m + 394, y, 8, regular);
  page.drawText('(Phone/fax number)', { x: m + 393, y: y - 10, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  y -= 24;

  page.drawText('acting on behalf of (company name)', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  fieldLine(page, m + 178, y - 1, 235);
  value(page, DECLARANT_COMPANY, m + 180, y, 9, regular);
  y -= 8;
  page.drawText('(Address)', { x: m + 190, y, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;

  // ── Declaration text ──────────────────────────────────────────────────────────
  const declText = `Do solemnly and sincerely declare that at the time of the offence as stated in Traffic Infringement Number: ${payload.infringement_notice_number}`;
  const declLines = splitText(declText, W - m * 2, 9, regular);
  for (const row of declLines) {
    page.drawText(row, { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
    y -= 12;
  }
  page.drawText(`Issued to Motor Vehicle Registration Number: ${payload.vehicle_registration}`, { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  y -= 16;

  page.drawText('* I was not driving the vehicle', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  y -= 12;
  page.drawText('AND', { x: m + 14, y, size: 9, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 12;
  page.drawText('* The vehicle was driven by Or the vehicle was bought/sold/disposed on', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  line(page, m, y + 3, m + 510, y + 3, 1.2, 0.15);
  page.drawText('____/____/________', { x: m + 298, y, size: 9, font: regular, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('(date of purchase/sale/disposal)', { x: m + 375, y, size: 8, font: italic, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;

  // ── Nominated driver ─────────────────────────────────────────────────────────
  fieldLine(page, m, y - 1, W - m * 2);
  value(page, payload.nominated_driver_name, m + 2, y, 9, regular);
  page.drawText('(Full Name)', { x: m + 2, y: y - 10, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  y -= 22;

  page.drawText('of', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  fieldLine(page, m + 14, y - 1, W - m * 2 - 14);
  const addrLines = splitText(payload.nominated_driver_address || '', W - m * 2 - 20, 9, regular);
  let addrY = y;
  for (const row of addrLines) {
    value(page, row, m + 16, addrY, 9, regular);
    addrY -= 12;
  }
  page.drawText('(Postal Address)', { x: m + 16, y: y - 10, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  // ── Licence details ──────────────────────────────────────────────────────────
  const boxW = 155, boxH = 20;
  // Licence No
  page.drawRectangle({ x: m, y: y - boxH + 14, width: boxW, height: boxH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5, color: rgb(1, 1, 1) });
  page.drawText('Licence No', { x: m + 4, y: y - boxH + 18, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  valueRight(page, payload.nominated_driver_license_number || '', m + boxW - 6, y + 1, 9, regular);
  // Expiry
  page.drawRectangle({ x: m + 175, y: y - boxH + 14, width: boxW, height: boxH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5, color: rgb(1, 1, 1) });
  page.drawText('Expiry', { x: m + 179, y: y - boxH + 18, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  valueRight(page, formatDob(payload.nominated_driver_license_expiry || ''), m + 175 + boxW - 6, y + 1, 9, regular);
  y -= 26;

  // State
  page.drawRectangle({ x: m, y: y - boxH + 14, width: 80, height: boxH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5, color: rgb(1, 1, 1) });
  page.drawText('State', { x: m + 4, y: y - boxH + 18, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  valueRight(page, (STATE_NAMES[payload.nominated_driver_license_state] || payload.nominated_driver_license_state || '').slice(0, 12), m + 80 - 6, y + 1, 8, regular);
  // Licence Type
  page.drawRectangle({ x: m + 90, y: y - boxH + 14, width: 80, height: boxH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5, color: rgb(1, 1, 1) });
  page.drawText('Licence Type', { x: m + 94, y: y - boxH + 18, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  valueRight(page, payload.nominated_driver_license_type || '', m + 90 + 80 - 6, y + 1, 9, regular);
  // Date of Birth
  page.drawRectangle({ x: m + 175, y: y - boxH + 14, width: boxW, height: boxH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5, color: rgb(1, 1, 1) });
  page.drawText('Date of Birth', { x: m + 179, y: y - boxH + 18, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
  valueRight(page, formatDob(payload.nominated_driver_dob || ''), m + 175 + boxW - 6, y + 1, 9, regular);
  y -= 30;

  // ── Or stolen ─────────────────────────────────────────────────────────────────
  page.drawText('Or', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  y -= 12;
  page.drawText('* I was unable to exercise effective control of the vehicle because it had been stolen. SerPro/ICAD reference number', {
    x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1),
  });
  line(page, m, y + 3, m + 510, y + 3, 1.2, 0.15);
  fieldLine(page, m + 330, y - 1, 120);
  page.drawText('refers', { x: m + 454, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  y -= 16;

  // ── Solemn declaration ────────────────────────────────────────────────────────
  const solemnLines = splitText(
    'And I make this solemn declaration by virtue of the Oaths, Affidavits and Declarations Act 2010 conscientiously believing the statements contained in this declaration to be true in every particular.',
    W - m * 2, 9, regular,
  );
  for (const row of solemnLines) {
    page.drawText(row, { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
    y -= 12;
  }
  y -= 6;

  // ── Declared at ──────────────────────────────────────────────────────────────
  const generatedDate = new Date();
  const generatedDay = generatedDate.toLocaleDateString('en-AU', { day: '2-digit' });
  const generatedMonth = generatedDate.toLocaleDateString('en-AU', { month: 'long' });
  const generatedYear = generatedDate.toLocaleDateString('en-AU', { year: 'numeric' });
  page.drawText('Declared at -', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  fieldLine(page, m + 66, y - 1, 170);
  value(page, 'Darwin', m + 68, y, 9, regular);
  page.drawText('on the', { x: m + 246, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  fieldLine(page, m + 272, y - 1, 55);
  value(page, generatedDay, m + 274, y, 9, regular);
  page.drawText('day of', { x: m + 332, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  fieldLine(page, m + 360, y - 1, 60);
  value(page, generatedMonth, m + 362, y, 8, regular);
  page.drawText('20', { x: m + 424, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  fieldLine(page, m + 434, y - 1, 40);
  value(page, generatedYear.slice(-2), m + 436, y, 9, regular);

  // ── Internal Use Only barcode box ────────────────────────────────────────────
  // Positioned to the right of the year field, spanning the signature rows below,
  // matching the layout of the original NT government stat dec form.
  const bcX = W - m - 88;
  const bcY = y - 76;
  page.drawRectangle({ x: bcX, y: bcY, width: 88, height: 88, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.6, color: rgb(1, 1, 1) });
  page.drawText('Internal Use Only', { x: bcX + 4, y: bcY + 76, size: 6.5, font: italic, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(payload.infringement_notice_number, { x: bcX + 4, y: bcY + 6, size: 9, font: bold, color: rgb(0.05, 0.05, 0.05) });

  y -= 24;

  // ── Signature blocks ─────────────────────────────────────────────────────────
  const sigBlocks: [string, string][] = [
    ['(1)', 'Signature of person making this declaration'],
    ['(2)', 'Signature of person before whom the declaration is made'],
  ];
  for (const [num, lbl] of sigBlocks) {
    page.drawText(num, { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
    fieldLine(page, m + 14, y - 1, W / 2 - m - 14);
    if (num === '(1)') {
      await drawSignature(page, doc, payload.signature_declarant, m + 18, y - 2, 125, 22);
    }
    if (num === '(2)') {
      await drawSignature(page, doc, payload.signature_witness, m + 18, y - 2, 125, 22);
    }
    page.drawText(lbl, { x: m + 14, y: y - 10, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4) });
    y -= 34;
  }

  // Item (3) — witness details on one line
  page.drawText('(3)', { x: m, y, size: 9, font: regular, color: rgb(0.1, 0.1, 0.1) });
  const witnessLine = `${payload.witness_name}, ${payload.witness_address}, Tel ${payload.witness_phone}`;
  fieldLine(page, m + 14, y - 1, W - m * 2 - 14);
  page.drawText(witnessLine, { x: m + 16, y, size: 7.5, font: regular, color: rgb(0.05, 0.05, 0.4) });
  page.drawText('Name and contact address and phone number of person before whom the declaration is made', {
    x: m + 14, y: y - 10, size: 7, font: italic, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 26;

  // ── NOTE ───────────────────────────────────────────────────────────────────────
  y -= 4;
  page.drawText('NOTE: Making a declaration knowing it is false in a material particular is an offence for which you may be fined or imprisoned.', {
    x: m, y, size: 8, font: italic, color: rgb(0.2, 0.2, 0.2),
  });
  y -= 20;

  // ── Footer ─────────────────────────────────────────────────────────────────────
  line(page, m, y + 4, W - m, y + 4, 1, 0.3);
  y -= 4;
  const footer1 = 'This form should be completed and returned via email RedLight.Camera@nt.gov.au or post within 14 days of receipt of the notice should you wish to';
  page.drawText(footer1, { x: m, y, size: 7.5, font: regular, color: rgb(0.1, 0.1, 0.1) });
  y -= 10;
  page.drawText('avail yourself of the defences described overleaf. Incomplete details will result in this notice being returned to you.', {
    x: m, y, size: 7.5, font: bold, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 10;
  page.drawText('Phone: 08 8999 1345 · Fax: 08 8941 2893 · Post: RED LIGHT CAMERA OFFICE, GPO BOX 3435, DARWIN, NT, 0801', {
    x: m, y, size: 7.5, font: bold, color: rgb(0.1, 0.1, 0.1),
  });



  // ── Date generated ────────────────────────────────────────────────────────────
  page.drawText(`Generated: ${formatAppDate(new Date().toISOString())}`, {
    x: m, y: 20, size: 7, font: italic, color: rgb(0.5, 0.5, 0.5),
  });
}

function splitText(text: string, maxWidth: number, size: number, font: { widthOfTextAtSize: (t: string, s: number) => number }): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateStatDecPdf(
  payload: StatutoryDeclarationPayload,
  sourcePdfBuffer?: ArrayBuffer,
): Promise<Blob> {
  const output = await PDFDocument.create();

  if (sourcePdfBuffer) {
    try {
      const source = await PDFDocument.load(sourcePdfBuffer, { ignoreEncryption: true });
      if (source.getPageCount() >= 1) {
        const [firstPage] = await output.copyPages(source, [0]);
        output.addPage(firstPage);
      }
      if (source.getPageCount() >= 2) {
        const [statDecPage] = await output.copyPages(source, [1]);
        output.addPage(statDecPage);
        await buildStatDecPage(output, payload, output.getPages()[1]);
      } else {
        await buildStatDecPage(output, payload);
      }
    } catch {
      await buildStatDecPage(output, payload);
    }
  } else {
    await buildStatDecPage(output, payload);
  }
  const bytes = await output.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export function getStatDecFileName(payload: StatutoryDeclarationPayload): string {
  const vrn = payload.vehicle_registration.replace(/[^A-Za-z0-9]/g, '') || 'UNKNOWN';
  const tin = payload.infringement_notice_number.replace(/[^A-Za-z0-9]/g, '') || 'UNKNOWN';
  return `StatutoryDeclaration_${vrn}_${tin}.pdf`;
}
