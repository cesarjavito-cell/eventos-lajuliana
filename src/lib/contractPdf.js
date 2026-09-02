import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from './pricing';
import { DANIEL_LASCURAIN_SIGNATURE } from './signature';

function formatSpanishWords(amount) {
  const n = Number(amount) || 0;
  if (n === 170000) return 'Pesos Ciento Setenta Mil';
  if (n === 60000) return 'Pesos Sesenta Mil';
  if (n === 30000) return 'Pesos Treinta Mil';
  if (n === 204000) return 'Pesos Doscientos Cuatro Mil';
  if (n === 200000) return 'Pesos Doscientos Mil';
  return `Pesos ${n.toLocaleString('es-AR')}`;
}

/**
 * Generates and downloads an official PDF Service Location Contract for Quinta La Juliana.
 * Supports both General Events (3 pages) and Egresados Events (5 pages with Parents Group & After Hours).
 */
export async function generateContractPdf({ event, contractData = {}, servicesToShow = [], settings = {} }) {
  const isEgresados = event?.type === 'egresados' || contractData.is_egresados;

  if (isEgresados) {
    return generateEgresadosContractPdf({ event, contractData, servicesToShow, settings });
  }

  return generateGeneralContractPdf({ event, contractData, servicesToShow, settings });
}

/**
 * 📜 CONTRATO GENERAL (Eventos Sociales / Bodas / 15 años)
 */
