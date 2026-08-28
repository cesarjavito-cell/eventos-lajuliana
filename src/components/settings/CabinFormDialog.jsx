import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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

export default function CabinFormDialog({ cabin, open, onOpenChange, onSaved }) {
  const isEdit = !!cabin;
  const [form, setForm] = useState({
    name: '',
    number: 1,
    description: '',
    capacity: 2,
    price_per_person: 0,
    amenities: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cabin) {
      setForm({
        name: cabin.name || '',
        number: cabin.number || 1,
        description: cabin.description || '',
        capacity: cabin.capacity || 2,
        price_per_person: cabin.price_per_person || cabin.base_price_per_night || 0,
        amenities: cabin.amenities || '',
        active: cabin.active !== false,
      });
    } else {
      setForm({ name: '', number: 1, description: '', capacity: 2, price_per_person: 0, amenities: '', active: true });
    }
  }, [cabin, open]);

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        number: Number(form.number) || 1,
        capacity: Number(form.capacity) || 2,
        price_per_person: Number(form.price_per_person) || 0,
      };
      if (isEdit) {
        await base44.entities.Cabin.update(cabin.id, data);
      } else {
        await base44.entities.Cabin.create(data);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cabaña' : 'Nueva cabaña'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Ej: Cabaña Los Aromos" />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input type="number" value={form.number} onChange={(e) => handleChange('number', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Capacidad (personas)</Label>
              <Input type="number" value={form.capacity} onChange={(e) => handleChange('capacity', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Precio por persona ($/noche)</Label>
              <Input type="number" value={form.price_per_person} onChange={(e) => handleChange('price_per_person', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Comodidades</Label>
            <Input value={form.amenities} onChange={(e) => handleChange('amenities', e.target.value)} placeholder="Ej: WiFi, A/C, parrilla" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.active} onCheckedChange={(v) => handleChange('active', v)} />
            <Label>Disponible para reservas</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
