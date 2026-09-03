import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from './pricing';
import { JAVIER_ALMADA_SIGNATURE } from './signature';

const LOGO_URL = 'https://media.base44.com/images/public/6a70f20332bd3ec0ab545f1c/c0851b31c_5894c7c3-5a29-416d-a38b-138a4ef23d77.jpg';

export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta_debito: 'Tarjeta de Débito',
  tarjeta_credito: 'Tarjeta de Crédito',
  otro: 'Otro',
};

const loadImageAsDataURL = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      try {
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), ratio: img.naturalWidth / img.naturalHeight });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });

const UNITS = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
const TENS = ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const HUNDREDS = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];

function tens(n) {
  if (n < 30) return UNITS[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (u === 0) return TENS[t];
  return `${TENS[t]} y ${UNITS[u]}`;
}

function hundreds(n) {
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100), r = n % 100;
  let str = h > 0 ? HUNDREDS[h] : '';
  if (r > 0) str = str ? `${str} ${tens(r)}` : tens(r);
  return str;
}

function numberToSpanishWords(num) {
  if (num === 0) return 'cero';
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const rest = num % 1000;
  const parts = [];
  if (millions > 0) parts.push(millions === 1 ? 'un millón' : `${hundreds(millions)} millones`);
  if (thousands > 0) parts.push(thousands === 1 ? 'mil' : `${hundreds(thousands)} mil`);
  if (rest > 0) parts.push(hundreds(rest));
  return parts.join(' ');
}

function amountInWords(amount) {
  const intPart = Math.floor(Math.abs(amount));
  return `Son Pesos ${numberToSpanishWords(intPart)} Con 00/100`;
}

function formatLongDate(dateStr) {
  if (!dateStr) return '';
  try {
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const cleanDate = dateStr.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Generates and downloads a formal receipt PDF with real handwritten signature.
 */
export async function generateReceiptPdf(data) {
  const { receiptNumber, date, amount, paymentMethod, payerName, eventDate, eventTitle } = data;

  const doc = new jsPDF();
  const ink = [51, 68, 102];       // dark muted blue
  const gold = [184, 134, 11];
  const black = [0, 0, 0];
  const muted = [130, 130, 130];

  // ===== Logo top-right =====
  const logoSize = 26;
  const logoX = 210 - 14 - logoSize;
  const logoY = 16;
  try {
    const loaded = await loadImageAsDataURL(LOGO_URL);
    doc.addImage(loaded.dataUrl, 'JPEG', logoX, logoY, logoSize, logoSize);
  } catch (e) {
    doc.setFillColor(...black);
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, 'F');
    doc.setTextColor(...gold);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.text('LA\nJULIANA', logoX + logoSize / 2, logoY + logoSize / 2 + 1, { align: 'center' });
  }

  // ===== Date below logo (right-aligned) =====
  doc.setTextColor(...ink);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(formatLongDate(date), 196, logoY + logoSize + 7, { align: 'right' });

  // ===== Title =====
  let y = 72;
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...ink);
  doc.text('RECIBO OFICIAL DE PAGO', 14, y);
  if (receiptNumber) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...muted);
    doc.text(`N° ${receiptNumber}`, 14, y + 6);
  }

  // ===== Divider =====
  y += 12;
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);
  y += 12;

  // ===== Body =====
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);

  const lines = [
    `RECIBÍ LA SUMA DE: ${formatCurrency(amount)} (${amountInWords(amount)})`,
    `CONDICIÓN: ${PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod || '-'}`,
    `POR PARTE DE: ${payerName || '-'}`,
    `FECHA DEL EVENTO: ${formatDate(eventDate)}`,
    `TIPO DE EVENTO: ${eventTitle || '-'}`,
  ];

  let cy = y;
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 182);
    doc.text(wrapped, 14, cy);
    cy += 7.5 * wrapped.length + 3;
  });

  // ===== Firma Real de Javier Almada =====
  const sigY = 242;

  try {
    const loadedSig = await loadImageAsDataURL('/firma_javier_almada.png');
    doc.addImage(loadedSig.dataUrl, 'PNG', 14, sigY - 26, 65, 24);
  } catch (e) {
    try {
      if (JAVIER_ALMADA_SIGNATURE) {
        doc.addImage(JAVIER_ALMADA_SIGNATURE, 'PNG', 14, sigY - 26, 65, 24);
      }
    } catch (err) {
      console.warn('Error embedding signature image:', err);
    }
  }

  // Línea de firma
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.4);
  doc.line(14, sigY, 95, sigY);

  // Texto y sello digital
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...ink);
  doc.text('Javier Almada', 14, sigY + 5);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...ink);
  doc.text('QUINTA LA JULIANA', 14, sigY + 9);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text('FIRMA REAL AUTORIZADA · COMPROBANTE OFICIAL', 14, sigY + 13);

  // Sello digital de verificación
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.roundedRect(102, sigY - 12, 94, 25, 2, 2, 'D');
  doc.setTextColor(...gold);
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'bold');
  doc.text('VERIFICADO Y VALIDADO', 149, sigY - 4, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text(`Comprobante N°: ${receiptNumber || 'REC-OFFICIAL'}`, 149, sigY + 1, { align: 'center' });
  doc.text('Emisión oficial - Quinta La Juliana', 149, sigY + 6, { align: 'center' });

  // ===== Footer =====
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.setFont(undefined, 'normal');
  doc.text('Eventos y Hospedaje · Quinta La Juliana', 196, 290, { align: 'right' });

  const fileName = `recibo_${(receiptNumber || 'pago').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}
