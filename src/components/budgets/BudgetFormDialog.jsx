import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCreateBudget, useUpdateBudget } from '@/hooks/useEntityQueries';
import { jsPDF } from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MobileSelect } from '@/components/ui/mobile-select';
import {
  calculateServicePrice,
  getUnitCount,
  getInflationRate,
  applyInflation,
  formatCurrency,
  formatDate,
  MEASUREMENT_LABELS,
  CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
} from '@/lib/pricing';
import { drawServiceIcon } from '@/lib/PdfServiceIcons';
import { useAuth } from '@/lib/AuthContext';

const HEADER_IMAGE_URL = 'https://media.base44.com/images/public/6a70f20332bd3ec0ab545f1c/c60663606_WhatsAppImage2026-08-04at104612.jpg';

const loadImageAsDataURL = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      try {
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), ratio: img.naturalWidth / img.naturalHeight });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });

export default function BudgetFormDialog({ budget, initialData, open, onOpenChange, onSaved }) {
  const isEdit = !!budget;
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    event_title: '',
    client_name: '',
    client_phone: '',
    event_date: '',
    event_type: 'general',
    number_of_people: 100,
    card_value: 0,
    card_count: 0,
    notes: '',
    status: 'borrador',
  });
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  useEffect(() => {
    const load = async () => {
      const [svcData, setData] = await Promise.all([
        base44.entities.Service.filter({ active: true }),
        base44.entities.Setting.list(),
      ]);
      const sorted = (svcData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setServices(sorted);
      if (setData && setData.length > 0) setSettings(setData[0]);

      // Pre-select auto-include services and matched client requested services
      const initial = {};
      const requestedServices = initialData?.preSelectedServices || [];
      sorted.forEach((s) => {
        const isMatched = requestedServices.some((reqName) => {
          const cleanReq = String(reqName || '').toLowerCase();
          const cleanSvc = String(s.name || '').toLowerCase();
          return cleanSvc.includes(cleanReq) || cleanReq.includes(cleanSvc);
        });
        if (s.auto_include || isMatched) {
          initial[s.id] = { selected: true, hours: 0, selectedSubOptions: [] };
        }
      });
      if (!budget) setSelected(initial);
    };
    if (open) load();
  }, [open, budget, initialData]);

  useEffect(() => {
    if (budget) {
      setForm({
        event_title: budget.event_title || '',
        client_name: budget.client_name || '',
        client_phone: budget.client_phone || '',
        event_date: budget.event_date || '',
        event_type: budget.event_type || 'general',
        number_of_people: budget.number_of_people || 0,
        card_value: budget.card_value || 0,
        card_count: budget.card_count || 0,
        notes: budget.notes || '',
        status: budget.status || 'borrador',
      });
      const sel = {};
      (budget.selected_services || []).forEach((s) => {
        sel[s.service_id] = {
          selected: true,
          hours: s.hours || 0,
          selectedSubOptions: s.selected_sub_options || [],
        };
      });
      setSelected(sel);
    } else if (initialData) {
      setForm({
        event_title: initialData.event_title || `Evento de ${initialData.client_name || 'Cliente'}`,
        client_name: initialData.client_name || '',
        client_phone: initialData.client_phone || '',
        event_date: initialData.event_date || '',
        event_type: initialData.event_type || 'general',
        number_of_people: initialData.number_of_people || 100,
        card_value: 0,
        card_count: 0,
        notes: initialData.notes || '',
        status: 'borrador',
      });
    } else {
      setForm({ event_title: '', client_name: '', client_phone: '', event_date: '', event_type: 'general', number_of_people: 100, card_value: 0, card_count: 0, notes: '', status: 'borrador' });
    }
  }, [budget, initialData, open]);

  const inflationRate = getInflationRate(form.event_date, settings);
  const isEgresados = form.event_type === 'egresados';
  const cardValue = Number(form.card_value) || 0;
  const cardCount = Number(form.card_count) || 0;
  const people = isEgresados ? cardCount : Number(form.number_of_people) || 0;

  const getServicePrice = (svc) => {
    const sel = selected[svc.id];
    if (!sel?.selected) return 0;
    const basePrice = calculateServicePrice(svc, people, {
      hours: sel.hours || 0,
      selectedSubOptions: sel.selectedSubOptions || [],
    });
    return applyInflation(basePrice, inflationRate);
  };

  const selectedServices = services
    .filter((s) => selected[s.id]?.selected)
    .map((s) => {
      const sel = selected[s.id];
      const basePrice = calculateServicePrice(s, people, {
        hours: sel.hours || 0,
        selectedSubOptions: sel.selectedSubOptions || [],
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
        hours: sel.hours || 0,
        unit_count: getUnitCount(s, people, { hours: sel.hours || 0 }),
        hidden_in_pdf: s.hidden_in_pdf || false,
      };
    });

  const total = isEgresados ? cardValue * cardCount : selectedServices.reduce((sum, s) => sum + s.calculated_price, 0);

  const toggleService = (serviceId) => {
    setSelected((prev) => ({
      ...prev,
      [serviceId]: {
        selected: !prev[serviceId]?.selected,
        hours: prev[serviceId]?.hours || 0,
        selectedSubOptions: prev[serviceId]?.selectedSubOptions || [],
      },
    }));
  };

  const setHours = (serviceId, hours) => {
    setSelected((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], hours: Number(hours) || 0 },
    }));
  };

  const toggleSubOption = (serviceId, optName, maxSel) => {
    setSelected((prev) => {
      const cur = prev[serviceId] || { selected: true, hours: 0, selectedSubOptions: [] };
      let subs = cur.selectedSubOptions || [];
      if (subs.includes(optName)) {
        subs = subs.filter((n) => n !== optName);
      } else {
        if (subs.length >= maxSel) {
          subs = [subs[subs.length - 1], optName].filter(Boolean);
          if (maxSel === 1) subs = [optName];
        } else {
          subs = [...subs, optName];
        }
      }
      return { ...prev, [serviceId]: { ...cur, selected: true, selectedSubOptions: subs } };
    });
  };

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.event_date) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        number_of_people: people,
        selected_services: selectedServices,
        total_amount: total,
        inflation_applied: inflationRate,
      };
      if (isEdit) {
        await updateBudget.mutateAsync({ id: budget.id, data });
      } else {
        await createBudget.mutateAsync(data);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    const quintaName = settings?.quinta_name || 'Quinta La Juliana';
    const quintaPhone = settings?.quinta_phone || '';
    const doc = new jsPDF();

    // ===== Paleta pastel =====
    const sage = [168, 197, 160];       // verde salvia
    const sageDark = [122, 155, 114];
    const cream = [245, 240, 232];       // crema cálido
    const rose = [212, 165, 165];       // rosa empolvado
    const gold = [201, 176, 120];       // dorado suave
    const ink = [74, 69, 60];           // texto principal
    const muted = [140, 133, 120];

    // ===== Encabezado con imagen =====
    let headerHeight = 42;
    let headerImg = null;
    try {
      const loaded = await loadImageAsDataURL(HEADER_IMAGE_URL);
      headerImg = loaded.dataUrl;
      headerHeight = Math.min(210 / loaded.ratio, 50);
    } catch (e) {
      // fallback: banda de texto
    }

    if (headerImg) {
      doc.addImage(headerImg, 'JPEG', 0, 0, 210, headerHeight);
    } else {
      doc.setFillColor(...sage);
      doc.roundedRect(0, 0, 210, 38, 0, 0, 'F');
      doc.setFillColor(...rose);
      doc.roundedRect(0, 34, 210, 4, 0, 0, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text(quintaName, 105, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('Eventos & Celebraciones', 105, 26, { align: 'center' });
      headerHeight = 38;
    }

    // ===== Frase vendedora =====
    let y = headerHeight + 7;
    doc.setTextColor(...ink);
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('Creamos momentos inolvidables para tu evento especial', 105, y, { align: 'center' });

    // ===== Datos del cliente en tarjeta =====
    y += 5;
    doc.setFillColor(...cream);
    doc.roundedRect(14, y, 182, 20, 3, 3, 'F');
    doc.setTextColor(...ink);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    if (form.event_title) doc.text(form.event_title.toUpperCase(), 20, y + 6);
    doc.setFontSize(12);
    doc.text(form.client_name, 20, y + 13);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    let line2 = `${formatDate(form.event_date)}  ·  ${EVENT_TYPE_LABELS[form.event_type] || form.event_type}`;
    if (people > 0) line2 += `  ·  ${people} personas`;
    if (form.client_phone) line2 += `  ·  Tel: ${form.client_phone}`;
    doc.text(line2, 20, y + 18);
    y += 26;

    // ===== Cálculo por tarjetas (solo egresados) =====
    if (isEgresados && cardValue > 0) {
      doc.setFillColor(...rose);
      doc.roundedRect(14, y, 182, 16, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('VALOR POR TARJETA', 22, y + 6);
      doc.text('CANT. TARJETAS', 110, y + 6);
      doc.setFontSize(12);
      doc.text(formatCurrency(cardValue), 22, y + 13);
      doc.text(String(cardCount), 110, y + 13);
      doc.setFontSize(11);
      doc.text(`Subtotal: ${formatCurrency(cardValue * cardCount)}`, 196, y + 10, { align: 'right' });
      y += 22;
    }

    // ===== Servicios incluidos (dos columnas) =====
    const visibleServices = selectedServices.filter((s) => !s.hidden_in_pdf);

    doc.setTextColor(...sageDark);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Servicios incluidos', 14, y);
    doc.setDrawColor(...sage);
    doc.setLineWidth(0.8);
    doc.line(14, y + 2, 56, y + 2);
    y += 7;

    doc.setTextColor(...ink);
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');

    const half = Math.ceil(visibleServices.length / 2);
    const colLeft = visibleServices.slice(0, half);
    const colRight = visibleServices.slice(half);
    const colX = [20, 110];
    const colW = 82;
    const rowH = 5.2;
    const maxRows = Math.max(colLeft.length, colRight.length);

    for (let r = 0; r < maxRows; r++) {
      [colLeft, colRight].forEach((col, ci) => {
        if (r >= col.length) return;
        const svc = col[r];
        const cx = colX[ci];
        drawServiceIcon(doc, cx - 4, y + r * rowH - 3, svc.service_name, svc.category, sageDark);
        let label = svc.service_name;
        if (svc.measurement_type === 'mixed_menu' && svc.sub_option_counts) {
          const parts = Object.entries(svc.sub_option_counts)
            .filter(([_, count]) => Number(count) > 0)
            .map(([name, count]) => `${count} pers. ${name}`);
          if (parts.length > 0) {
            label += ` (${parts.join(' · ')})`;
          }
        } else if (svc.selected_sub_options && svc.selected_sub_options.length) {
          label += ` (${svc.selected_sub_options.join(', ')})`;
        }
        const lines = doc.splitTextToSize(label, colW);
        doc.text(lines, cx, y + r * rowH);
      });
    }
    y += maxRows * rowH + 3;

    // ===== Total destacado =====
    doc.setFillColor(...sage);
    doc.roundedRect(14, y, 182, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL', 22, y + 10);
    doc.text(formatCurrency(total), 196, y + 10, { align: 'right' });
    y += 20;

    // ===== Notas =====
    if (form.notes) {
      doc.setTextColor(...sageDark);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Notas', 14, y);
      doc.setDrawColor(...rose);
      doc.line(14, y + 2, 36, y + 2);
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...ink);
      const lines = doc.splitTextToSize(form.notes, 182);
      doc.text(lines, 14, y);
    }

    // ===== Frase de cierre =====
    doc.setTextColor(...gold);
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.text('¡Gracias por elegirnos para hacer realidad tu sueño!', 105, 276, { align: 'center' });

    // ===== Pie de página =====
    doc.setFillColor(...cream);
    doc.roundedRect(0, 282, 210, 15, 0, 0, 'F');
    doc.setTextColor(...muted);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    
    const issuerName = user?.full_name || user?.name || user?.email || quintaName;
    const issuerPhone = user?.phone || user?.client_phone || quintaPhone;
    const footerLeft = `Presupuestado por: ${issuerName}${issuerPhone ? ` · Cel: ${issuerPhone}` : ''}`;

    doc.text(footerLeft, 14, 290);
    doc.text(`Generado el ${formatDate(new Date().toISOString())}`, 196, 290, { align: 'right' });

    doc.save(`presupuesto_${form.client_name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nombre del evento</Label>
            <Input placeholder="Ej: Casamiento, Cumple de 15, Aniversario..." value={form.event_title} onChange={(e) => setForm((p) => ({ ...p, event_title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.client_phone} onChange={(e) => setForm((p) => ({ ...p, client_phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha del evento</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de evento</Label>
              <MobileSelect
                value={form.event_type}
                onValueChange={(v) => setForm((p) => ({ ...p, event_type: v }))}
                options={Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                placeholder="Tipo de evento"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantidad de personas</Label>
              <Input type="number" value={form.number_of_people} onChange={(e) => setForm((p) => ({ ...p, number_of_people: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <MobileSelect
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                options={[
                  { value: 'borrador', label: 'Borrador' },
                  { value: 'enviado', label: 'Enviado' },
                  { value: 'aceptado', label: 'Aceptado' },
                  { value: 'rechazado', label: 'Rechazado' },
                ]}
                placeholder="Estado"
              />
            </div>
          </div>

          {isEgresados && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-violet-700">Cálculo por tarjetas</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor por tarjeta</Label>
                  <Input type="number" value={form.card_value} onChange={(e) => setForm((p) => ({ ...p, card_value: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cantidad de tarjetas <span className="text-stone-400 font-normal text-xs">(a definir)</span></Label>
                  <Input type="number" placeholder="0" value={form.card_count} onChange={(e) => setForm((p) => ({ ...p, card_count: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-violet-600">
                Los servicios se incluyen sin costo adicional. {cardCount > 0
                  ? `Total = ${formatCurrency(cardValue)} × ${cardCount} = ${formatCurrency(cardValue * cardCount)}`
                  : `Total a determinar según tarjetas vendidas. Valor por tarjeta: ${formatCurrency(cardValue)}`}
              </p>
            </div>
          )}

          {inflationRate > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Se aplicará {inflationRate}% de inflación por evento en año futuro.
            </div>
          )}

          {/* Service selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Label>Servicios ({selectedServices.length} seleccionados)</Label>
                {isEgresados && (
                  <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-300">Incluidos sin costo</Badge>
                )}
              </div>
              <span className="text-lg font-bold text-stone-800">
                {isEgresados && cardCount === 0 ? 'A determinar' : formatCurrency(total)}
              </span>
            </div>
            <div className="border border-stone-200 rounded-lg max-h-[350px] overflow-y-auto divide-y divide-stone-100">
              {services.length === 0 ? (
                <p className="p-4 text-center text-sm text-stone-400">No hay servicios activos. Cárgalos en Ajustes.</p>
              ) : (
                services.map((svc) => {
                  const sel = selected[svc.id];
                  const isSelected = sel?.selected;
                  const price = getServicePrice(svc);
                  const unitCount = getUnitCount(svc, people, { hours: sel?.hours || 0 });

                  return (
                    <div key={svc.id} className="p-3 hover:bg-stone-50">
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
                            {svc.hidden_in_pdf && (
                              <Badge variant="outline" className="text-[10px] text-stone-400">Interno</Badge>
                            )}
                          </div>
                          <div className="flex gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{MEASUREMENT_LABELS[svc.measurement_type]}</Badge>
                            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[svc.category]}</Badge>
                            {unitCount > 0 && isSelected && (
                              <span className="text-[10px] text-stone-400">×{unitCount}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-stone-700 shrink-0 min-w-[80px] text-right">
                          {isSelected ? formatCurrency(price) : '—'}
                        </span>
                      </div>

                      {/* Sub-options */}
                      {isSelected && svc.measurement_type === 'sub_option' && (svc.sub_options || []).length > 0 && (
                        <div className="mt-2 ml-7 flex flex-wrap gap-2">
                          {svc.sub_options.map((opt) => {
                            const checked = (sel?.selectedSubOptions || []).includes(opt.name);
                            return (
                              <label
                                key={opt.name}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer text-xs transition-colors ${
                                  checked ? 'bg-violet-100 border-violet-300 text-violet-700' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSubOption(svc.id, opt.name, svc.max_sub_selections || 1)}
                                  className="w-3 h-3"
                                />
                                {opt.name}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Hours input for per_hour */}
                      {isSelected && svc.measurement_type === 'per_hour' && (
                        <div className="mt-2 ml-7">
                          <Label className="text-xs">Cantidad de horas</Label>
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

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="secondary" onClick={generatePDF} disabled={selectedServices.length === 0}>
            Generar PDF
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.client_name.trim() || !form.event_date}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
