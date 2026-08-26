// Seed data based on user's project
const initialData = {
  Producto: [
    { id: 'p1', nombre: 'Tapa de Empanadas Horno', categoria: 'Supermercado', unidad: 'unidad', precio_actual: 2000, proveedor: 'Supermercado' },
    { id: 'p2', nombre: 'Tapas de Empanadas Freir', categoria: 'Supermercado', unidad: 'unidad', precio_actual: 2000, proveedor: 'Supermercado' },
    { id: 'p3', nombre: 'Azúcar Rubio', categoria: 'Supermercado', unidad: 'kg', precio_actual: 1100, proveedor: 'Supermercado' },
    { id: 'p4', nombre: 'Queso Crema', categoria: 'Supermercado', unidad: 'pote', precio_actual: 2500, proveedor: 'Supermercado' },
    { id: 'p5', nombre: 'Pan de Miga', categoria: 'Panadería', unidad: 'paquete', precio_actual: 3200, proveedor: 'Panadería' },
    { id: 'p6', nombre: 'Sorbetes', categoria: 'Supermercado', unidad: 'unidad', precio_actual: 500, proveedor: 'Supermercado' },
    { id: 'p7', nombre: 'Carne Asada / Vacío', categoria: 'Carnes', unidad: 'kg', precio_actual: 9500, proveedor: 'Carnicería' },
    { id: 'p8', nombre: 'Pollo', categoria: 'Aves', unidad: 'kg', precio_actual: 4200, proveedor: 'Granja' },
    { id: 'p9', nombre: 'Gaseosas Cola / Lima', categoria: 'Bebidas', unidad: 'lt', precio_actual: 2800, proveedor: 'Distribuidora' },
    { id: 'p10', nombre: 'Vino Tinto / Blanco', categoria: 'Bebidas', unidad: 'unidad', precio_actual: 4500, proveedor: 'Distribuidora' },
    { id: 'p11', nombre: 'Hielo', categoria: 'Bebidas', unidad: 'kg', precio_actual: 1200, proveedor: 'Distribuidora' },
    { id: 'p12', nombre: 'Fernet', categoria: 'Bebidas Generales', unidad: 'unidad', precio_actual: 12500, proveedor: 'Distribuidora' },
  ],
  Categoria: [
    { id: 'c1', nombre: 'Carnes', orden: 0 },
    { id: 'c2', nombre: 'Aves', orden: 1 },
    { id: 'c3', nombre: 'Pescados', orden: 2 },
    { id: 'c4', nombre: 'Verduras', orden: 3 },
    { id: 'c5', nombre: 'Frutas', orden: 4 },
    { id: 'c6', nombre: 'Bebidas', orden: 5 },
    { id: 'c7', nombre: 'Panadería', orden: 6 },
    { id: 'c8', nombre: 'Lácteos', orden: 7 },
    { id: 'c9', nombre: 'Condimentos', orden: 8 },
    { id: 'c10', nombre: 'Almacen', orden: 9 },
    { id: 'c11', nombre: 'Limpieza', orden: 10 },
    { id: 'c12', nombre: 'Bebidas Generales', orden: 11 },
    { id: 'c13', nombre: 'Fiambres', orden: 12 },
    { id: 'c14', nombre: 'Supermercado', orden: 13 },
    { id: 'c15', nombre: 'Otros', orden: 14 },
  ],
  Menu: [
    {
      id: 'm1',
      nombre: 'Barra de tragos',
      tipo: 'Cocktail',
      descripcion: 'Bebidas, aperitivos y hielo para eventos',
      items: [
        { producto_id: 'p9', producto_nombre: 'Gaseosas Cola / Lima', cantidad_por_persona: 0.5, unidad: 'lt' },
        { producto_id: 'p11', producto_nombre: 'Hielo', cantidad_por_persona: 0.3, unidad: 'kg' },
        { producto_id: 'p12', producto_nombre: 'Fernet', cantidad_por_persona: 0.05, unidad: 'unidad' },
      ]
    },
    {
      id: 'm2',
      nombre: 'Bebidas',
      tipo: 'Principal',
      descripcion: 'Agua, gaseosas y vinos generales',
      items: [
        { producto_id: 'p9', producto_nombre: 'Gaseosas Cola / Lima', cantidad_por_persona: 0.75, unidad: 'lt' },
        { producto_id: 'p10', producto_nombre: 'Vino Tinto / Blanco', cantidad_por_persona: 0.25, unidad: 'unidad' },
        { producto_id: 'p11', producto_nombre: 'Hielo', cantidad_por_persona: 0.2, unidad: 'kg' },
      ]
    }
  ],
  Evento: [
    {
      id: 'e1',
      nombre: 'Cumple 15 Años Simone',
      cliente: 'Gastón',
      fecha: '2026-10-17',
      cantidad_comensales: 100,
      menus_ids: ['m1', 'm2'],
      estado: 'confirmado',
      notas: 'Evento de 15 años en la quinta'
    }
  ]
};

