import { base44 } from '@/api/base44Client';

export const DEFAULT_SERVICES = [
  {
    name: 'Catering Menú Mixto (Desglose por Invitados)',
    description: 'Permite asignar distintas opciones gastronómicas por cantidad de personas (Galeto, Asado, Finger Food, Burguer).',
    category: 'catering',
    measurement_type: 'mixed_menu',
    sub_option_pricing: 'per_person',
    sub_options: [
      { name: 'Asado Completo', price: 26500 },
      { name: 'Galeto Deshuesado Relleno', price: 19600 },
      { name: 'Finger Food Gourmet', price: 17800 },
      { name: 'Burguer Free c/Papas Fritas', price: 10600 },
    ],
    display_order: 1,
    active: true,
    auto_include: true,
  },
  {
    name: 'Vajilla y Mantelería Mixta (Diferenciada)',
    description: 'Vajilla completa de loza para menús calientes vs vajilla informal para Finger Food / Burguers.',
    category: 'servicios',
    measurement_type: 'mixed_menu',
    sub_option_pricing: 'per_person',
    sub_options: [
      { name: 'Vajilla Completa (Plato Caliente / Asado / Galeto)', price: 3500 },
      { name: 'Vajilla Informal (Finger Food / Burguers / Pizzas)', price: 1800 },
    ],
    display_order: 2,
    active: true,
    auto_include: true,
  },
  {
    name: 'Entraditas Finger (Pizzas, Sand. Miga, Empanadas, Etc.)',
    description: 'Recepción de bocaditos salados fríos y calientes por persona.',
    category: 'catering',
    measurement_type: 'per_person',
    base_price: 8500,
    display_order: 3,
    active: true,
    auto_include: false,
  },
  {
    name: 'Torta Real + Maqueta Decorada',
    description: 'Torta temática por kilo con maqueta decorativa incluida.',
    category: 'catering',
    measurement_type: 'torta',
    grams_per_person: 100,
    per_kg_price: 18000,
    small_cake_per_kg_price: 22000,
    maqueta_price: 25000,
    large_cake_threshold: 10,
    display_order: 4,
    active: true,
    auto_include: false,
  },
  {
    name: 'Proyector y Pantalla Gigante',
    description: 'Proyector HD con pantalla gigante para videos cronológicos.',
    category: 'servicios',
    measurement_type: 'fixed',
    base_price: 45000,
    display_order: 5,
    active: true,
    auto_include: false,
  },
  {
    name: 'Sillón de 15 Años',
    description: 'Sillón de gala especial para quinceañeras o agasajados.',
    category: 'alquiler',
    measurement_type: 'fixed',
    base_price: 35000,
    display_order: 6,
    active: true,
    auto_include: false,
  },
  {
    name: 'Cabina Selfie / Fotomatón',
    description: 'Cabina fotográfica interactiva con impresión de fotos en el acto.',
    category: 'servicios',
    measurement_type: 'fixed',
    base_price: 65000,
    display_order: 7,
    active: true,
    auto_include: false,
  },
  {
    name: 'Decoración & Ambientación Completa (Incluye Fondo de Torta)',
    description: 'Decoración temática de salón, mesas y espacio de fotos.',
    category: 'decoracion',
    measurement_type: 'fixed',
    base_price: 120000,
    display_order: 8,
    active: true,
    auto_include: false,
  },
  {
    name: 'Sillas Tiffany & Mobiliario de Gala',
    description: 'Juego de sillas Tiffany con mesas vestidas y mantelería fina.',
    category: 'alquiler',
    measurement_type: 'per_person',
    base_price: 2500,
    display_order: 9,
    active: true,
    auto_include: false,
  },
  {
    name: 'Bebidas Sin Alcohol Libre (Gaseosas, Aguas, Aguas Saborizadas)',
    description: 'Canilla libre de bebidas de primera marca durante todo el evento.',
    category: 'bebidas',
    measurement_type: 'per_person',
    base_price: 5500,
    display_order: 10,
    active: true,
    auto_include: true,
  },
  {
    name: 'Barra de Tragos & Coctelería (Bartender)',
    description: 'Tragos con y sin alcohol servidos en barra ambientada.',
    category: 'bebidas',
    measurement_type: 'per_person',
    base_price: 8000,
    display_order: 11,
    active: true,
    auto_include: false,
  },
  {
    name: 'Alquiler de Salón y Parque Quinta La Juliana',
    description: 'Uso exclusivo del salón, parque y galerías por 8 hs de evento.',
    category: 'alquiler',
    measurement_type: 'fixed',
    base_price: 450000,
    display_order: 12,
    active: true,
    auto_include: true,
  },
  {
    name: 'Servicio de DJ, Sonido e Iluminación Pista',
    description: 'DJ profesional, sonido envolvente y luces robóticas.',
    category: 'servicios',
    measurement_type: 'fixed',
    base_price: 180000,
    display_order: 13,
    active: true,
    auto_include: false,
  },
  {
    name: 'Personal de Mozos, Recepcionistas y Cocina',
    description: 'Atención de recepción, mesas y coordinación de cocina.',
    category: 'personal',
    measurement_type: 'per_group',
    people_per_unit: 20,
    base_price: 45000,
    display_order: 14,
    active: true,
    auto_include: false,
  },
];

export async function ensureSeedServices() {
  try {
    const existing = await base44.entities.Service.list();
    // Only seed default services if the Service collection is completely empty!
    // Never auto-recreate services that the user explicitly deleted.
    if (!existing || existing.length === 0) {
      for (const s of DEFAULT_SERVICES) {
        await base44.entities.Service.create(s);
      }
    }
  } catch (e) {
    console.warn('Seed services error:', e);
  }
}
