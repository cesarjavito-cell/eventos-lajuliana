import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect } from '@/components/ui/mobile-select';
import { formatCurrency, formatDate, EVENT_TYPE_LABELS } from '@/lib/pricing';

const PAYMENT_METHODS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta_debito: 'Tarjeta de débito',
  tarjeta_credito: 'Tarjeta de crédito',
  otro: 'Otro',
};

export default function RegisterEventDialog({ budget, open, onOpenChange, onRegistered }) {
  const [anticipo, setAnticipo] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    payment_method: 'efectivo',
    payer_name: '',
    receipt_number: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (budget && open) {
      setAnticipo({
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        payment_method: 'efectivo',
        payer_name: budget.client_name || '',
        receipt_number: '',
      });
    }
  }, [budget, open]);

  if (!budget) return null;

  const total = budget.total_amount || 0;
  const anticipoAmount = Number(anticipo.amount) || 0;
  const saldo = total - anticipoAmount;

  const handleRegister = async () => {
    setSaving(true);
    try {
      const eventData = {
        title: budget.event_title || budget.client_name || 'Evento',
        type: budget.event_type || 'general',
        start_date: budget.event_date,
        end_date: budget.event_date,
        client_name: budget.client_name || '',
        client_phone: budget.client_phone || '',
        number_of_people: budget.number_of_people || 0,
        card_value: budget.card_value || 0,
        selected_services: budget.selected_services || [],
        total_amount: total,
        paid_amount: anticipoAmount,
        status: anticipoAmount > 0 ? 'confirmado' : 'pendiente',
        description: budget.notes || '',
        budget_id: budget.id,
      };

      const event = await base44.entities.Event.create(eventData);

      if (anticipoAmount > 0) {
        await base44.entities.Payment.create({
          event_id: event.id,
          event_title: eventData.title,
          amount: anticipoAmount,
          date: anticipo.date,
          payer_name: anticipo.payer_name || budget.client_name || '',
          payer_phone: budget.client_phone || '',
          payment_method: anticipo.payment_method,
          receipt_number: anticipo.receipt_number || '',
          notes: 'Anticipo / Seña',
        });
      }

      await base44.entities.Budget.update(budget.id, { status: 'aceptado' });

      onRegistered();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" /> Registrar en Agenda
          </DialogTitle>
          <DialogDescription>
            Convierte este presupuesto en un evento del calendario y registra el anticipo.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-stone-50 rounded-lg p-3 space-y-1 text-sm">
          <div className="font-medium text-stone-800">{budget.event_title || budget.client_name}</div>
          <div className="text-stone-500">{formatDate(budget.event_date)} · {EVENT_TYPE_LABELS[budget.event_type] || budget.event_type}</div>
          <div className="text-stone-500">{budget.client_name} · {budget.number_of_people} personas</div>
          <div className="flex justify-between pt-1 border-t border-stone-200 mt-2">
            <span className="text-stone-600">Total del presupuesto</span>
            <span className="font-semibold text-stone-800">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-stone-700">Anticipo / Seña (opcional)</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto del anticipo</Label>
              <Input type="number" value={anticipo.amount} onChange={(e) => setAnticipo((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de pago</Label>
              <Input type="date" value={anticipo.date} onChange={(e) => setAnticipo((p) => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <MobileSelect
                value={anticipo.payment_method}
                onValueChange={(v) => setAnticipo((p) => ({ ...p, payment_method: v }))}
                options={Object.entries(PAYMENT_METHODS).map(([k, v]) => ({ value: k, label: v }))}
                placeholder="Método de pago"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pagador</Label>
              <Input value={anticipo.payer_name} onChange={(e) => setAnticipo((p) => ({ ...p, payer_name: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>N° de recibo (opcional)</Label>
            <Input value={anticipo.receipt_number} onChange={(e) => setAnticipo((p) => ({ ...p, receipt_number: e.target.value }))} />
          </div>

          {anticipoAmount > 0 && (
            <div className="flex justify-between bg-amber-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-amber-700">Saldo pendiente</span>
              <span className="font-semibold text-amber-800">{formatCurrency(saldo)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleRegister} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
