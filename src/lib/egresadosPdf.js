import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from './pricing';

const HEADER_IMAGE_URL = 'https://media.base44.com/images/public/6a70f20332bd3ec0ab545f1c/c60663606_WhatsAppImage2026-08-04at104612.jpg';

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

/**
 * Generates and downloads an Egresados Ticket Audit & Collection PDF Report.
 * @param {Object} params
 * @param {Object} params.event
 * @param {Array} params.graduates
 * @param {Array} params.payments
 * @param {Object} [params.settings]
 */
export async function generateEgresadosReportPdf({ event, graduates = [], payments = [], settings }) {
  const quintaName = settings?.quinta_name || 'Quinta La Juliana';
  const quintaPhone = settings?.quinta_phone || '';
  const cardValue = event?.card_value || 0;
  const doc = new jsPDF();

  // Color Palette
  const violet = [124, 58, 237];       // violet-600
  const violetDark = [91, 33, 182];    // violet-800
  const cream = [245, 240, 232];
  const ink = [51, 51, 51];
  const muted = [120, 120, 120];

  // Header Image
  let headerHeight = 38;
  try {
    const loaded = await loadImageAsDataURL(HEADER_IMAGE_URL);
    headerHeight = Math.min(210 / loaded.ratio, 45);
    doc.addImage(loaded.dataUrl, 'JPEG', 0, 0, 210, headerHeight);
  } catch (e) {
    doc.setFillColor(...violetDark);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(quintaName, 105, 16, { align: 'center' });
    headerHeight = 32;
  }

  let y = headerHeight + 6;

  // Title Box
  doc.setFillColor(...cream);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
  doc.setTextColor(...violetDark);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('ESTADO DE TARJETAS Y COBRANZAS DE EGRESADOS', 20, y + 8);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  const subtitle = `Evento / Colegio: ${event.title}  ·  Fecha: ${formatDate(event.start_date)}  ·  Valor Tarjeta: ${formatCurrency(cardValue)}`;
  doc.text(subtitle, 20, y + 16);
  y += 28;

  // Aggregated Summary
  let totalRecaudado = 0;
  let totalAdultos = 0;
  let totalMenores50 = 0;
  let totalSinCargo5 = 0;
  let totalCUD = 0;

  graduates.forEach((g) => {
    totalRecaudado += Number(g.paid_amount || 0);
    totalAdultos += Number(g.adult_cards || 0);
    totalMenores50 += Number(g.half_cards || 0);
    totalSinCargo5 += Number(g.free_under5_cards || 0);
    const cudList = Array.isArray(g.cud_cards_detail) ? g.cud_cards_detail : [];
    totalCUD += cudList.length || Number(g.cud_cards_count || 0);
  });

  const totalComensales = totalAdultos + totalMenores50 + totalSinCargo5 + totalCUD;
  const plazasPagasEquiv = totalAdultos + totalMenores50 * 0.5;

  doc.setFillColor(243, 232, 255); // violet-100
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
  doc.setTextColor(...violetDark);
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL RECAUDADO: ${formatCurrency(totalRecaudado)}`, 20, y + 6);
  doc.text(`COMENSALES: ${totalComensales} pers. (${totalAdultos} Adultos · ${totalMenores50} Menores 50% · ${totalSinCargo5} <5a · ${totalCUD} CUD)`, 20, y + 12);
  doc.text(`PLAZAS EQUIVALENTES: ${plazasPagasEquiv}`, 145, y + 6);
  y += 22;

  // Table Header
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('Planilla por Alumno / Egresado', 14, y);
  doc.setDrawColor(...violet);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 85, y + 2);
  y += 7;

  // Table Column Titles
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...ink);
  doc.text('Alumno / Egresado', 16, y + 4.5);
  doc.text('Tarjetas Desglosadas', 75, y + 4.5);
  doc.text('Total', 132, y + 4.5);
  doc.text('Pagado', 152, y + 4.5);
  doc.text('Saldo', 174, y + 4.5);
  doc.text('Estado', 190, y + 4.5, { align: 'right' });
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(7.5);

  const cudBeneficiaries = [];

  graduates.forEach((g, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const adultC = Number(g.adult_cards || 0);
    const halfC = Number(g.half_cards || 0);
    const free5C = Number(g.free_under5_cards || 0);
    const cudList = Array.isArray(g.cud_cards_detail) ? g.cud_cards_detail : [];
    const cudC = cudList.length || Number(g.cud_cards_count || 0);

    const totalAmt = (adultC * cardValue) + (halfC * cardValue * 0.5);
    const paidAmt = Number(g.paid_amount || 0);
    const balance = totalAmt - paidAmt;

    let cardsLabel = `${adultC} Adultos`;
    if (halfC > 0) cardsLabel += ` · ${halfC} M.50%`;
    if (free5C > 0) cardsLabel += ` · ${free5C} <5a`;
    if (cudC > 0) cardsLabel += ` · ${cudC} CUD`;

    cudList.forEach((b) => {
      if (b.name) cudBeneficiaries.push({ graduate: g.name, name: b.name, dni: b.dni || '-' });
    });

    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, y - 3.5, 182, 5.5, 'F');
    }

    doc.setTextColor(...ink);
    doc.text(g.name, 16, y);
    doc.text(cardsLabel, 75, y);
    doc.text(formatCurrency(totalAmt), 132, y);
    doc.text(formatCurrency(paidAmt), 152, y);

    if (balance > 0) {
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(formatCurrency(balance), 174, y);
    } else {
      doc.setTextColor(22, 101, 52); // emerald-800
      doc.text('$0', 174, y);
    }

    const statusLabel = balance <= 0 && totalAmt > 0 ? 'PAGADO' : paidAmt > 0 ? 'PARCIAL' : 'PENDIENTE';
    doc.text(statusLabel, 196, y, { align: 'right' });

    y += 5.5;
  });

  // Section CUD DNI Registration
  if (cudBeneficiaries.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    } else {
      y += 6;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...violetDark);
    doc.text('Nómina de Pases CUD (Personas con Discapacidad con Acreditación)', 14, y);
    doc.setDrawColor(...violet);
    doc.setLineWidth(0.5);
    doc.line(14, y + 2, 140, y + 2);
    y += 7;

    doc.setFillColor(245, 245, 245);
    doc.rect(14, y, 182, 6, 'F');
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...ink);
    doc.text('Egresado / Familia', 16, y + 4.5);
    doc.text('Nombre Completo del Beneficiario CUD', 80, y + 4.5);
    doc.text('N° de DNI', 160, y + 4.5);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);

    cudBeneficiaries.forEach((b, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y - 3.5, 182, 5.5, 'F');
      }
      doc.text(b.graduate, 16, y);
      doc.text(b.name, 80, y);
      doc.text(b.dni, 160, y);
      y += 5.5;
    });
  }

  // Footer
  doc.setFillColor(...cream);
  doc.roundedRect(0, 282, 210, 15, 0, 0, 'F');
  doc.setTextColor(...muted);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  const footerLeft = quintaPhone ? `${quintaName}  ·  ${quintaPhone}` : quintaName;
  doc.text(footerLeft, 14, 290);
  doc.text(`Generado el ${formatDate(new Date().toISOString())}`, 196, 290, { align: 'right' });

  const fileName = `informe_egresados_${(event.title || 'colegio').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}
