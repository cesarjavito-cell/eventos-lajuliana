import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from './pricing';

/**
 * Generates and downloads an Egresados Ticket Audit & Collection PDF Report.
 * Clean, modern header without "PROPUESTA" banner, with graduates sorted alphabetically.
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

  // ===== Header Banner Vector Elegante (Sin marca "PROPUESTA") =====
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 32, 'F');

  // Gold accent bar
  doc.setFillColor(201, 160, 78); // #C9A04E
  doc.rect(0, 31, 210, 1.5, 'F');

  doc.setTextColor(230, 197, 122); // #E6C57A
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('QUINTA LA JULIANA', 14, 14);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.text('EVENTOS Y HOSPEDAJE  ·  REPORTE DE COBRANZAS Y TARJETAS DE EGRESADOS', 14, 22);

  let y = 38;

  // Title Box
  doc.setFillColor(...cream);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
  doc.setTextColor(...violetDark);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('ESTADO DE TARJETAS Y COBRANZAS DE EGRESADOS', 20, y + 8);

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  const subtitle = `Evento / Colegio: ${event.title}  ·  Fecha: ${formatDate(event.start_date)}  ·  Valor Tarjeta: ${formatCurrency(cardValue)}`;
  doc.text(subtitle, 20, y + 16);
  y += 28;

  // Sort graduates alphabetically by student name
  const sortedGraduates = [...graduates].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
  );

  // Aggregated Summary
  let totalRecaudado = 0;
  let totalAdultos = 0;
  let totalMenores50 = 0;
  let totalSinCargo5 = 0;
  let totalCUD = 0;

  sortedGraduates.forEach((g) => {
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
  doc.text('Planilla por Alumno / Egresado (Orden Alfabetico)', 14, y);
  doc.setDrawColor(...violet);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 95, y + 2);
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

  sortedGraduates.forEach((g, idx) => {
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
      doc.setTextColor(180, 83, 9);
      doc.text(formatCurrency(balance), 174, y);
    } else {
      doc.setTextColor(22, 101, 52);
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

/**
 * Generates and downloads an individual PDF Account Statement for a single Graduate.
 */
