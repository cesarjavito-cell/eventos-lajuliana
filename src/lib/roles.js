// src/lib/roles.js

export const ROLES = {
  ADMIN: 'admin',
  ADMIN_JR: 'admin_jr',
  COMERCIAL: 'comercial',
  INVITADO: 'invitado',
};

export const ROLE_LABELS = {
  admin: 'Administrador general',
  admin_jr: 'Administrador Jr',
  comercial: 'Comercial',
  invitado: 'Invitado',
};

export const ROLE_DESCRIPTIONS = {
  admin: 'Modifica todos los parámetros de la organización',
  admin_jr: 'Presupuestos, reservas, eventos, cobros y recibos. Sin acceso a Ajustes',
  comercial: 'Calendario + generar presupuestos para enviar',
  invitado: 'Solo visualizar el calendario de eventos',
};

const PAGE_ACCESS = {
  calendario: ['admin', 'admin_jr', 'comercial', 'invitado'],
  presupuestos: ['admin', 'admin_jr', 'comercial'],
  eventos: ['admin', 'admin_jr'],
  cabanas: ['admin', 'admin_jr'],
  ajustes: ['admin'],
};

// Backwards compatibility: old 'user' role maps to admin_jr
const ROLE_ALIASES = {
  user: 'admin_jr',
};

export function normalizeRole(role) {
  return ROLE_ALIASES[role] || role;
}

export function canAccess(role, page) {
  const effectiveRole = normalizeRole(role);
  if (!effectiveRole) return false;
  const allowed = PAGE_ACCESS[page] || [];
  return allowed.includes(effectiveRole);
}

export function getAccessibleNavItems(role, allItems) {
  return allItems.filter((item) => canAccess(role, item.page));
}
