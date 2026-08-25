import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Users, CalendarDays, UtensilsCrossed, TrendingUp, Package, Printer, ChevronDown, ChevronRight, EyeOff, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice, formatNumber, formatDateLong } from '@/lib/format';
import PullToRefresh from '@/components/PullToRefresh';

const estadoLabels = {
  borrador: 'Borrador', confirmado: 'Confirmado', completado: 'Completado', cancelado: 'Cancelado',
};

export default function CalculoCompra() {
  const [eventos, setEventos] = useState([]);
  const [menus, setMenus] = useState([]);
  const [productos, setProductos] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState({});
  const [hidePrices, setHidePrices] = useState(false);

  const load = async () => {
    const [evs, ms, ps] = await Promise.all([
      base44.entities.Evento.list('-fecha', 100),
      base44.entities.Menu.list('-updated_date', 200),
      base44.entities.Producto.list('-updated_date', 500),
    ]);
    setEventos(evs);
    setMenus(ms);
    setProductos(ps);

    if (!selectedId) {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('evento');
      if (fromUrl) setSelectedId(fromUrl);
      else if (evs.length > 0) setSelectedId(evs[0].id);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectedEvento = eventos.find(e => e.id === selectedId);

  const calc = useMemo(() => {
    if (!selectedEvento) return null;
    const eventMenus = menus.filter(m => selectedEvento.menus_ids?.includes(m.id));
    const productMap = new Map(productos.map(p => [p.id, p]));
    const aggregated = new Map();

    for (const menu of eventMenus) {
      for (const item of (menu.items || [])) {
        const product = productMap.get(item.producto_id);
        const key = item.producto_id;
        const existing = aggregated.get(key) || {
          producto_id: key,
          producto_nombre: item.producto_nombre || product?.nombre || 'Desconocido',
          categoria: product?.categoria || 'Otros',
          unidad: item.unidad || product?.unidad || 'unidad',
          cantidad_por_persona: 0,
          menu_nombres: [],
        };
        existing.cantidad_por_persona += item.cantidad_por_persona || 0;
        if (!existing.menu_nombres.includes(menu.nombre)) {
          existing.menu_nombres.push(menu.nombre);
        }
        aggregated.set(key, existing);
      }
    }

    const comensales = selectedEvento.cantidad_comensales || 0;
    const items = Array.from(aggregated.values()).map(item => {
      const product = productMap.get(item.producto_id);
      const precio = product?.precio_actual || 0;
      const cantidad_total = item.cantidad_por_persona * comensales;
      return {
        ...item,
        precio_actual: precio,
        cantidad_total,
        costo_total: cantidad_total * precio,
      };
    });

    items.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.producto_nombre.localeCompare(b.producto_nombre));

    const grouped = {};
    for (const item of items) {
      if (!grouped[item.categoria]) grouped[item.categoria] = [];
      grouped[item.categoria].push(item);
    }

    const costoTotal = items.reduce((s, i) => s + i.costo_total, 0);
    const costoPorPersona = comensales > 0 ? costoTotal / comensales : 0;

    return { items, grouped, costoTotal, costoPorPersona, eventMenus, comensales };
  }, [selectedEvento, menus, productos]);

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShoppingCart className="w-12 h-12 text-muted-foreground/40" />
        <p className="mt-4 text-muted-foreground">No hay eventos creados. Creá un evento con menús para ver el cálculo.</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Cálculo de Compra</h1>
          <p className="text-muted-foreground mt-1">Lista de insumos totales y costos del evento</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {calc && (
            <div className="inline-flex p-1 rounded-lg bg-muted border border-border select-none">
              <button
                type="button"
                onClick={() => setHidePrices(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  !hidePrices
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Con precios
              </button>
              <button
                type="button"
                onClick={() => setHidePrices(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  hidePrices
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" /> Sin precios
              </button>
            </div>
          )}
          {calc && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs sm:text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          )}
        </div>
      </div>

      {/* Event selector */}
      <div className="print:hidden">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full sm:max-w-md"><SelectValue placeholder="Seleccionar evento..." /></SelectTrigger>
          <SelectContent>
            {eventos.map(ev => (
              <SelectItem key={ev.id} value={ev.id}>{ev.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEvento && calc && (
        <>
          {/* Event summary */}
          <div className="rounded-xl border border-border bg-card p-6 print:border-0 print:p-0">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-heading font-bold">{selectedEvento.nombre}</h2>
                {selectedEvento.cliente && <p className="text-muted-foreground mt-0.5">{selectedEvento.cliente}</p>}
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                {estadoLabels[selectedEvento.estado] || selectedEvento.estado}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="text-sm font-medium">{formatDateLong(selectedEvento.fecha)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Comensales</p>
                  <p className="text-sm font-medium">{calc.comensales}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Menús</p>
                  <p className="text-sm font-medium">{calc.eventMenus.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Productos</p>
                  <p className="text-sm font-medium">{calc.items.length}</p>
                </div>
              </div>
            </div>
            {calc.eventMenus.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {calc.eventMenus.map(m => (
                  <span key={m.id} className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium">
                    {m.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cost summary */}
          {!hidePrices ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-primary text-primary-foreground p-5">
                <TrendingUp className="w-5 h-5 opacity-80" />
                <p className="text-3xl font-heading font-bold mt-2">{formatPrice(calc.costoTotal)}</p>
                <p className="text-sm opacity-80">Costo total de compra</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Users className="w-5 h-5 text-muted-foreground" />
                <p className="text-3xl font-heading font-bold mt-2">{formatPrice(calc.costoPorPersona)}</p>
                <p className="text-sm text-muted-foreground">Costo por comensal</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Package className="w-5 h-5 text-muted-foreground" />
                <p className="text-3xl font-heading font-bold mt-2">{calc.items.length}</p>
                <p className="text-sm text-muted-foreground">Productos a comprar</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs sm:text-sm text-muted-foreground flex items-center justify-between print:hidden">
              <span>📋 Modo <strong>Sin Precios</strong> activo: listo para enviar o imprimir la lista de productos a comprar.</span>
              <span className="font-semibold text-foreground">{calc.items.length} productos totales</span>
            </div>
          )}

          {/* Shopping list */}
          {calc.items.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="mt-3 text-muted-foreground">
                {calc.eventMenus.length === 0
                  ? 'Este evento no tiene menús seleccionados.'
                  : 'Los menús seleccionados no tienen productos agregados.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <h3 className="font-heading font-semibold">Lista de Compra</h3>
              </div>
              <div className="divide-y divide-border">
                {Object.entries(calc.grouped).map(([categoria, items]) => {
                  const expanded = expandedCats[categoria] !== false;
                  const catTotal = items.reduce((s, i) => s + i.costo_total, 0);
                  return (
                    <div key={categoria}>
                      <button
                        onClick={() => toggleCat(categoria)}
                        className="flex items-center justify-between w-full px-3 py-2 bg-rose-50/90 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 transition-colors border-b border-rose-200/60 dark:border-rose-900/40 select-none"
                      >
                        <div className="flex items-center gap-2">
                           {expanded ? <ChevronDown className="w-4 h-4 text-rose-700 dark:text-rose-300" /> : <ChevronRight className="w-4 h-4 text-rose-700 dark:text-rose-300" />}
                           <span className="font-semibold text-rose-900 dark:text-rose-100 text-sm sm:text-base">{categoria}</span>
                           <span className="text-xs text-rose-700/80 dark:text-rose-300">({items.length} ítem{items.length !== 1 ? 's' : ''})</span>
                         </div>
                         {!hidePrices && <span className="text-xs sm:text-sm font-semibold text-rose-900 dark:text-rose-200">{formatPrice(catTotal)}</span>}
                      </button>
                        <div className={`overflow-x-auto ${expanded ? '' : 'hidden print:block'}`}>
                          <table className="w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider">
                                <th className="text-left font-medium px-3 py-1.5">Producto</th>
                                <th className="text-right font-medium px-3 py-1.5">Cant. Total</th>
                                {!hidePrices && <th className="text-right font-medium px-3 py-1.5">Precio unit.</th>}
                                {!hidePrices && <th className="text-right font-medium px-3 py-1.5">Costo total</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map(item => (
                                <tr key={item.producto_id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                                  <td className="px-3 py-1.5">
                                    <p className="font-medium text-foreground leading-snug">{item.producto_nombre}</p>
                                    <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{item.menu_nombres.join(', ')}</p>
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-semibold text-foreground whitespace-nowrap">
                                     {formatNumber(item.cantidad_total, 3)} {item.unidad}
                                   </td>
                                   {!hidePrices && <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                                     {formatPrice(item.precio_actual)}
                                   </td>}
                                   {!hidePrices && <td className="px-3 py-1.5 text-right font-bold text-foreground whitespace-nowrap">
                                     {formatPrice(item.costo_total)}
                                   </td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                    </div>
                  );
                })}
              </div>
              {!hidePrices && (
              <div className="flex items-center justify-between px-5 py-4 bg-primary/5 border-t border-border">
                <span className="font-heading font-bold text-lg">Total general</span>
                <span className="font-heading font-bold text-lg text-primary">{formatPrice(calc.costoTotal)}</span>
              </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}
