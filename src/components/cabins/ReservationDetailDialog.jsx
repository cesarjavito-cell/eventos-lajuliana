import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, MessageCircle, FileDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect } from '@/components/ui/mobile-select';
import { useToast } from '@/components/ui/use-toast';
import {
  formatCurrency,
  formatDate,
  generateReceiptNumber,
  buildReceiptMessage,
  buildWhatsAppUrl,
} from '@/lib/pricing';
import { generateReceiptPdf } from '@/lib/receiptPdf';

export default function ReservationDetailDialog({ reservation, open, onOpenChange, onUpdated }) {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, date: new Date().toISOString().slice(0, 10), payment_method: 'efectivo' });

  const loadData = useCallback(async () => {
    if (!reservation) return;
    const pays = await base44.entities.CabinPayment.filter({ reservation_id: reservation.id });
    setPayments(pays || []);
  }, [reservation]);

  useEffect(() => {
    if (open && reservation) loadData();
  }, [open, reservation, loadData]);

  if (!reservation) return null;

  const balance = (reservation.total_amount || 0) - (reservation.paid_amount || 0);
  const pricePerPerson = reservation.price_per_person || reservation.price_per_night || 0;

  const handleAddPayment = async () => {
    const amount = Number(payForm.amount) || 0;
    if (amount <= 0) return;
    const receiptNumber = generateReceiptNumber();
    await base44.entities.CabinPayment.create({
      reservation_id: reservation.id,
      amount,
      date: payForm.date,
      payer_name: reservation.client_name,
      payment_method: payForm.payment_method,
      receipt_number: receiptNumber,
    });
    const newPaid = (reservation.paid_amount || 0) + amount;
    await base44.entities.CabinReservation.update(reservation.id, { paid_amount: newPaid });
    onUpdated({ ...reservation, paid_amount: newPaid });
    setShowPayForm(false);
    setPayForm({ amount: 0, date: new Date().toISOString().slice(0, 10), payment_method: 'efectivo' });
    toast({ title: 'Pago registrado' });
    loadData();
  };

  const handleSendReceipt = (payment) => {
    const msg = buildReceiptMessage({
      receiptNumber: payment.receipt_number,
      date: formatDate(payment.date),
      payerName: reservation.client_name,
      concept: `Cabaña ${reservation.cabin_number} - ${reservation.cabin_name} (${reservation.number_of_people || '-'} pers.)`,
      amount: payment.amount,
      method: payment.payment_method,
    });
    const url = buildWhatsAppUrl(reservation.client_phone, msg);
    window.open(url, '_blank');
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      await generateReceiptPdf({
        receiptNumber: payment.receipt_number,
        date: payment.date,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        payerName: reservation.client_name,
        eventDate: reservation.check_in,
        eventTitle: `Cabaña ${reservation.cabin_number} - ${reservation.cabin_name}`,
      });
    } catch (e) {
      toast({ title: 'Error al generar el recibo', variant: 'destructive' });
    }
  };

  const handleDeletePayment = async (payment) => {
    if (!confirm('¿Eliminar este pago?')) return;
    await base44.entities.CabinPayment.delete(payment.id);
    const newPaid = Math.max(0, (reservation.paid_amount || 0) - payment.amount);
    await base44.entities.CabinReservation.update(reservation.id, { paid_amount: newPaid });
    onUpdated({ ...reservation, paid_amount: newPaid });
    loadData();
    toast({ title: 'Pago eliminado' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reserva - {reservation.cabin_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-2">
          <div className="bg-stone-50 rounded-lg p-3">
            <p className="text-xs text-stone-400">Total</p>
            <p className="font-semibold text-stone-800 text-sm">{formatCurrency(reservation.total_amount)}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600">Pagado</p>
            <p className="font-semibold text-emerald-700 text-sm">{formatCurrency(reservation.paid_amount)}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-600">Saldo</p>
            <p className="font-semibold text-amber-700 text-sm">{formatCurrency(balance)}</p>
          </div>
          <div className="bg-stone-50 rounded-lg p-3">
            <p className="text-xs text-stone-400">Personas</p>
            <p className="font-semibold text-stone-800 text-sm">{reservation.number_of_people || '-'}</p>
          </div>
          <div className="bg-stone-50 rounded-lg p-3">
            <p className="text-xs text-stone-400">Noches</p>
            <p className="font-semibold text-stone-800 text-sm">{reservation.nights || 0}</p>
          </div>
        </div>

        <div className="bg-stone-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-stone-500">Cliente:</span><span className="font-medium text-stone-800">{reservation.client_name}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Check-in:</span><span className="font-medium text-stone-800">{formatDate(reservation.check_in)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Check-out:</span><span className="font-medium text-stone-800">{formatDate(reservation.check_out)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Personas:</span><span className="font-medium text-stone-800">{reservation.number_of_people || '-'}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Precio por persona:</span><span className="font-medium text-stone-800">{formatCurrency(pricePerPerson)}</span></div>
        </div>

        <div className="flex justify-between items-center mt-2">
          <h4 className="text-sm font-semibold text-stone-700">Pagos</h4>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" onClick={() => setShowPayForm(!showPayForm)}>
            <Plus className="w-4 h-4 mr-1" /> Registrar pago
          </Button>
        </div>

        {showPayForm && (
          <div className="bg-stone-50 rounded-lg p-3 space-y-2 border border-stone-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Monto</Label>
                <Input type="number" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Método</Label>
                <MobileSelect
                  value={payForm.payment_method}
                  onValueChange={(v) => setPayForm((p) => ({ ...p, payment_method: v }))}
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'tarjeta_debito', label: 'Tarjeta débito' },
                    { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
                  ]}
                  placeholder="Método"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddPayment}>Registrar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowPayForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-white border border-stone-200 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-stone-800">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-stone-500">{formatDate(p.date)} · {p.payment_method}</p>
                <p className="text-xs text-stone-400">Recibo: {p.receipt_number}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleSendReceipt(p)}>
                  <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDownloadReceipt(p)}>
                  <FileDown className="w-4 h-4 mr-1" /> Recibo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeletePayment(p)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {payments.length === 0 && <p className="text-center text-sm text-stone-400 py-4">No hay pagos registrados.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
