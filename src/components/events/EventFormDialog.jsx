import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEntityQueries';
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
import { MobileSelect } from '@/components/ui/mobile-select';
import { EVENT_TYPE_LABELS } from '@/lib/pricing';
import ServiceSelector from '@/components/shared/ServiceSelector';

export default function EventFormDialog({ event, open, onOpenChange, onSaved }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: '',
    type: 'general',
    start_date: '',
    end_date: '',
    client_name: '',
    client_phone: '',
    number_of_people: 0,
    card_value: 0,
    total_amount: 0,
    paid_amount: 0,
    status: 'pendiente',
    description: '',
  });
  const [selectedServices, setSelectedServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title || '',
        type: event.type || 'general',
        start_date: event.start_date || '',
        end_date: event.end_date || '',
        client_name: event.client_name || '',
        client_phone: event.client_phone || '',
        number_of_people: event.number_of_people || 0,
        card_value: event.card_value || 0,
        total_amount: event.total_amount || 0,
        paid_amount: event.paid_amount || 0,
        status: event.status || 'pendiente',
        description: event.description || '',
      });
      setSelectedServices(event.selected_services || []);
    } else {
      setForm({
        title: '', type: 'general', start_date: '', end_date: '',
        client_name: '', client_phone: '', number_of_people: 0, card_value: 0,
        total_amount: 0, paid_amount: 0, status: 'pendiente', description: '',
      });
      setSelectedServices([]);
    }
  }, [event, open]);

  const isEgresados = form.type === 'egresados';
  const people = Number(form.number_of_people) || 0;

  const handleServicesChange = (services, svcTotal) => {
    setSelectedServices(services);
    if (!isEgresados) {
      setForm((p) => ({ ...p, total_amount: svcTotal }));
    }
  };

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.start_date) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        number_of_people: Number(form.number_of_people) || 0,
        card_value: Number(form.card_value) || 0,
        total_amount: Number(form.total_amount) || 0,
        paid_amount: Number(form.paid_amount) || 0,
        selected_services: selectedServices,
        end_date: form.end_date || form.start_date,
      };
      if (isEdit) {
        await updateEvent.mutateAsync({ id: event.id, data });
      } else {
        await createEvent.mutateAsync(data);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Ej: Casamiento Pérez - González" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de evento</Label>
              <MobileSelect
                value={form.type}
                onValueChange={(v) => handleChange('type', v)}
                options={Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                placeholder="Tipo de evento"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <MobileSelect
                value={form.status}
                onValueChange={(v) => handleChange('status', v)}
                options={[
                  { value: 'pendiente', label: 'Pendiente' },
                  { value: 'confirmado', label: 'Confirmado' },
                  { value: 'en_progreso', label: 'En progreso' },
                  { value: 'completado', label: 'Completado' },
                  { value: 'cancelado', label: 'Cancelado' },
                ]}
                placeholder="Estado"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha inicio</Label>
              <Input type="date" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha fin (opcional)</Label>
              <Input type="date" value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente / Responsable</Label>
              <Input value={form.client_name} onChange={(e) => handleChange('client_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.client_phone} onChange={(e) => handleChange('client_phone', e.target.value)} placeholder="Ej: 3511234567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isEgresados ? 'Precio de la tarjeta' : 'Cantidad de personas'}</Label>
              {isEgresados ? (
                <Input type="number" value={form.card_value} onChange={(e) => handleChange('card_value', e.target.value)} placeholder="Ej: 15000" />
              ) : (
                <Input type="number" value={form.number_of_people} onChange={(e) => handleChange('number_of_people', e.target.value)} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Monto total ($)</Label>
              <Input type="number" value={form.total_amount} onChange={(e) => handleChange('total_amount', e.target.value)} />
            </div>
          </div>

          <ServiceSelector
            key={event?.id || 'new'}
            people={people}
            eventDate={form.start_date}
            initialServices={event?.selected_services || []}
            onChange={handleServicesChange}
            hideTotal={isEgresados}
          />

          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.start_date}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
