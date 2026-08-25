export const formatPrice = (value) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const formatNumber = (value, decimals = 2) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value || 0);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateLong = (dateStr) => {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};
