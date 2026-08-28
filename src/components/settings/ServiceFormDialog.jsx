import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { MobileSelect } from '@/components/ui/mobile-select';
import { useToast } from '@/components/ui/use-toast';
import { MEASUREMENT_LABELS, CATEGORY_LABELS } from '@/lib/pricing';

export default function ServiceFormDialog({ service, open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!service;
  const [form, setForm] = useState({
    name: '', description: '', category: 'otros', measurement_type: 'fixed',
    base_price: 0, people_per_unit: 0, tier_threshold: 0, tier_price_after: 0,
    average_percentage: 100, grams_per_person: 0, per_kg_price: 0,
    small_cake_per_kg_price: 0, maqueta_price: 0, large_cake_threshold: 10,
    sub_options: [], sub_option_pricing: 'fixed', max_sub_selections: 1,
    hidden_in_pdf: false, auto_include: false, active: true, display_order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || '',
        description: service.description || '',
        category: service.category || 'otros',
        measurement_type: service.measurement_type || 'fixed',
        base_price: service.base_price || 0,
        people_per_unit: service.people_per_unit || 0,
        tier_threshold: service.tier_threshold || 0,
        tier_price_after: service.tier_price_after || 0,
        average_percentage: service.average_percentage || 100,
        grams_per_person: service.grams_per_person || 0,
        per_kg_price: service.per_kg_price || 0,
        small_cake_per_kg_price: service.small_cake_per_kg_price || 0,
        maqueta_price: service.maqueta_price || 0,
        large_cake_threshold: service.large_cake_threshold || 10,
        sub_options: Array.isArray(service.sub_options) ? service.sub_options : [],
        sub_option_pricing: service.sub_option_pricing || 'fixed',
        max_sub_selections: service.max_sub_selections || 1,
        hidden_in_pdf: service.hidden_in_pdf || false,
        auto_include: service.auto_include || false,
        active: service.active !== false,
        display_order: service.display_order || 0,
      });
    } else {
      setForm({
        name: '', description: '', category: 'otros', measurement_type: 'fixed',
        base_price: 0, people_per_unit: 0, tier_threshold: 0, tier_price_after: 0,
        average_percentage: 100, grams_per_person: 0, per_kg_price: 0,
        small_cake_per_kg_price: 0, maqueta_price: 0, large_cake_threshold: 10,
        sub_options: [], sub_option_pricing: 'fixed', max_sub_selections: 1,
        hidden_in_pdf: false, auto_include: false, active: true, display_order: 0,
      });
    }
  }, [service, open]);

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const addSubOption = () =>
    setForm((p) => ({ ...p, sub_options: [...(p.sub_options || []), { name: '', price: 0 }] }));

  const updateSubOption = (idx, field, value) =>
    setForm((p) => ({
      ...p,
      sub_options: (p.sub_options || []).map((o, i) => (i === idx ? { ...o, [field]: value } : o)),
    }));

  const removeSubOption = (idx) =>
    setForm((p) => ({ ...p, sub_options: (p.sub_options || []).filter((_, i) => i !== idx) }));

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!form.name || !form.name.trim()) {
      toast({ title: 'Campo requerido', description: 'Ingresa el nombre del servicio', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const cleanSubOptions = (form.sub_options || [])
        .filter((o) => o && o.name && o.name.trim() !== '')
        .map((o) => ({
          name: o.name.trim(),
          price: Number(o.price) || 0,
        }));

      const data = {
        name: form.name.trim(),
        description: form.description || '',
        category: form.category || 'otros',
        measurement_type: form.measurement_type || 'fixed',
        base_price: Number(form.base_price) || 0,
        people_per_unit: Number(form.people_per_unit) || 0,
        tier_threshold: Number(form.tier_threshold) || 0,
        tier_price_after: Number(form.tier_price_after) || 0,
        average_percentage: Number(form.average_percentage) || 100,
        grams_per_person: Number(form.grams_per_person) || 0,
        per_kg_price: Number(form.per_kg_price) || 0,
        small_cake_per_kg_price: Number(form.small_cake_per_kg_price) || 0,
        maqueta_price: Number(form.maqueta_price) || 0,
        large_cake_threshold: Number(form.large_cake_threshold) || 10,
        max_sub_selections: Number(form.max_sub_selections) || 1,
        sub_option_pricing: form.measurement_type === 'mixed_menu' ? 'per_person' : (form.sub_option_pricing || 'fixed'),
        display_order: Number(form.display_order) || 0,
        hidden_in_pdf: !!form.hidden_in_pdf,
        auto_include: !!form.auto_include,
        active: form.active !== false,
        sub_options: cleanSubOptions,
      };

      if (isEdit && service?.id) {
        await base44.entities.Service.update(service.id, data);
        toast({ title: 'Servicio actualizado correctamente' });
      } else {
        await base44.entities.Service.create(data);
        toast({ title: 'Servicio guardado exitosamente' });
      }

      onOpenChange(false);
      if (onSaved) {
        setTimeout(() => {
          onSaved();
        }, 50);
      }
    } catch (err) {
      console.error('Error al guardar servicio:', err);
      toast({ title: 'Error al guardar servicio', description: err?.message || 'Comprueba los datos ingresados', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const mt = form.measurement_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre del Servicio</Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Catering Menú Mixto o Vajilla Completa"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Descripción opcional..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <MobileSelect
                  value={form.category}
                  onValueChange={(v) => set('category', v)}
                  options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  placeholder="Categoría"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Esquema de medición</Label>
                <MobileSelect
                  value={form.measurement_type}
                  onValueChange={(v) => set('measurement_type', v)}
                  options={Object.entries(MEASUREMENT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  placeholder="Esquema de medición"
                />
              </div>
            </div>

            {/* Conditional fields by measurement type */}
            {(mt === 'fixed' || mt === 'per_person' || mt === 'per_group' || mt === 'step_count' || mt === 'per_hour') && (
              <div className="space-y-1.5">
                <Label>{mt === 'per_hour' ? 'Precio por hora ($)' : mt === 'per_group' ? 'Precio por unidad ($)' : mt === 'step_count' ? 'Precio por unidad ($)' : 'Precio base ($)'}</Label>
                <Input type="number" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />
              </div>
            )}

            {mt === 'per_group' && (
              <div className="space-y-1.5">
                <Label>Personas por unidad</Label>
                <Input type="number" value={form.people_per_unit} onChange={(e) => set('people_per_unit', e.target.value)} />
                <p className="text-xs text-stone-400">Ej: Mozos = 20 (1 cada 20 personas), Hielo = 10 (1 bolsa cada 10).</p>
              </div>
            )}

            {mt === 'step_count' && (
              <div className="space-y-1.5">
                <Label>Límite de personas (hasta = 1 unidad, más = 2)</Label>
                <Input type="number" value={form.tier_threshold} onChange={(e) => set('tier_threshold', e.target.value)} />
                <p className="text-xs text-stone-400">Ej: Parrillero = 99 (hasta 99 = 1, más de 99 = 2).</p>
              </div>
            )}

            {mt === 'average_person' && (
              <>
                <div className="space-y-1.5">
                  <Label>Precio base ($)</Label>
                  <Input type="number" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Porcentaje promedio (%)</Label>
                  <Input type="number" value={form.average_percentage} onChange={(e) => set('average_percentage', e.target.value)} />
                </div>
              </>
            )}

            {mt === 'tiered' && (
              <>
                <div className="space-y-1.5">
                  <Label>Precio base ($)</Label>
                  <Input type="number" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Límite de personas</Label>
                    <Input type="number" value={form.tier_threshold} onChange={(e) => set('tier_threshold', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Precio por persona adicional</Label>
                    <Input type="number" value={form.tier_price_after} onChange={(e) => set('tier_price_after', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {mt === 'torta' && (
              <div className="space-y-3 rounded-lg bg-amber-50 p-3 border border-amber-200">
                <div className="space-y-1.5">
                  <Label>Gramos por persona</Label>
                  <Input type="number" value={form.grams_per_person} onChange={(e) => set('grams_per_person', e.target.value)} />
                  <p className="text-xs text-stone-400">Ej: 100 grs por persona.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Precio por kg (≥10kg, maqueta incluida)</Label>
                    <Input type="number" value={form.per_kg_price} onChange={(e) => set('per_kg_price', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Precio por kg (&lt;10kg)</Label>
                    <Input type="number" value={form.small_cake_per_kg_price} onChange={(e) => set('small_cake_per_kg_price', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Precio maqueta (solo &lt;10kg)</Label>
                    <Input type="number" value={form.maqueta_price} onChange={(e) => set('maqueta_price', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Límite torta grande (kg)</Label>
                    <Input type="number" value={form.large_cake_threshold} onChange={(e) => set('large_cake_threshold', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Sub-opciones y Menú / Vajilla Mixta */}
            {(mt === 'sub_option' || mt === 'mixed_menu') && (
              <div className="space-y-3 rounded-lg bg-violet-50 p-3 border border-violet-200">
                {mt === 'sub_option' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Tipo de precio</Label>
                      <MobileSelect
                        value={form.sub_option_pricing}
                        onValueChange={(v) => set('sub_option_pricing', v)}
                        options={[
                          { value: 'fixed', label: 'Precio fijo' },
                          { value: 'per_person', label: 'Por persona' },
                        ]}
                        placeholder="Tipo de precio"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Máx. selecciones</Label>
                      <Input type="number" value={form.max_sub_selections} onChange={(e) => set('max_sub_selections', e.target.value)} />
                    </div>
                  </div>
                )}

                {mt === 'mixed_menu' && (
                  <p className="text-xs text-violet-700 font-medium">
                    💡 Agrega cada opción de menú o vajilla con su precio por persona. En cada presupuesto podrás desglosar la cantidad de invitados para cada opción.
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-stone-700">
                      {mt === 'mixed_menu' ? 'Opciones del Menú / Vajilla Mixta' : 'Sub-opciones'}
                    </Label>
                    <Button type="button" size="sm" variant="outline" onClick={addSubOption}>
                      <Plus className="w-3 h-3 mr-1" /> Agregar Opción
                    </Button>
                  </div>
                  {(form.sub_options || []).map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-[11px]">Nombre Opción</Label>
                        <Input placeholder="Ej: Galeto Deshuesado o Vajilla Completa" value={opt.name} onChange={(e) => updateSubOption(idx, 'name', e.target.value)} />
                      </div>
                      <div className="w-36">
                        <Label className="text-[11px]">Precio / pers ($)</Label>
                        <Input type="number" placeholder="Precio" value={opt.price} onChange={(e) => updateSubOption(idx, 'price', e.target.value)} />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-red-500" onClick={() => removeSubOption(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(form.sub_options || []).length === 0 && (
                    <p className="text-xs text-stone-400 text-center py-2">No hay opciones cargadas todavía. Haz clic en "+ Agregar Opción".</p>
                  )}
                </div>
              </div>
            )}

            {/* Flags */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <Switch checked={form.hidden_in_pdf} onCheckedChange={(v) => set('hidden_in_pdf', v)} />
                <Label className="text-sm">Oculto en PDF cliente</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.auto_include} onCheckedChange={(v) => set('auto_include', v)} />
                <Label className="text-sm">Auto-incluir</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => set('active', v)} />
                <Label className="text-sm">Activo</Label>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Orden de vista</Label>
                <Input type="number" value={form.display_order} onChange={(e) => set('display_order', e.target.value)} className="h-8" />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Servicio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
