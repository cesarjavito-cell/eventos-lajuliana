import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  calculateServicePrice,
  getUnitCount,
  applyInflation,
  getInflationRate,
  formatCurrency,
  MEASUREMENT_LABELS,
  CATEGORY_LABELS,
} from '@/lib/pricing';
import { ensureSeedServices } from '@/lib/seedServices';

/**
 * Reusable service selector with automatic pricing calculation and Mixed Menu support.
 * @param {number} people - number of people for per-person pricing
 * @param {string} eventDate - ISO date string for inflation calculation
 * @param {array} initialServices - pre-selected services (for editing)
 * @param {function} onChange - callback(selectedServices[], total)
 */
export default function ServiceSelector({ people = 0, eventDate = '', initialServices = [], onChange, hideTotal = false }) {
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const load = async () => {
      await ensureSeedServices();
      const [svcData, setData] = await Promise.all([
        base44.entities.Service.filter({ active: true }),
        base44.entities.Setting.list(),
      ]);
      const sorted = (svcData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setServices(sorted);
      if (setData && setData.length > 0) setSettings(setData[0]);

      const initial = {};
      sorted.forEach((s) => {
        if (s.auto_include) {
          initial[s.id] = { selected: true, hours: 0, selectedSubOptions: [], subOptionCounts: {} };
        }
      });

      (initialServices || []).forEach((s) => {
        initial[s.service_id] = {
          selected: true,
          hours: s.hours || 0,
          selectedSubOptions: s.selected_sub_options || [],
          subOptionCounts: s.sub_option_counts || {},
        };
      });
      setSelected(initial);
    };
    load();
  }, []);

  const inflationRate = getInflationRate(eventDate, settings);

  const selectedServices = useMemo(() => {
    return services
      .filter((s) => selected[s.id]?.selected)
      .map((s) => {
        const sel = selected[s.id] || {};
        const basePrice = calculateServicePrice(s, people, {
          hours: sel.hours || 0,
          selectedSubOptions: sel.selectedSubOptions || [],
          subOptionCounts: sel.subOptionCounts || {},
        });
        const finalPrice = applyInflation(basePrice, inflationRate);
        return {
          service_id: s.id,
          service_name: s.name,
          category: s.category,
          measurement_type: s.measurement_type,
          base_price: s.base_price || 0,
          quantity: people,
          calculated_price: finalPrice,
          selected_sub_options: sel.selectedSubOptions || [],
          sub_option_counts: sel.subOptionCounts || {},
          hours: sel.hours || 0,
          unit_count: getUnitCount(s, people, { hours: sel.hours || 0 }),
          hidden_in_pdf: s.hidden_in_pdf || false,
        };
      });
  }, [services, selected, people, inflationRate]);

  const total = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.calculated_price, 0),
    [selectedServices]
  );

  useEffect(() => {
    onChangeRef.current?.(selectedServices, total);
  }, [selectedServices, total]);

  const getServicePrice = (svc) => {
    const sel = selected[svc.id];
    if (!sel?.selected) return 0;
    const basePrice = calculateServicePrice(svc, people, {
      hours: sel.hours || 0,
      selectedSubOptions: sel.selectedSubOptions || [],
      subOptionCounts: sel.subOptionCounts || {},
    });
    return applyInflation(basePrice, inflationRate);
  };

  const formatServiceRateLabel = (svc) => {
    const inflatedBase = applyInflation(svc.base_price || 0, inflationRate);
    switch (svc.measurement_type) {
      case 'per_person':
      case 'average_person':
        return `${formatCurrency(inflatedBase)} / pers.`;
      case 'mixed_menu':
        return `Mixto por personas`;
      case 'torta':
        return `${formatCurrency(svc.per_kg_price || 18000)} / kg`;
      case 'per_group':
        return `${formatCurrency(inflatedBase)} c/${svc.people_per_unit || 25} pers.`;
      case 'per_hour':
        return `${formatCurrency(inflatedBase)} / hora`;
      case 'fixed':
        return `${formatCurrency(inflatedBase)} (fijo)`;
      default:
        return `${formatCurrency(inflatedBase)}`;
    }
  };

  const toggleService = (serviceId) => {
    setSelected((prev) => ({
      ...prev,
      [serviceId]: {
        selected: !prev[serviceId]?.selected,
        hours: prev[serviceId]?.hours || 0,
        selectedSubOptions: prev[serviceId]?.selectedSubOptions || [],
        subOptionCounts: prev[serviceId]?.subOptionCounts || {},
      },
    }));
  };

  const setHours = (serviceId, hours) => {
    setSelected((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], hours: Number(hours) || 0 },
    }));
  };

  const setSubOptionCount = (serviceId, optName, count) => {
    setSelected((prev) => {
      const cur = prev[serviceId] || { selected: true, hours: 0, selectedSubOptions: [], subOptionCounts: {} };
      const newCounts = { ...(cur.subOptionCounts || {}), [optName]: Number(count) || 0 };
      return { ...prev, [serviceId]: { ...cur, selected: true, subOptionCounts: newCounts } };
    });
  };

  const toggleSubOption = (serviceId, optName, maxSel) => {
    setSelected((prev) => {
      const cur = prev[serviceId] || { selected: true, hours: 0, selectedSubOptions: [], subOptionCounts: {} };
      let subs = cur.selectedSubOptions || [];
      if (subs.includes(optName)) {
        subs = subs.filter((n) => n !== optName);
      } else {
        if (subs.length >= maxSel) {
          subs = maxSel === 1 ? [optName] : [...subs.slice(1), optName];
        } else {
          subs = [...subs, optName];
        }
      }
      return { ...prev, [serviceId]: { ...cur, selected: true, selectedSubOptions: subs } };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Label>Servicios ({selectedServices.length} seleccionados)</Label>
          {hideTotal && (
            <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-300">Incluidos sin costo</Badge>
          )}
        </div>
        {!hideTotal && (
          <span className="text-lg font-bold text-stone-800">{formatCurrency(total)}</span>
        )}
      </div>

      {people === 0 && (
        <div className="mb-2 text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded px-3 py-1.5 flex items-center gap-1.5">
          <span>💡 Ingresa la <strong>"Cantidad de personas"</strong> en el formulario para calcular el costo por comensal.</span>
        </div>
      )}

      <div className="border border-amber-300 rounded-lg max-h-[340px] overflow-y-auto divide-y divide-amber-200 bg-amber-50">
        {services.length === 0 ? (
          <p className="p-4 text-center text-sm text-stone-400">Cargando catálogo de servicios...</p>
        ) : (
          services.map((svc) => {
            const sel = selected[svc.id] || {};
            const isSelected = sel?.selected;
            const price = getServicePrice(svc);
            const unitCount = getUnitCount(svc, people, { hours: sel?.hours || 0 });
            const rateLabel = formatServiceRateLabel(svc);

            const countsMap = sel.subOptionCounts || {};
            const totalAssignedPeople = Object.values(countsMap).reduce((a, b) => a + (Number(b) || 0), 0);

            return (
              <div key={svc.id} className="p-3 hover:bg-amber-100/70">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected || false}
                    onCheckedChange={() => toggleService(svc.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-stone-800 truncate">{svc.name}</p>
                      {svc.auto_include && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Auto</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-0.5 flex-wrap items-center">
                      <Badge variant="outline" className="text-[10px]">{MEASUREMENT_LABELS[svc.measurement_type]}</Badge>
                      <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[svc.category]}</Badge>
                      <span className="text-[10px] text-amber-800 font-medium bg-amber-200/60 px-1.5 py-0.5 rounded">
                        Tarifa: {rateLabel}
                      </span>
                      {unitCount > 0 && isSelected && (
                        <span className="text-[10px] text-stone-500 font-semibold">×{unitCount}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-stone-700 shrink-0 min-w-[90px] text-right">
                    {!isSelected ? '—' : price > 0 ? formatCurrency(price) : (people === 0 ? '$0' : formatCurrency(price))}
                  </span>
                </div>

                {/* Sub-opciones de tipo Menú / Vajilla Mixta (Desglose por personas) */}
                {isSelected && svc.measurement_type === 'mixed_menu' && (svc.sub_options || []).length > 0 && (
                  <div className="mt-2.5 ml-7 p-2.5 bg-violet-50/90 rounded-lg border border-violet-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-violet-800 font-medium">
                      <span>Desglose por cantidad de invitados:</span>
                      <span className={totalAssignedPeople === people ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                        Asignados: {totalAssignedPeople} / {people} pers.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {svc.sub_options.map((opt) => {
                        const count = countsMap[opt.name] || 0;
                        const optPrice = applyInflation(opt.price || 0, inflationRate);
                        const subtotal = count * optPrice;

                        return (
                          <div key={opt.name} className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-violet-100">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-stone-800 truncate">{opt.name}</p>
                              <p className="text-[10px] text-stone-400">{formatCurrency(optPrice)} / persona</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                min="0"
                                className="w-16 h-7 text-xs text-center"
                                value={count}
                                onChange={(e) => setSubOptionCount(svc.id, opt.name, e.target.value)}
                              />
                              <span className="text-[10px] text-stone-400">pers.</span>
                            </div>
                            {subtotal > 0 && (
                              <span className="font-semibold text-violet-700 text-xs shrink-0">{formatCurrency(subtotal)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-opciones estándar (checkboxes) */}
                {isSelected && svc.measurement_type === 'sub_option' && (svc.sub_options || []).length > 0 && (
                  <div className="mt-2 ml-7 flex flex-wrap gap-2">
                    {svc.sub_options.map((opt) => {
                      const checked = (sel?.selectedSubOptions || []).includes(opt.name);
                      return (
                        <label
                          key={opt.name}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer text-xs transition-colors ${
                            checked ? 'bg-violet-100 border-violet-300 text-violet-700 font-medium' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSubOption(svc.id, opt.name, svc.max_sub_selections || 1)}
                            className="w-3 h-3"
                          />
                          {opt.name} {opt.price ? `(+${formatCurrency(opt.price)})` : ''}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Horas para servicios per_hour */}
                {isSelected && svc.measurement_type === 'per_hour' && (
                  <div className="mt-2 ml-7">
                    <Label className="text-xs">Cantidad de horas contratadas</Label>
                    <Input
                      type="number"
                      className="max-w-[120px] h-8 mt-1"
                      value={sel?.hours || 0}
                      onChange={(e) => setHours(svc.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
