import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Users, CalendarDays, UtensilsCrossed, TrendingUp, Package, Printer, ChevronDown, ChevronRight, EyeOff, Eye, RotateCcw, CheckCircle2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [hidePrices, setHidePrices] = useState(false);

  // Checked and custom quantity states per event
  const [checkedMap, setCheckedMap] = useState({});
  const [customQtyMap, setCustomQtyMap] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [evs, ms, ps] = await Promise.all([
        base44.entities.Evento.list('-fecha', 100),
        base44.entities.Menu.list('-updated_date', 200),
        base44.entities.Producto.list('-updated_date', 500),
      ]);
      setEventos(evs || []);
      setMenus(ms || []);
      setProductos(ps || []);

      if (!selectedId) {
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('evento');
        if (fromUrl) setSelectedId(fromUrl);
        else if (evs && evs.length > 0) setSelectedId(evs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('catering-cloud-updated', load);
    return () => window.removeEventListener('catering-cloud-updated', load);
  }, []);

  // Load event-specific check & qty overrides from localStorage
  useEffect(() => {
    if (selectedId) {
      try {
        const storedCheck = localStorage.getItem(`catering_calc_check_${selectedId}`);
        const storedQty = localStorage.getItem(`catering_calc_qty_${selectedId}`);
        setCheckedMap(storedCheck ? JSON.parse(storedCheck) : {});
        setCustomQtyMap(storedQty ? JSON.parse(storedQty) : {});
      } catch {
        setCheckedMap({});
        setCustomQtyMap({});
      }
    }
  }, [selectedId]);

  const toggleCheck = (producto_id) => {
    const updated = { ...checkedMap, [producto_id]: !checkedMap[producto_id] };
    setCheckedMap(updated);
    if (selectedId) {
      try { localStorage.setItem(`catering_calc_check_${selectedId}`, JSON.stringify(updated)); } catch {}
    }
  };

  const handleCustomQtyChange = (producto_id, val) => {
    const updated = { ...customQtyMap, [producto_id]: val };
    setCustomQtyMap(updated);
    if (selectedId) {
      try { localStorage.setItem(`catering_calc_qty_${selectedId}`, JSON.stringify(updated)); } catch {}
    }
  };

  const resetAllChecks = () => {
    setCheckedMap({});
    setCustomQtyMap({});
    if (selectedId) {
      try {
        localStorage.removeItem(`catering_calc_check_${selectedId}`);
        localStorage.removeItem(`catering_calc_qty_${selectedId}`);
      } catch {}
    }
  };

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

      const isChecked = !!checkedMap[item.producto_id];
      const customQtyRaw = customQtyMap[item.producto_id];
      const qtyToBuy = (customQtyRaw !== undefined && customQtyRaw !== '')
        ? Math.max(0, parseFloat(customQtyRaw) || 0)
        : cantidad_total;

      const rowCost = isChecked ? 0 : (qtyToBuy * precio);

      return {
        ...item,
        precio_actual: precio,
        cantidad_total,
        qtyToBuy,
        isChecked,
        rowCost,
      };
    });

    items.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.producto_nombre.localeCompare(b.producto_nombre));

    const grouped = {};
    for (const item of items) {
      if (!grouped[item.categoria]) grouped[item.categoria] = [];
      grouped[item.categoria].push(item);
    }

    const costoTotal = items.reduce((s, i) => s + i.rowCost, 0);
    const costoPorPersona = comensales > 0 ? costoTotal / comensales : 0;
    const checkedCount = items.filter(i => i.isChecked).length;

    return { items, grouped, costoTotal, costoPorPersona, eventMenus, comensales, checkedCount };
  }, [selectedEvento, menus, productos, checkedMap, customQtyMap]);

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
          <p className="text-muted-foreground mt-1">Lista de insumos totales, stock disponible y costos del evento</p>
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
              <div className="rounded-xl bg-primary text-primary-foreground p-5 shadow-sm">
                <TrendingUp className="w-5 h-5 opacity-80" />
                <p className="text-3xl font-heading font-bold mt-2">{formatPrice(calc.costoTotal)}</p>
                <p className="text-sm opacity-80">
                  {calc.checkedCount > 0 ? 'Costo a comprar (con tachados)' : 'Costo total de compra'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Users className="w-5 h-5 text-muted-foreground" />
                <p className="text-3xl font-heading font-bold mt-2">{formatPrice(calc.costoPorPersona)}</p>
                <p className="text-sm text-muted-foreground">Costo por comensal</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Package className="w-5 h-5 text-muted-foreground" />
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-heading font-bold">{calc.items.length - calc.checkedCount}</p>
                  {calc.checkedCount > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      ({calc.checkedCount} en depósito)
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Productos pendientes a comprar</p>
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
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-heading font-semibold">Lista de Compra y Control de Depósito</h3>
                  <p className="text-xs text-muted-foreground">Tildá los productos que ya tenés o ajustá la cantidad si tenés stock parcial.</p>
                </div>
                {(calc.checkedCount > 0 || Object.keys(customQtyMap).length > 0) && (
                  <button
                    type="button"
                    onClick={resetAllChecks}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline font-medium print:hidden"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restablecer tachados y stock
                  </button>
                )}
              </div>
              <div className="divide-y divide-border">
                {Object.entries(calc.grouped).map(([categoria, items]) => {
                  const expanded = expandedCats[categoria] !== false;
                  const catTotal = items.reduce((s, i) => s + i.rowCost, 0);
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
                              <th className="px-3 py-2 text-center w-10 print:hidden">Estado</th>
                              <th className="text-left font-medium px-3 py-2">Producto</th>
                              <th className="text-right font-medium px-3 py-2">Cant. Recetada</th>
                              <th className="text-right font-medium px-3 py-2">Cant. A Comprar</th>
                              {!hidePrices && <th className="text-right font-medium px-3 py-2">Precio unit.</th>}
                              {!hidePrices && <th className="text-right font-medium px-3 py-2">Costo total</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(item => {
                              const isChecked = item.isChecked;
                              const hasPartialStock = !isChecked && item.qtyToBuy < item.cantidad_total;
                              return (
                                <tr
                                  key={item.producto_id}
                                  className={`border-b border-border/60 last:border-0 transition-colors ${
                                    isChecked
                                      ? 'bg-muted/30 opacity-70'
                                      : hasPartialStock
                                      ? 'bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/50'
                                      : 'hover:bg-muted/20'
                                  }`}
                                >
                                  {/* Checkbox button */}
                                  <td className="px-3 py-2 text-center w-10 print:hidden">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleCheck(item.producto_id)}
                                      className="w-4 h-4 rounded border-input accent-emerald-600 cursor-pointer"
                                      title="Marcar si ya está en depósito / comprado"
                                    />
                                  </td>

                                  {/* Producto Nombre y Menús */}
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className={`font-medium leading-snug ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {item.producto_nombre}
                                      </p>
                                      {isChecked && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded">
                                          <CheckCircle2 className="w-3 h-3" /> En depósito
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{item.menu_nombres.join(', ')}</p>
                                  </td>

                                  {/* Cant. Recetada / Necesaria */}
                                  <td className={`px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs ${isChecked ? 'line-through' : ''}`}>
                                    {formatNumber(item.cantidad_total, 3)} {item.unidad}
                                  </td>

                                  {/* Cant. A Comprar (Editable) */}
                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                    <div className="inline-flex items-center justify-end gap-1">
                                      <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        disabled={isChecked}
                                        value={customQtyMap[item.producto_id] !== undefined ? customQtyMap[item.producto_id] : item.cantidad_total}
                                        onChange={(e) => handleCustomQtyChange(item.producto_id, e.target.value)}
                                        className={`w-20 h-7 text-right font-bold text-xs border rounded px-1.5 transition-colors ${
                                          isChecked
                                            ? 'bg-muted text-muted-foreground line-through border-transparent'
                                            : hasPartialStock
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 font-extrabold'
                                            : 'bg-background border-input text-foreground'
                                        }`}
                                      />
                                      <span className="text-xs text-muted-foreground">{item.unidad}</span>
                                    </div>
                                    {hasPartialStock && (
                                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold text-right mt-0.5">
                                        (Stock en depósito: {formatNumber(item.cantidad_total - item.qtyToBuy, 2)} {item.unidad})
                                      </p>
                                    )}
                                  </td>

                                  {/* Precio unit. */}
                                  {!hidePrices && (
                                    <td className={`px-3 py-2 text-right text-muted-foreground whitespace-nowrap ${isChecked ? 'line-through' : ''}`}>
                                      {formatPrice(item.precio_actual)}
                                    </td>
                                  )}

                                  {/* Costo total */}
                                  {!hidePrices && (
                                    <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${isChecked ? 'line-through text-muted-foreground' : 'text-primary'}`}>
                                      {formatPrice(item.rowCost)}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!hidePrices && (
                <div className="flex items-center justify-between px-5 py-4 bg-primary/5 border-t border-border">
                  <span className="font-heading font-bold text-lg">Total a comprar</span>
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
