import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from './pricing';

/**
 * Generates and downloads an official PDF Service Location Contract for Quinta La Juliana.
 * Dynamically renders only the contracted services and corresponding personnel affected.
 */
export async function generateContractPdf({ event, contractData = {}, servicesToShow = [], settings = {} }) {
  const doc = new jsPDF();

  const quintaName = settings?.quinta_name || 'Quinta La Juliana';
  const quintaPhone = settings?.quinta_phone || '3757418299';
  const ownerName = 'Daniel Oscar Lascurain';
  const ownerDni = '21.302.850';
  const repName = 'Almada César Javier';
  const repDni = '27.032.104';

  // Contract data inputs with smart defaults
  const contractDateStr = contractData.contract_date
    ? formatDate(contractData.contract_date)
    : formatDate(new Date().toISOString());

  const clientName = contractData.client_name || event?.client_name || '_______________';
  const clientDni = contractData.client_dni || '_______________';
  const clientAddress = contractData.client_address || '_______________';
  const clientPhone = contractData.client_phone || event?.client_phone || '_______________';

  const eventDateStr = contractData.event_date
    ? formatDate(contractData.event_date)
    : formatDate(event?.start_date || new Date().toISOString());

  const startTime = contractData.start_time || '21:00 hs';
  const endTime = contractData.end_time || '04:30 hs del día siguiente';
  const guestsCount = contractData.guests_count || event?.guests_count || 60;
  const dinersCount = contractData.diners_count || event?.diners_count || guestsCount;
  const depositAmt = Number(contractData.deposit_amount) || 0;
  const installmentsText = contractData.installments_info || 'según el presupuesto convenido';

  // Colors
  const violetDark = [91, 33, 182];    // violet-800
  const cream = [245, 240, 232];
  const ink = [40, 40, 40];
  const muted = [110, 110, 110];

  // ===== PAGE 1 =====
  // Header Banner Vector
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setFillColor(201, 160, 78); // Gold bar
  doc.rect(0, 29, 210, 1.5, 'F');

  doc.setTextColor(230, 197, 122);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('QUINTA LA JULIANA', 14, 13);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.text('EVENTOS Y HOSPEDAJE  ·  CONTRATO DE LOCACIÓN DE SERVICIOS', 14, 21);

  let y = 38;

  // Title Box
  doc.setFillColor(...cream);
  doc.roundedRect(14, y, 182, 14, 2, 2, 'F');
  doc.setTextColor(...violetDark);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('CONTRATO DE LOCACIÓN DE SERVICIOS', 105, y + 9, { align: 'center' });
  y += 18;

  // Date Right Aligned
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  doc.text(`Posadas, Misiones, ${contractDateStr}.`, 196, y, { align: 'right' });
  y += 7;

  // Párrafo Inicial Partes Intervinientes
  const p1 = `En la Ciudad de Posadas, se celebra el presente Contrato de Locación de Servicios, en representación del evento a realizarse, el/la Sra. ${clientName}, DNI Nro ${clientDni}, con domicilio en ${clientAddress}, Teléfono ${clientPhone}; y en representación de Quinta La Juliana el Sr. ${ownerName}, DNI Nro ${ownerDni}, Nro de Teléfono: ${quintaPhone}, quien se compromete para el día ${eventDateStr} en primer término a entregar el predio en condiciones limpias y en óptimas condiciones. En segundo término, Quinta La Juliana se compromete a otorgar el siguiente servicio detallado a continuación:`;

  const p1Lines = doc.splitTextToSize(p1, 182);
  doc.setFontSize(9);
  doc.text(p1Lines, 14, y);
  y += p1Lines.length * 4.5 + 6;

  // Section Title: SEGÚN PRESUPUESTO ADJUNTO
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('SEGÚN PRESUPUESTO ADJUNTO AL CONTRATO', 14, y);
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.5, 110, y + 1.5);
  y += 7;

  // DYNAMIC CONTRACTED SERVICES CHECKLIST
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);

  const contractedList = (servicesToShow && servicesToShow.length > 0)
    ? servicesToShow
    : (event?.selected_services && event.selected_services.length > 0)
      ? event.selected_services
      : [];

  if (contractedList.length > 0) {
    contractedList.forEach((s) => {
      let subDetails = '';
      if (Array.isArray(s.selected_sub_options) && s.selected_sub_options.length > 0) {
        subDetails = s.selected_sub_options.join(', ');
      } else if (s.sub_option_counts && Object.keys(s.sub_option_counts).length > 0) {
        subDetails = Object.entries(s.sub_option_counts)
          .filter(([_, count]) => Number(count) > 0)
          .map(([name, count]) => `${count} pers. ${name}`)
          .join(' · ');
      }

      const serviceTitle = s.service_name || s.name || 'Servicio Contratado';
      const labelText = subDetails ? `${serviceTitle} (${subDetails})` : serviceTitle;
      const lines = doc.splitTextToSize(`• ${labelText}:`, 150);
      doc.text(lines, 18, y);
      doc.setFont(undefined, 'bold');
      doc.text('– SI –', 190, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      y += lines.length * 4.5 + 1.5;
    });
  } else {
    // Default fallback services if none registered yet
    const defaultServices = [
      'Baños con insumos',
      'Salón Vip, Sector Pista, Salón Principal',
      'Servicio de Parrilleros',
      'Sonido y Luces',
      'Vajillas, Mobiliario y Mantelería Completas',
      'Servicio de Catering',
    ];
    defaultServices.forEach((name) => {
      doc.text(`• ${name}:`, 18, y);
      doc.setFont(undefined, 'bold');
      doc.text('– SI –', 190, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      y += 5.5;
    });
  }
  y += 4;

  // DYNAMIC PERSONAL AFECTADO (Strictly derived from contracted services tildados)
  const staffList = [];

  const hasService = (keyword) => {
    const kw = keyword.toLowerCase();
    return contractedList.some((s) => {
      const name = (s.service_name || s.name || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      return name.includes(kw) || cat.includes(kw);
    });
  };

  if (hasService('limpieza')) {
    staffList.push('Personal de Limpieza: SI');
  }
  if (hasService('dj') || hasService('sonido') || hasService('luces') || hasService('musica')) {
    staffList.push('DJ / Operador de Sonido: SI');
  }
  if (hasService('decorac') || hasService('ambientac')) {
    staffList.push('Personal de Decoración: SI');
  }
  if (hasService('parrilla') || hasService('parrillero')) {
    staffList.push('Servicio de Parrilleros: SI');
  }
  if (hasService('catering') || hasService('comida') || hasService('gastronom') || hasService('menu') || hasService('galeto')) {
    staffList.push('Cheff y Personal de Cocina: SI');
    staffList.push('Mozos: SI (Según cantidad de comensales)');
  }
  if (hasService('mozo') && !staffList.some((s) => s.includes('Mozos'))) {
    staffList.push('Mozos: SI');
  }
  if (hasService('torta') || hasService('dulce') || hasService('postre')) {
    staffList.push('Personal de Torta y Mesa de Dulces: SI');
  }
  if (hasService('coordin') || hasService('recep') || hasService('responsable')) {
    staffList.push('Coordinador / Responsable del Evento: SI');
  }

  // Only render PERSONAL AFECTADO block if matching staff services are contracted!
  if (staffList.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...violetDark);
    doc.text('PERSONAL AFECTADO AL EVENTO:', 14, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...ink);

    staffList.forEach((st) => {
      doc.text(`• ${st}`, 18, y);
      y += 4.5;
    });
    y += 6;
  }

  // ===== PAGE 2 =====
  doc.addPage();
  y = 20;

  // Page 2 Header Bar
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setTextColor(230, 197, 122);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(`QUINTA LA JULIANA  ·  CONTRATO DE LOCACIÓN DE SERVICIOS (${clientName})`, 14, 10);
  y = 26;

  // Legal Clauses Section
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('CLÁUSULAS Y CONDICIONES GENERALES DEL SERVICIO', 14, y);
  doc.setDrawColor(124, 58, 237);
  doc.line(14, y + 1.5, 135, y + 1.5);
  y += 8;

  const clauses = [
    `1. Nivel de Sonido: El sonido deberá regirse acorde a la Ordenanza Municipal, no debiendo superar los 75 Decibeles, a tal efecto el encargado del salón realiza constantemente las mediciones pertinentes, debiendo el contratante acatar las indicaciones.-`,
    `2. Horario del Evento: El Evento se desarrollará entre las ${startTime} del día ${eventDateStr} hasta las ${endTime}.-`,
    `3. Invitados y Comensales: Se establece una Cantidad de ${guestsCount} Invitados y ${dinersCount} Comensales que formarán parte de la CENA.-`,
    `4. Política de Menores y Pases Especiales: Menores de 5 años no pagan. Menores de 12 años abonan el 50%. Personas acreditadas con Certificado Único de Discapacidad (CUD) no pagan.-`,
    `5. Reserva y Pago: El servicio se seña en este acto con ${depositAmt > 0 ? formatCurrency(depositAmt) : 'el monto convenido'} y se conviene el saldo según el presupuesto del Locatario, debiendo estar cancelado el total del presupuesto antes de la realización del Evento.-`,
    `6. Plan de Pago Convenido: Los intervinientes convienen en conformar el pago del Evento en: ${installmentsText}.-`,
    `7. Impuestos y Coberturas Musicales: En concepto de Impuestos, el cliente deberá abonar los importes correspondientes a SADAIC y AADI-CAPIF y Policías Adicionales según requieran el día de la fecha dichas instituciones en forma anticipada.-`,
    `8. Responsabilidad de Pileta: Quinta La Juliana informa: Que la pileta representa un riesgo en caso de que niños de corta edad corran, jueguen o salten a su alrededor. Es responsabilidad de sus padres el cuidado. En caso de que los organizadores del evento requieran de un cuidado especial, el costo del mismo deberá ser abonado.-`,
    `9. Elementos Prohibidos: Se encuentra totalmente prohibido el uso de serpentinas en aerosol, debido a que dañan el mobiliario y las instalaciones del predio. A tal efecto se sugiere la utilización de espumas en aerosol no tóxicas.-`,
    `10. Confirmación de Menú: EL LOCATARIO se compromete a validar el menú final del evento una semana antes de que el mismo se deba llevar a cabo.-`,
    `11. Rescisión de Contrato: En el caso de que El Locatario decida rescindir el presente Contrato, en todas o alguna de sus partes, se deducirá el 20% del total abonado en concepto de indemnización.-`,
    `12. Trámites Administrativos: Para todos los trámites administrativos pertinentes a la realización del Evento de referencia, se autoriza a que los mismos sean efectuados por el Sr. ${repName}, DNI Nro ${repDni}.-`,
    `13. Derecho de Permanencia: El Locador se reserva el derecho de permanencia frente a un eventual conflicto que ponga en peligro la integridad física de los invitados al evento, como así también al personal del mismo, o corran riesgo las instalaciones del predio.-`,
    `14. Jurisdicción: Para todos los efectos de este contrato, las partes se someten a la jurisdicción de los tribunales ordinarios de la Ciudad de Posadas, Capital de la Provincia de Misiones, renunciando a cualquier otro fuero.-`,
  ];

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);

  clauses.forEach((cl) => {
    const lines = doc.splitTextToSize(cl, 182);
    if (y + lines.length * 4 > 240) {
      doc.addPage();
      y = 20;
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(230, 197, 122);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`QUINTA LA JULIANA  ·  CONTRATO DE LOCACIÓN DE SERVICIOS (${clientName})`, 14, 10);
      y = 26;
      doc.setFontSize(8.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...ink);
    }
    doc.text(lines, 14, y);
    y += lines.length * 4 + 3;
  });

  y += 4;

  // Closing sentence
  const closingText = `De conformidad, previa lectura y ratificación, se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, en la ciudad de Posadas, Capital de la Provincia de Misiones, a los ${contractDateStr}.`;
  const closingLines = doc.splitTextToSize(closingText, 182);
  doc.setFont(undefined, 'bold');
  doc.text(closingLines, 14, y);
  y += closingLines.length * 4.5 + 18;

  // Signatures Section
  if (y > 235) {
    doc.addPage();
    y = 30;
  }

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setDrawColor(150, 150, 150);

  // Left Signature: LOCATARIO
  doc.line(20, y, 85, y);
  doc.text('LOCATARIO (CLIENTE)', 52.5, y + 5, { align: 'center' });
  doc.setFont(undefined, 'bold');
  doc.text(clientName, 52.5, y + 10, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.text(`DNI: ${clientDni}`, 52.5, y + 14, { align: 'center' });

  // Right Signature: LOCADOR (Daniel Oscar Lascurain)
  doc.line(125, y, 190, y);
  doc.text('LOCADOR (QUINTA LA JULIANA)', 157.5, y + 5, { align: 'center' });
  doc.setFont(undefined, 'bold');
  doc.text(`LASCURAIN DANIEL OSCAR`, 157.5, y + 10, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.text(`DNI ${ownerDni}`, 157.5, y + 14, { align: 'center' });

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...cream);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setTextColor(...muted);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`${quintaName}  ·  Contacto: ${quintaPhone}`, 14, 290);
    doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: 'right' });
  }

  const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `contrato_locacion_${cleanName}.pdf`;
  doc.save(fileName);
}