async function generateGeneralContractPdf({ event, contractData = {}, servicesToShow = [], settings = {} }) {
  const doc = new jsPDF();

  const quintaName = settings?.quinta_name || 'Quinta La Juliana';
  const quintaPhone = settings?.quinta_phone || '3757418299';
  const ownerName = 'Daniel Oscar Lascurain';
  const ownerDni = '21.302.850';
  const repName = 'Almada César Javier';
  const repDni = '27.032.104';

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

  const violetDark = [91, 33, 182];
  const cream = [245, 240, 232];
  const ink = [40, 40, 40];
  const muted = [110, 110, 110];

  // PAGE 1
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setFillColor(201, 160, 78);
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

  doc.setFillColor(...cream);
  doc.roundedRect(14, y, 182, 14, 2, 2, 'F');
  doc.setTextColor(...violetDark);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('CONTRATO DE LOCACIÓN DE SERVICIOS', 105, y + 9, { align: 'center' });
  y += 18;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  doc.text(`Posadas, Misiones, ${contractDateStr}.`, 196, y, { align: 'right' });
  y += 7;

  const p1 = `En la Ciudad de Posadas, se celebra el presente Contrato de Locación de Servicios, en representación del evento a realizarse, el/la Sra. ${clientName}, DNI Nro ${clientDni}, con domicilio en ${clientAddress}, Teléfono ${clientPhone}; y en representación de Quinta La Juliana el Sr. ${ownerName}, DNI Nro ${ownerDni}, Nro de Teléfono: ${quintaPhone}, quien se compromete para el día ${eventDateStr} en primer término a entregar el predio en condiciones limpias y en óptimas condiciones. En segundo término, Quinta La Juliana se compromete a otorgar el siguiente servicio detallado a continuación:`;

  const p1Lines = doc.splitTextToSize(p1, 182);
  doc.setFontSize(9);
  doc.text(p1Lines, 14, y);
  y += p1Lines.length * 4.5 + 6;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('SEGÚN PRESUPUESTO ADJUNTO AL CONTRATO', 14, y);
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.5, 110, y + 1.5);
  y += 7;

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

  const staffList = [];
  const hasService = (kw) => contractedList.some((s) => (s.service_name || s.name || '').toLowerCase().includes(kw));

  if (hasService('limpieza')) staffList.push('Personal de Limpieza: SI');
  if (hasService('dj') || hasService('sonido') || hasService('luces')) staffList.push('DJ / Operador de Sonido: SI');
  if (hasService('decorac')) staffList.push('Personal de Decoración: SI');
  if (hasService('parrilla')) staffList.push('Servicio de Parrilleros: SI');
  if (hasService('catering') || hasService('comida')) {
    staffList.push('Cheff y Personal de Cocina: SI');
    staffList.push('Mozos: SI (Según cantidad de comensales)');
  }
  if (hasService('torta') || hasService('dulce')) staffList.push('Personal de Torta y Mesa de Dulces: SI');

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

  // PAGE 2
  doc.addPage();
  y = 20;

  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setTextColor(230, 197, 122);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(`QUINTA LA JULIANA  ·  CONTRATO DE LOCACIÓN DE SERVICIOS (${clientName})`, 14, 10);
  y = 26;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('CLÁUSULAS Y CONDICIONES GENERALES DEL SERVICIO', 14, y);
  doc.setDrawColor(124, 58, 237);
  doc.line(14, y + 1.5, 135, y + 1.5);
  y += 8;

  const clauses = [
    `1. Nivel de Sonido: El sonido deberá regirse acorde a la Ordenanza Municipal, no debiendo superar los 75 Decibeles.-`,
    `2. Horario del Evento: El Evento se desarrollará entre las ${startTime} del día ${eventDateStr} hasta las ${endTime}.-`,
    `3. Invitados y Comensales: Se establece una Cantidad de ${guestsCount} Invitados y ${dinersCount} Comensales.-`,
    `4. Política de Menores: Menores de 5 años no pagan. Menores de 12 años abonan el 50%. CUD no pagan.-`,
    `5. Reserva y Pago: El servicio se seña en este acto con ${depositAmt > 0 ? formatCurrency(depositAmt) : 'el monto convenido'}.-`,
    `6. Plan de Pago Convenido: ${installmentsText}.-`,
    `7. Impuestos: SADAIC, AADI-CAPIF y Policías Adicionales en forma anticipada.-`,
    `8. Responsabilidad de Pileta: Es responsabilidad de los padres el cuidado de los niños.-`,
    `9. Elementos Prohibidos: Prohibido uso de serpentinas en aerosol.-`,
    `10. Confirmación de Menú: EL LOCATARIO se compromete a validar el menú 1 semana antes.-`,
    `11. Rescisión: Se deducirá el 20% del total abonado en concepto de indemnización.-`,
    `12. Trámites Administrativos: Autorizado el Sr. ${repName}, DNI Nro ${repDni}.-`,
    `13. Derecho de Permanencia: El Locador se reserva el derecho de permanencia frente a conflictos.-`,
    `14. Jurisdicción: Tribunales ordinarios de la Ciudad of Posadas, Misiones.-`,
  ];

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);

  clauses.forEach((cl) => {
    const lines = doc.splitTextToSize(cl, 182);
    if (y + lines.length * 4 > 240) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, 14, y);
    y += lines.length * 4 + 3;
  });

  y += 10;

  const closingText = `De conformidad, previa lectura y ratificación, se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, en la ciudad de Posadas, Capital de la Provincia de Misiones, a los ${contractDateStr}.`;
  const closingLines = doc.splitTextToSize(closingText, 182);
  doc.setFont(undefined, 'bold');
  doc.text(closingLines, 14, y);
  y += closingLines.length * 4.5 + 24;

  if (y > 230) {
    doc.addPage();
    y = 35;
  }

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setDrawColor(150, 150, 150);

  doc.line(20, y, 85, y);
  doc.text('LOCATARIO (CLIENTE)', 52.5, y + 5, { align: 'center' });
  doc.setFont(undefined, 'bold');
  doc.text(clientName, 52.5, y + 10, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.text(`DNI: ${clientDni}`, 52.5, y + 14, { align: 'center' });

  if (DANIEL_LASCURAIN_SIGNATURE) {
    try {
      doc.addImage(DANIEL_LASCURAIN_SIGNATURE, 'PNG', 132, y - 18, 52, 17);
    } catch (e) {
      console.warn(e);
    }
  }

  doc.line(125, y, 190, y);
  doc.text('LOCADOR (QUINTA LA JULIANA)', 157.5, y + 5, { align: 'center' });
  doc.setFont(undefined, 'bold');
  doc.text(`LASCURAIN DANIEL OSCAR`, 157.5, y + 10, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.text(`DNI ${ownerDni}`, 157.5, y + 14, { align: 'center' });

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
  doc.save(`contrato_locacion_${cleanName}.pdf`);
}

/**
 * 🎓 CONTRATO DE EGRESADOS (5 Páginas Oficiales con Grupo de Padres, After Hours y Anexo)
 */
async function generateEgresadosContractPdf({ event, contractData = {}, servicesToShow = [], settings = {} }) {
  const doc = new jsPDF();

  const ownerName = 'DANIEL OSCAR LASCURAIN';
  const ownerDni = '21.302.650';

  const schoolName = contractData.school_name || event?.title || 'E.P.E.T. N° 1 – Informática';

  const contractDateStr = contractData.contract_date
    ? formatDate(contractData.contract_date)
    : formatDate(new Date().toISOString());

  const eventDate = contractData.event_date
    ? new Date(contractData.event_date)
    : event?.start_date
      ? new Date(event.start_date)
      : new Date();

  const eventDateStr = formatDate(eventDate.toISOString());

  // Dates math
  const cutoffDate = contractData.cutoff_date
    ? new Date(contractData.cutoff_date)
    : new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoffDateStr = formatDate(cutoffDate.toISOString());

  const salesCloseDate = contractData.ticket_sales_close_date
    ? new Date(contractData.ticket_sales_close_date)
    : new Date(eventDate.getTime() - 8 * 24 * 60 * 60 * 1000);
  const salesCloseDateStr = formatDate(salesCloseDate.toISOString());

  const afterDate = contractData.after_date
    ? new Date(contractData.after_date)
    : new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
  const afterDateStr = formatDate(afterDate.toISOString());

  const cardValue = Number(contractData.card_value) || Number(event?.card_value) || 170000;
  const afterCardValue = Number(contractData.after_card_value) || 60000;
  const cardValueWords = formatSpanishWords(cardValue);
  const afterCardValueWords = formatSpanishWords(afterCardValue);
  const surchargedCardValue = Math.round(cardValue * 1.20);
  const surchargeAmt = Math.round(cardValue * 0.20);

  const depositAmount = Number(contractData.deposit_amount) || 30000;
  const advanceCardsCount = Number(contractData.advance_cards_count) || 6;

  const startTime = contractData.start_time || '20:30';
  const endTime = contractData.end_time || '04:30';
  const afterStartTime = contractData.after_start_time || '06:00';
  const afterEndTime = contractData.after_end_time || '13:00';

  const cateringMenuText = contractData.catering_menu_text ||
    'Menú 3: ASADO\nMENU: Entrada (Sand. Miga, Empanadas varias, Canastitas Españolas, Brusquetas, Pizzas)\nCarne Vacuna, Carne de Pollo, Chorizo y Morcilla\n4 variedades de ensaladas.';

  const violetDark = [91, 33, 182];
  const ink = [40, 40, 40];
  const cream = [245, 240, 232];
  const muted = [110, 110, 110];

  // ===== PAGE 1 =====
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CONTRATO', 105, 25, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  doc.text(`Posadas, Misiones, ${contractDateStr}`, 196, 35, { align: 'right' });

  let y = 45;

  const headerP = `CONTRATO DE PRESTACION DE SERVICIOS DE EVENTOS SOCIALES QUE CELEBRAN POR UNA PARTE QUINTA LA JULIANA, REPRESENTADA LEGALMENTE POR DANIEL OSCAR LASCURAIN DNI Nº ${ownerDni} A QUIEN EN LO SUCESIVO SE LE DENOMINARA “EL LOCADOR” Y POR LA OTRA PARTE DEL GRUPO DE PADRES DE LA ${schoolName.toUpperCase()}, QUIEN EN LO SUCESIVO SE LE DENOMINARA “EL LOCATARIO” AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLAUSULAS.-`;

  const headerLines = doc.splitTextToSize(headerP, 182);
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.text(headerLines, 14, y);
  y += headerLines.length * 4.5 + 6;

  // 1.- Declara "El LOCADOR"
  doc.setFont(undefined, 'bold');
  doc.text('1.- Declara “El LOCADOR”', 14, y);
  y += 5;

  const declA = `A.- Ser argentino por nacimiento, mayor de edad, con domicilio fiscal en Calle 169 y Ruta 12 de la ciudad de Posadas, capital de la provincia de Misiones.`;
  const declALines = doc.splitTextToSize(declA, 182);
  doc.setFont(undefined, 'normal');
  doc.text(declALines, 14, y);
  y += declALines.length * 4.5 + 3;

  const declB = `B.- Ser apoderado del propietario y tener dominio sobre el inmueble objeto de este documento, el cual se encuentra ubicado en Calle 169 y Ruta 12, cuyo predio reúne todas las condiciones de higiene y salubridad, teniendo los servicios de agua, luz y drenaje, teniendo el uso de dicho predio para centro recreativo como: fiestas infantiles, bodas, quinceañeras, graduaciones, eventos especiales, dentro y fuera de dicho predio, teniendo el permiso correspondiente de uso de suelo, expedido por la Municipalidad de Posadas, quedando obligado el arrendatario a no usarla en cualquier otro modo o finalidad.`;
  const declBLines = doc.splitTextToSize(declB, 182);
  doc.text(declBLines, 14, y);
  y += declBLines.length * 4.5 + 3;

  const subItems = [
    `a) Que cuenta con la capacidad, la infraestructura, servicios y recursos necesarios para dar cabal cumplimiento a las obligaciones que por virtud del presente contrato adquiere.`,
    `b) Tener facultades para comparecer como representante común de la propiedad, como copropietarios del inmueble señalado en el inciso anterior.`,
    `c) Que dicho inmueble cuenta con las siguientes instalaciones: cocina habilitada con personal capacitado y debido carnet sanitario, manipulación de alimentos y bebidas.-`,
  ];

  subItems.forEach((si) => {
    const lines = doc.splitTextToSize(si, 180);
    doc.text(lines, 16, y);
    y += lines.length * 4.5 + 2;
  });

  y += 6;

  // CLAUSULAS
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('CLAUSULAS', 105, y, { align: 'center' });
  y += 8;

  // PRIMERA
  const cl1 = `PRIMERA.- El objeto del presente contrato es la prestación de servicios para la organización de un evento social para Egresados de ${schoolName} y sus acompañantes, el cual se llevará a cabo el día ${eventDateStr} y tendrá una duración de 8 horas de acuerdo a las características y especificaciones del anexo de este contrato, el cual forma parte integral del presente. El costo por tarjeta está previsto en ${formatCurrency(cardValue)} (${cardValueWords}) y se mantendrá fijo hasta el día ${cutoffDateStr}. Luego de esa fecha el costo de las tarjetas tendrá un incremento del 20% sobre el valor original de la misma. Aclarando que este incremento será de ${formatCurrency(surchargeAmt)} más agregado al valor original (alcanzando un total de ${formatCurrency(surchargedCardValue)}). Este concepto se debe a fin de poder tener una idea más acabada sobre la cantidad de comensales a la fiesta, ya que se deben prever la contratación del personal y los diferentes insumos para la perfecta realización de la Fiesta.-`;

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  const cl1Lines = doc.splitTextToSize(cl1, 182);
  doc.text(cl1Lines, 14, y);
  y += cl1Lines.length * 4.5 + 4;

  // SEGUNDA
  const cl2 = `SEGUNDA.- El evento social iniciará a las ${startTime} horas y terminará a las ${endTime} hs. dentro de la duración del evento no se cuenta el tiempo necesario que “El LOCADOR” requiera para la organización del mismo.`;
  const cl2Lines = doc.splitTextToSize(cl2, 182);
  doc.text(cl2Lines, 14, y);

  // ===== PAGE 2 =====
  doc.addPage();
  y = 22;

function numberToSpanishWordSmall(num) {
  const words = {
    1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
    6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
    12: 'doce', 15: 'quince', 20: 'veinte'
  };
  return words[num] || `${num}`;
}

  // TERCERA
  const advanceWord = numberToSpanishWordSmall(advanceCardsCount);
  const cl3 = `TERCERA.- El costo total que “EL LOCATARIO” debe solventar por la prestación del servicio es el estipulado para 50 personas, en caso de no cumplimentar con esta cláusula el Locador tendrá el derecho de suspender el evento o realizarla en espacios más pequeños (Salón VIP, para menor cantidad de personas). En caso que el evento no se desarrolle les será devuelto el dinero que hasta el momento el locatario haya abonado, Dicho costo será cubierto por “EL LOCATARIO” en dinero en efectivo o virtual, en moneda nacional y en la forma siguiente:
a) A la firma del presente contrato, por concepto de anticipo, la suma PARCIAL de las ${advanceCardsCount} (${advanceWord}) tarjetas de egresados.-
b) El monto restante se ajustará a la venta de tarjetas y deberá cancelarse hasta 10 días antes del evento.
“EL LOCATARIO” se obliga a depositar la suma de ${formatCurrency(depositAmount)} pesos (antes del inicio del evento), para garantizar el pago de los servicios excedentes, imprevistos daños o perjuicios en su caso. Dicho depósito será devuelto al cliente si al finalizar el evento no se verificó ninguno de esos supuestos (OPCIONAL).-
Independientemente de la entrega o no de anticipo “EL LOCADOR” deberá entregar al “LOCATARIO” el recibo o comprobante que ampare el pago de los servicios contratados, en la que hará constar detalladamente el nombre y el precio de cada uno de los servicios proporcionados, esto con la finalidad de que el consumidor pueda verificar en detalle.`;

  const cl3Lines = doc.splitTextToSize(cl3, 182);
  doc.text(cl3Lines, 14, y);
  y += cl3Lines.length * 4.5 + 4;

  // CUARTA
  const cl4Head = `CUARTA.- A efecto de tener seguridad en cuanto al número de asistentes al evento social el consumidor y el prestador del servicio establecen como procedimiento de control y verificación, el siguiente:
a) El “LOCATARIO” y “El LOCADOR” están de acuerdo en que un personal desempeñe la función de venta y contralor de tarjetas a efectos de que sólo ingresen al lugar personas que cuenten con las mismas.`;
  const cl4HeadLines = doc.splitTextToSize(cl4Head, 182);
  doc.text(cl4HeadLines, 14, y);
  y += cl4HeadLines.length * 4.5 + 3;

  doc.setFont(undefined, 'bold');
  doc.text('❖ Menores de 5 cinco años no pagan.', 18, y); y += 4.5;
  doc.text('❖ Menores de 6 a 12 años abonan la mitad del valor de una tarjeta.-', 18, y); y += 4.5;
  doc.text('❖ Discapacitados no pagan (acreditados con CUD).', 18, y); y += 6;

  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text(`PRECIO DE TARJETA CENA POR PERSONA: ${formatCurrency(cardValue)} (${cardValueWords})`, 14, y); y += 5;
  doc.text(`PRECIO DE TARJETA DESPUES DE LA CENA: ${formatCurrency(afterCardValue)} (${afterCardValueWords})`, 14, y); y += 4.5;
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  doc.text('No se permitirá el ingreso de menores de 18 años, salvo caso que estén acompañados por uno/s de sus tutores.', 14, y); y += 5;
  doc.setFont(undefined, 'bold');
  doc.text(`CIERRE DE VENTA DE TARJETAS: ${salesCloseDateStr}.-`, 14, y); y += 7;

  // QUINTA
  const cl5 = `QUINTA.- EL LOCATARIO cuenta con un plazo de 5 días hábiles posteriores a la firma del presente contrato para cancelar la operación sin responsabilidad alguna de su parte, en cuyo caso “EL LOCADOR” se obliga a reintegrar todas las cantidades que “EL LOCATARIO” le haya entregado, pasados los cinco días hábiles lo anterior no será aplicable.`;
  const cl5Lines = doc.splitTextToSize(cl5, 182);
  doc.setFont(undefined, 'normal');
  doc.text(cl5Lines, 14, y);
  y += cl5Lines.length * 4.5 + 4;

  // SEXTA
  const cl6 = `SEXTA.- “EL LOCATARIO” se obliga a designar a una persona de su confianza, quien durante el evento será quien trate los asuntos relacionados con la presentación del servicio, asimismo se obliga a abstenerse de dar instrucciones al personal del LOCADOR que no tenga relación con el objeto del presente y procurar que sus invitados observen la misma conducta. Por su parte “El LOCADOR” se obliga a designar, de entre su personal, a una persona que será quien durante la celebración del evento trate con el representante del “LOCATARIO” o con el mismo, los asuntos relacionados con la prestación del servicio, y se obliga a que su personal atienda con esmero y cortesía a los asistentes del evento.`;
  const cl6Lines = doc.splitTextToSize(cl6, 182);
  doc.text(cl6Lines, 14, y);

  // ===== PAGE 3 =====
  doc.addPage();
  y = 22;

  const clauses3 = [
    `SEPTIMA.- En su caso “EL LOCATARIO” se obliga a cumplir con las disposiciones reglamentarias que rijan el inmueble y a procurar que los asistentes al evento observen la misma conducta.-`,
    `OCTAVA.- En el caso de rescisión del contrato se deducirá el 30% del precio total, y la devolución se realizará una vez finalizada la venta de Tarjetas y por el 70% de lo abonado por el Locatario.-`,
    `a) En caso de ser “EL LOCADOR” quien incurra en incumplimiento del presente contrato este se obliga a devolver todas las cantidades entregadas por “EL LOCATARIO”, más la pena convencional correspondiente de acuerdo al momento del incumplimiento antes señalado.-`,
    `NOVENA.- “EL LOCADOR” no cuenta con resguardo de objetos personales, por lo que no se hace responsable de la pérdida, menoscabo o daño de los objetos personales del cliente o de sus invitados.`,
    `DECIMA.- Si los bienes designados a la prestación del servicio sufrieren un menoscabo por culpa o negligencia debidamente comprobada del “LOCATARIO” o sus invitados, éste se obliga a cubrir los gastos de reparación de los mismos o en su caso indemnizar al prestador del servicio hasta con un 100% de su valor, utilizando para ello el depósito de ${formatCurrency(depositAmount)} detallado en la Cláusula Tercera más el importe hasta cubrir el total del costo del daño incurrido.-`,
    `• En Concepto impuestos, suma correspondiente a AADICAPIF Y SADAYC (si correspondiera) como así también los dos personales policiales, están incluidos dentro del presupuesto acordado.`,
    `• Se encuentra totalmente prohibido el uso de serpentinas en aerosol y papel picado, debido a que dañan el mobiliario y las instalaciones del predio, a tal efecto se sugiere la utilización de espuma en aerosol no tóxica.-`,
    `• La reserva quedará efectiva una vez que el cliente abone el costo de seña de ${advanceCardsCount} tarjetas del evento que se realizará el día ${eventDateStr}, en caso contrario queda a criterio de EL LOCADOR, el uso de dicha fecha para otro cliente si así lo requiera.-`,
    `DECIMA PRIMERA.- Las partes podrán acordar que “EL LOCATARIO” contrate libremente los servicios específicos relacionados con el evento social con otros prestadores de servicios por así convenir a sus intereses.-`,
    `DECIMA SEGUNDA.- En caso de que “EL LOCADOR” se encuentre imposibilitado para prestar el servicio por caso fortuito o fuerza mayor, como incendio u otros acontecimientos ajenos a la voluntad, no se incurrirá en incumplimiento.-`,
    `DECIMOTERCERA.- Para la interpretación y cumplimiento del presente contrato las partes se someten a la competencia de los tribunales ordinarios de la Primera Circunscripción Judicial de la Ciudad de Posadas, Misiones, renunciando al fuero federal y/o cualquier otro que pudiera corresponderles.-`,
  ];

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);

  clauses3.forEach((cl) => {
    const lines = doc.splitTextToSize(cl, 182);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 3;
  });

  y += 4;
  const closingEgresados = `De conformidad, previa lectura y ratificación se firman dos (2) ejemplares para cada una de las partes intervinientes de un mismo tenor y a un solo efecto, en la Ciudad de Posadas, Capital de la Provincia de Misiones, a los ${contractDateStr}.`;
  const closingEgresadosLines = doc.splitTextToSize(closingEgresados, 182);
  doc.setFont(undefined, 'bold');
  doc.text(closingEgresadosLines, 14, y);

  // ===== PAGE 4 (ANEXO I PRESTACIONES) =====
  doc.addPage();
  y = 22;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  doc.text('ANEXO I PRESTACIONES', 105, y, { align: 'center' });
  y += 8;

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);
  doc.text('El servicio con el cual EL LOCADOR se compromete a cumplir es el siguiente:', 14, y); y += 6;

  doc.text('• Copa de bienvenida / tragos con o sin alcohol.', 18, y); y += 5.5;

  doc.setFont(undefined, 'bold');
  doc.text('• CENA:', 18, y); y += 5;

  doc.setFont(undefined, 'normal');
  const menuLines = doc.splitTextToSize(cateringMenuText, 175);
  doc.text(menuLines, 22, y);
  y += menuLines.length * 4.5 + 4;

  doc.text('• POSTRE: bombón helado o mesa de dulces (tarta de frutas, mini choco torta, brownies, trufas, cheesecake).', 18, y); y += 5.5;
  doc.text('• TORTA: Simbólica para decoración y fotos + torta real.', 18, y); y += 5.5;
  doc.text('• BEBIDAS: Barra de tragos (Daiquiris Frutales con o sin alcohol), agua mineral, gaseosas, agua saborizada. Bebidas con alcohol autorizadas por la Municipalidad para mayores de 18 años.-', 18, y); y += 6;
  doc.text('• FINAL DE LA FIESTA: pernil con panes y salsas o Pizzas.-', 18, y); y += 5.5;
  doc.text('• DJ - SONIDO - Animador E Iluminación: para la entrada y presentación de los egresados (sonido acorde a normas municipales).-', 18, y); y += 6;
  doc.text('• MOZOS: Servicio de mozos y bartender acorde a la cantidad de comensales, con carnet sanitario y manipulación de alimentos.', 18, y); y += 6;
  doc.text('• VAJILLA Y MANTELERÍA: Manteles blancos – vajilla platos blancos – cubiertos – copas – hieleras – champagneras – platitos y cucharitas de postre.', 18, y); y += 6;
  doc.text('• MESA Y SILLAS: vestidas.-', 18, y); y += 5.5;
  doc.text('• DECORACION: Elección de 3 colores, ambientación mobiliario, telas, luces, livings, alfombra, sector fotos, mesa de egresados. No incluye souvenirs ni centros de mesa.', 18, y); y += 6;

  // ===== PAGE 5 (FOTOGRAFÍA, AFTER HOURS Y FIRMAS DE PADRES) =====
  doc.addPage();
  y = 22;

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...ink);

  doc.text('• FOTOGRAFÍA: Servicio de fotografía profesional durante el evento, entregado en digital 1 semana después.', 14, y); y += 5.5;
  doc.text('• Personal de Recepción ubicado en la entrada del salón para ubicación de mesas.-', 14, y); y += 5.5;
  doc.text('• Área Protegida: CELSO SALUD.', 14, y); y += 4.5;
  doc.text('• Seguro contra accidentes: LA SEGUNDA.', 14, y); y += 4.5;
  doc.text('• Todo esto a cargo de QUINTA LA JULIANA.', 14, y); y += 4.5;
  doc.text('• Personal de limpieza, al momento de la finalización del evento.', 14, y); y += 7;

  // PÁRRAFO DESTACADO DEL AFTER HOURS
  doc.setFillColor(245, 240, 232);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'F');
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...violetDark);
  const afterBoxText = `Quinta La Juliana cede el predio el día ${afterDateStr} a los fines de que exclusivamente los egresados realicen el after hours, en el horario de ${afterStartTime} a ${afterEndTime} hs. Los egresados podrán permanecer en La Quinta durante del horario de la finalización de la fiesta y hasta el comienzo del After Hours.- Otorgando comidas y bebidas sin alcohol.-`;
  const afterBoxLines = doc.splitTextToSize(afterBoxText, 175);
  doc.text(afterBoxLines, 18, y + 6);
  y += 28;

  // FIRMAS DE PADRES RESPONSABLES Y LOCADOR
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setDrawColor(150, 150, 150);

  // Left: Daniel Lascurain with signature graphic
  if (DANIEL_LASCURAIN_SIGNATURE) {
    try {
      doc.addImage(DANIEL_LASCURAIN_SIGNATURE, 'PNG', 18, y, 52, 17);
    } catch (e) {
      console.warn(e);
    }
  }

  doc.line(14, y + 18, 75, y + 18);
  doc.setFont(undefined, 'bold');
  doc.text('Daniel Lascurain', 14, y + 23);
  doc.setFont(undefined, 'normal');
  doc.text(`DNI ${ownerDni}`, 14, y + 27);
  doc.text('QUINTA LA JULIANA', 14, y + 31);

  // Right: Padre Responsable 1
  doc.line(125, y + 18, 190, y + 18);
  doc.text('PADRE RESPONSABLE', 157.5, y + 23, { align: 'center' });

  y += 42;

  // Row 2 of Parents Signatures
  doc.line(14, y + 18, 75, y + 18);
  doc.text('PADRE RESPONSABLE', 44.5, y + 23, { align: 'center' });

  doc.line(125, y + 18, 190, y + 18);
  doc.text('PADRE RESPONSABLE', 157.5, y + 23, { align: 'center' });

  y += 42;

  // Row 3 of Parents Signatures
  doc.line(14, y + 18, 75, y + 18);
  doc.text('PADRE RESPONSABLE', 44.5, y + 23, { align: 'center' });

  doc.line(125, y + 18, 190, y + 18);
  doc.text('PADRE RESPONSABLE', 157.5, y + 23, { align: 'center' });

  y += 42;

  // Row 4 of Parents Signatures (Centered)
  doc.line(70, y + 18, 140, y + 18);
  doc.text('PADRE RESPONSABLE', 105, y + 23, { align: 'center' });

  // Footers for all 5 pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...cream);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setTextColor(...muted);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Quinta La Juliana  ·  Contrato de Egresados  ·  ${schoolName}`, 14, 290);
    doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: 'right' });
  }

  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`contrato_egresados_${cleanSchool}.pdf`);
}