const getLocalEntityData = (entityName) => {
  if (typeof window === 'undefined') return initialData[entityName] || [];
  const key = `catering_local_${entityName}`;
  const stored = localStorage.getItem(key);
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback to initial if corrupted
    }
  }
  const init = initialData[entityName] || [];
  try {
    localStorage.setItem(key, JSON.stringify(init));
  } catch { /* ignore */ }
  return init;
};

const setLocalEntityData = (entityName, data) => {
  if (typeof window === 'undefined') return;
  const key = `catering_local_${entityName}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
};

const createLocalEntityHandler = (entityName) => ({
  list: async () => {
    return getLocalEntityData(entityName);
  },
  create: async (item) => {
    const list = getLocalEntityData(entityName);
    const newItem = { id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, updated_date: new Date().toISOString(), ...item };
    list.unshift(newItem);
    setLocalEntityData(entityName, list);
    return newItem;
  },
  update: async (id, patch) => {
    const list = getLocalEntityData(entityName);
    const idx = list.findIndex(x => x.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch, updated_date: new Date().toISOString() };
      setLocalEntityData(entityName, list);
    }
    return list[idx];
  },
  delete: async (id) => {
    let list = getLocalEntityData(entityName);
    list = list.filter(x => x.id !== id);
    setLocalEntityData(entityName, list);
    return true;
  },
  updateMany: async (filter, updateOp) => {
    const list = getLocalEntityData(entityName);
    const patch = updateOp?.$set || {};
    let changed = false;
    list.forEach((item, idx) => {
      let match = true;
      for (const k in filter) {
        if (item[k] !== filter[k]) { match = false; break; }
      }
      if (match) {
        list[idx] = { ...item, ...patch };
        changed = true;
      }
    });
    if (changed) setLocalEntityData(entityName, list);
    return true;
  }
});

export const base44 = {
  functions: {
    invoke: async () => ({ success: true })
  },
  entities: {
    Producto: createLocalEntityHandler('Producto'),
    Menu: createLocalEntityHandler('Menu'),
    Evento: createLocalEntityHandler('Evento'),
    Categoria: createLocalEntityHandler('Categoria'),
  },
  clearAllData: () => {
    setLocalEntityData('Producto', []);
    setLocalEntityData('Categoria', initialData.Categoria);
    setLocalEntityData('Menu', []);
    setLocalEntityData('Evento', []);
  },
  resetFactoryData: () => {
    setLocalEntityData('Producto', initialData.Producto);
    setLocalEntityData('Categoria', initialData.Categoria);
    setLocalEntityData('Menu', initialData.Menu);
    setLocalEntityData('Evento', initialData.Evento);
  },
  exportAllData: () => {
    return {
      productos: getLocalEntityData('Producto'),
      categorias: getLocalEntityData('Categoria'),
      menus: getLocalEntityData('Menu'),
      eventos: getLocalEntityData('Evento'),
      export_date: new Date().toISOString()
    };
  },
  importAllData: (data) => {
    if (data.productos) setLocalEntityData('Producto', data.productos);
    if (data.categorias) setLocalEntityData('Categoria', data.categorias);
    if (data.menus) setLocalEntityData('Menu', data.menus);
    if (data.eventos) setLocalEntityData('Evento', data.eventos);
  }
};