export async function generateIndividualGraduatePdf({ event, graduate, payments = [], settings }) {
  const quintaName = settings?.quinta_name || 'Quinta La Juliana';
  const quintaPhone = settings?.quinta_phone || 'Contacto: Quinta La Juliana';
  const cardValue = event?.card_value || 0;
  const doc = new jsPDF();

  const violetDark = [91, 33, 182];    // violet-800
  const cream = [245, 240, 232];
  const ink = [51, 51, 51];
  const muted = [120, 120, 120];

  // ===== Header Banner Vector Elegante =====
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 32, 'F');

  // Gold accent bar
  doc.setFillColor(201, 160, 78); // #C9A04E
  doc.rect(0, 31, 210, 1.5, 'F');

  doc.setTextColor(230, 197, 122); // #E6C57A
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('QUINTA LA JULIANA', 14, 14);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.text('EVENTOS Y HOSPEDAJE  ·  ESTADO DE CUENTA INDIVIDUAL DE EGRESADO', 14, 22);

  let y = 38;

  // Title Card
  doc.setFillColor(...cream);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
  doc.setTextColor(...violetDark);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('COMPROBANTE Y ESTADO DE CUENTA DE EGRESADO', 20, y + 8);

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  doc.text(`Evento / Colegio: ${event?.title || 'Fiesta de Egresados'}  ·  Fecha: ${formatDate(event?.start_date)}`, 20, y + 16);
  y += 30;

  // Student Info Box
  const adultC = Number(graduate?.adult_cards || 0);
  const halfC = Number(graduate?.half_cards || 0);
  const free5C = Number(graduate?.free_under5_cards || 0);
  const cudList = Array.isArray(graduate?.cud_cards_detail) ? graduate.cud_cards_detail : [];
  const cudC = cudList.length || Number(graduate?.cud_cards_count || 0);

  const totalAmt = (adultC * cardValue) + (halfC * cardValue * 0.5);
  const paidAmt = Number(graduate?.paid_amount || 0);
  const balanceAmt = totalAmt - paidAmt;

  doc.setFillColor(248, 246, 242);
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(14, y, 182, 36, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text(`Egresado / Alumno: ${graduate?.name || 'Estudiante'}`, 20, y + 8);

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  if (graduate?.phone) {
    doc.text(`Teléfono de Contacto: ${graduate.phone}`, 20, y + 15);
  }

  let cardsText = `Tarjetas: ${adultC} Adulto(s)`;
  if (halfC > 0) cardsText += ` · ${halfC} Menor 50%`;
  if (free5C > 0) cardsText += ` · ${free5C} Menor <5a (Sin Cargo)`;
  if (cudC > 0) cardsText += ` · ${cudC} CUD Discapacidad`;

  doc.text(cardsText, 20, y + 22);

  if (cudList.length > 0) {
    const cudNames = cudList.map((b) => `${b.name} (DNI ${b.dni || '-'})`).join(', ');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(`Beneficiarios CUD: ${cudNames}`, 20, y + 29);
  }
  y += 44;

  // Payments Table Header
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('Historial de Entregas y Pagos Registrados', 14, y);
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 95, y + 2);
  y += 7;

  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 6, 'F');
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...ink);
  doc.text('Fecha', 18, y + 4.5);
  doc.text('N° Recibo', 55, y + 4.5);
  doc.text('Método de Pago', 110, y + 4.5);
  doc.text('Monto Entregado', 190, y + 4.5, { align: 'right' });
  y += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);

  const gradPayments = payments.filter((p) => p.payer_name?.toLowerCase().trim() === graduate?.name?.toLowerCase().trim());

  if (gradPayments.length === 0) {
    doc.setTextColor(...muted);
    doc.text('No hay entregas registradas a la fecha.', 18, y + 4);
    y += 10;
  } else {
    gradPayments.forEach((p, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y - 3.5, 182, 6, 'F');
      }
      doc.setTextColor(...ink);
      doc.text(formatDate(p.date), 18, y);
      doc.text(p.receipt_number || 'REC-COMP', 55, y);
      doc.text(p.payment_method || 'efectivo', 110, y);
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(p.amount), 190, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      y += 6.5;
    });
  }

  y += 6;

  // Financial Summary Box
  doc.setFillColor(243, 232, 255);
  doc.setDrawColor(216, 180, 254);
  doc.roundedRect(14, y, 182, 28, 3, 3, 'FD');

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  doc.text(`Costo Total de Tarjetas Solicitadas:`, 20, y + 8);
  doc.setFont(undefined, 'bold');
  doc.text(formatCurrency(totalAmt), 190, y + 8, { align: 'right' });

  doc.setFont(undefined, 'normal');
  doc.text(`Total Abonado a la Fecha:`, 20, y + 15);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(formatCurrency(paidAmt), 190, y + 15, { align: 'right' });

  doc.setDrawColor(200, 190, 220);
  doc.line(20, y + 18, 190, y + 18);

  doc.setFontSize(9.5);
  doc.setFont(undefined, 'bold');
  if (balanceAmt > 0) {
    doc.setTextColor(180, 83, 9);
    doc.text(`SALDO PENDIENTE:`, 20, y + 24);
    doc.text(formatCurrency(balanceAmt), 190, y + 24, { align: 'right' });
  } else {
    doc.setTextColor(22, 101, 52);
    doc.text(`ESTADO DE CUENTA:`, 20, y + 24);
    doc.text(`¡AL DÍA / TOTALMENTE CANCELADO!`, 190, y + 24, { align: 'right' });
  }

  // Signature / Stamp section
  y += 38;
  doc.setDrawColor(180, 180, 180);
  doc.line(130, y, 190, y);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...muted);
  doc.text('Firma y Sello Administración', 160, y + 5, { align: 'center' });
  doc.text(quintaName, 160, y + 9, { align: 'center' });

  // Footer
  doc.setFillColor(...cream);
  doc.roundedRect(0, 282, 210, 15, 0, 0, 'F');
  doc.setTextColor(...muted);
  doc.setFontSize(8);
  doc.text(quintaPhone, 14, 290);
  doc.text(`Emitido el ${formatDate(new Date().toISOString())}`, 196, 290, { align: 'right' });

  const cleanName = (graduate?.name || 'egresado').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `comprobante_egresado_${cleanName}.pdf`;
  doc.save(fileName);
}
