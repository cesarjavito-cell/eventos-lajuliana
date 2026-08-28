// Price calculation and helpers for Quinta La Juliana

export function calculateServicePrice(service, numPeople, options = {}) {
  if (!service) return 0;
  const people = Math.max(0, numPeople || 0);
  const base = service.base_price || 0;

  switch (service.measurement_type) {
    case 'fixed':
      return base;
    case 'per_person':
      return base * people;
    case 'average_person': {
      const avg = Math.ceil(people * ((service.average_percentage || 100) / 100));
      return base * avg;
    }
    case 'tiered': {
      const threshold = service.tier_threshold || 0;
      if (people <= threshold) return base;
      const extra = people - threshold;
      return base + extra * (service.tier_price_after || 0);
    }
    case 'per_group': {
      const perUnit = service.people_per_unit || 1;
      const units = people > 0 ? Math.ceil(people / perUnit) : 0;
      return base * units;
    }
    case 'step_count': {
      const threshold = service.tier_threshold || 0;
      const count = people > 0 ? (people <= threshold ? 1 : 2) : 0;
      return base * count;
    }
    case 'per_hour': {
      const hours = options.hours || 0;
      return base * hours;
    }
    case 'torta': {
      const gramsPerPerson = service.grams_per_person || 0;
      const totalGrams = gramsPerPerson * people;
      const totalKg = totalGrams / 1000;
      const threshold = service.large_cake_threshold || 10;
      if (totalKg <= 0) return 0;
      if (totalKg >= threshold) {
        return Math.ceil(totalKg * (service.per_kg_price || 0));
      }
      return Math.ceil(totalKg * (service.small_cake_per_kg_price || 0)) + (service.maqueta_price || 0);
    }
    case 'sub_option': {
      const selected = options.selectedSubOptions || [];
      if (!selected.length) return 0;
      const pricing = service.sub_option_pricing || 'fixed';
      let total = 0;
      selected.forEach((name) => {
        const opt = (service.sub_options || []).find((o) => o.name === name);
        if (opt) {
          if (pricing === 'per_person') {
            total += (opt.price || 0) * people;
          } else {
            total += opt.price || 0;
          }
        }
      });
      return total;
    }
    case 'mixed_menu': {
      const countsMap = options.subOptionCounts || {};
      let total = 0;
      (service.sub_options || []).forEach((opt) => {
        const count = Number(countsMap[opt.name]) || 0;
        total += (opt.price || 0) * count;
      });
      return total;
    }
    default:
      return base;
  }
}

export function getUnitCount(service, numPeople, options = {}) {
  if (!service) return 0;
  const people = Math.max(0, numPeople || 0);
  switch (service.measurement_type) {
    case 'per_group':
      return people > 0 ? Math.ceil(people / (service.people_per_unit || 1)) : 0;
    case 'step_count':
      return people > 0 ? (people <= (service.tier_threshold || 0) ? 1 : 2) : 0;
    case 'per_hour':
      return options.hours || 0;
    default:
      return 0;
  }
}

export function getInflationRate(eventDate, settings) {
  if (!eventDate || !settings) return 0;
  const eventYear = new Date(eventDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearDiff = eventYear - currentYear;
  if (yearDiff <= 0) return 0;

  const nextRate = (settings.next_year_inflation || 0) / 100;
  const followingRate = (settings.following_year_inflation || 0) / 100;

  if (yearDiff === 1) return settings.next_year_inflation || 0;

  let cumulative = nextRate;
  for (let i = 2; i <= yearDiff; i++) {
    cumulative = (1 + cumulative) * (1 + followingRate) - 1;
  }
  return Math.round(cumulative * 10000) / 100;
}

export function applyInflation(price, inflationRate) {
  if (!inflationRate) return Math.round(price);
  return Math.round(price * (1 + inflationRate / 100));
}

export function formatCurrency(amount) {
  const value = Math.round(amount || 0);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const cleanDate = dateStr.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const MEASUREMENT_LABELS = {
  fixed: 'Precio fijo',
  per_person: 'Por persona',
  mixed_menu: 'Menú / Vajilla Mixta (Desglose por personas)',
  per_group: 'Por grupo (cada N personas)',
  step_count: 'Escalonado (1 o 2)',
  per_hour: 'Por hora',
  torta: 'Torta (cálculo especial)',
  sub_option: 'Con sub-opciones',
  average_person: 'Promedio de personas',
  tiered: 'Escalonado',
};

export const CATEGORY_LABELS = {
  alquiler: 'Alquiler',
  decoracion: 'Decoración',
  catering: 'Catering',
  bebidas: 'Bebidas',
  servicios: 'Servicios',
  personal: 'Personal',
  otros: 'Otros',
};

export const EVENT_TYPE_LABELS = {
  general: 'General',
  egresados: 'Egresados',
  fiesta_particular: 'Fiesta particular',
  empresarial: 'Empresarial',
};

export function generateReceiptNumber() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `R-${stamp}-${random}`;
}

export function buildReceiptMessage({ receiptNumber, date, payerName, concept, amount, method }) {
  return (
    `*RECIBO DE PAGO*\n` +
    `Quinta La Juliana - Eventos\n\n` +
    `Recibo N°: ${receiptNumber}\n` +
    `Fecha: ${date}\n` +
    `Pagador: ${payerName}\n` +
    `Concepto: ${concept}\n` +
    `Monto: ${formatCurrency(amount)}\n` +
    `Método: ${method}\n\n` +
    `¡Gracias por su pago!`
  );
}

export function buildWhatsAppUrl(phone, message) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.startsWith('54') ? cleanPhone : '54' + cleanPhone;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
