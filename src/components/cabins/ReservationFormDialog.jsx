import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCreateReservation, useUpdateReservation } from '@/hooks/useEntityQueries';
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
import { formatCurrency } from '@/lib/pricing';
import { differenceInDays, parseISO } from 'date-fns';

export default function ReservationFormDialog({ reservation, cabins, open, onOpenChange, onSaved }) {
  const isEdit = !!reservation;
  const [form, setForm] = useState({
    cabin_id: '',
    client_name: '',
    client_phone: '',
    check_in: '',
    check_out: '',
    number_of_people: 1,
    price_per_person: 0,
    total_amount: 0,
    status: 'pendiente',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation();

  useEffect(() => {
    if (reservation) {
      setForm({
        cabin_id: reservation.cabin_id || '',
        client_name: reservation.client_name || '',
        client_phone: reservation.client_phone || '',
        check_in: reservation.check_in || '',
        check_out: reservation.check_out || '',
        number_of_people: reservation.number_of_people || 1,
        price_per_person: reservation.price_per_person || reservation.price_per_night || 0,
        total_amount: reservation.total_amount || 0,
        status: reservation.status || 'pendiente',
        notes: reservation.notes || '',
      });
    } else {
      setForm({
        cabin_id: '',
        client_name: '',
        client_phone: '',
        check_in: '',
        check_out: '',
        number_of_people: 1,
        price_per_person: 0,
        total_amount: 0,
        status: 'pendiente',
        notes: '',
      });
    }
  }, [reservation, open]);

  const selectedCabin = cabins.find((c) => c.id === form.cabin_id);
  const nights = form.check_in && form.check_out
    ? Math.max(1, differenceInDays(parseISO(form.check_out), parseISO(form.check_in)))
    : 0;
  const people = Number(form.number_of_people) || 0;
  const pricePerPerson = Number(form.price_per_person) || 0;
  const suggestedTotal = people * pricePerPerson * nights;
  const manualTotal = Number(form.total_amount) || 0;
  const discount = Math.max(0, suggestedTotal - manualTotal);

  const handleChange = (field, value) => {
    setForm((p) => {
      const next = { ...p, [field]: value };
      if (field === 'cabin_id') {
        const cabin = cabins.find((c) => c.id === value);
        if (cabin) {
          next.price_per_person = cabin.price_per_person || cabin.base_price_per_night || 0;
        }
      }
      // Recalcular total cuando cambian los campos que definen el cálculo
      if (['cabin_id', 'number_of_people', 'price_per_person', 'check_in', 'check_out'].includes(field)) {
        const ppl = Number(next.number_of_people) || 0;
        const price = Number(next.price_per_person) || 0;
        const n = next.check_in && next.check_out
          ? Math.max(1, differenceInDays(parseISO(next.check_out), parseISO(next.check_in)))
          : 0;
        next.total_amount = ppl * price * n;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.cabin_id || !form.client_name.trim() || !form.check_in || !form.check_out) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        cabin_name: selectedCabin?.name || '',
        cabin_number: selectedCabin?.number || 0,
        nights,
        number_of_people: Number(form.number_of_people) || 1,
        price_per_person: Number(form.price_per_person) || 0,
        total_amount: Number(form.total_amount) || 0,
        paid_amount: isEdit ? reservation.paid_amount : 0,
      };
      if (isEdit) {
        await updateReservation.mutateAsync({ id: reservation.id, data });
      } else {
        await createReservation.mutateAsync(data);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar reserva' : 'Nueva reserva de cabaña'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Cabaña</Label>
            <MobileSelect
              value={form.cabin_id}
              onValueChange={(v) => handleChange('cabin_id', v)}
              options={cabins.map((c) => ({
                value: c.id,
                label: `${c.name} (N° ${c.number}) - Cap. ${c.capacity} - ${formatCurrency(c.price_per_person || c.base_price_per_night)}/pers`,
              }))}
              placeholder="Seleccionar cabaña..."
            />
            {selectedCabin && (
              <p className="text-xs text-stone-500">
                Capacidad máxima: {selectedCabin.capacity} personas
                {people > selectedCabin.capacity && (
                  <span className="text-amber-600 font-medium ml-1">⚠ Supera la capacidad</span>
                )}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={form.client_name} onChange={(e) => handleChange('client_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.client_phone} onChange={(e) => handleChange('client_phone', e.target.value)} placeholder="Ej: 3511234567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check-in</Label>
              <Input type="date" value={form.check_in} onChange={(e) => handleChange('check_in', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out</Label>
              <Input type="date" value={form.check_out} onChange={(e) => handleChange('check_out', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantidad de personas</Label>
              <Input type="number" min="1" value={form.number_of_people} onChange={(e) => handleChange('number_of_people', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Precio por persona ($/noche)</Label>
              <Input type="number" value={form.price_per_person} onChange={(e) => handleChange('price_per_person', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <MobileSelect
              value={form.status}
              onValueChange={(v) => handleChange('status', v)}
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'confirmada', label: 'Confirmada' },
                { value: 'activa', label: 'Activa' },
                { value: 'completada', label: 'Completada' },
                { value: 'cancelada', label: 'Cancelada' },
              ]}
              placeholder="Estado"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={2} />
          </div>
          {nights > 0 && (
            <div className="bg-stone-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">
                  Cálculo: {people} pers × {formatCurrency(pricePerPerson)} × {nights} noche(s)
                </span>
                <span className="font-semibold text-stone-700">{formatCurrency(suggestedTotal)}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 space-y-1.5">
                <Label>Total a cobrar ($)</Label>
                <Input
                  type="number"
                  value={form.total_amount}
                  onChange={(e) => handleChange('total_amount', e.target.value)}
                  className="text-lg font-bold"
                />
                {discount > 0 && suggestedTotal > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Descuento aplicado: {formatCurrency(discount)} ({Math.round((discount / suggestedTotal) * 100)}%)
                  </p>
                )}
                <p className="text-xs text-stone-400">
                  Ajustá el monto para aplicar descuentos por contingente grande o estadía prolongada.
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.cabin_id || !form.client_name.trim() || !form.check_in || !form.check_out}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
