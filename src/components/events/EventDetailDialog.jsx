import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, MessageCircle, FileDown, FileText, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MobileSelect } from '@/components/ui/mobile-select';
import { useToast } from '@/components/ui/use-toast';
import {
  formatCurrency,
  formatDate,
  generateReceiptNumber,
  buildReceiptMessage,
  buildWhatsAppUrl,
  EVENT_TYPE_LABELS,
} from '@/lib/pricing';
import { generateReceiptPdf } from '@/lib/receiptPdf';
import { generateContractPdf } from '@/lib/contractPdf';
import EgresadosEventDetail from './EgresadosEventDetail';
import ContractedServices from './ContractedServices';
import ContractFormDialog from './ContractFormDialog';

export default function EventDetailDialog({ event, open, onOpenChange, onEventUpdated, onDeleteEvent, settings }) {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, date: new Date().toISOString().slice(0, 10), payer_name: '', payment_method: 'efectivo' });
  const [budgetServices, setBudgetServices] = useState([]);
  const [contractModalOpen, setContractModalOpen] = useState(false);

  const isEgresados = event?.type === 'egresados';

  const loadData = useCallback(async () => {
    if (!event) return;
    setLoading(true);
    try {
      const pays = await base44.entities.Payment.filter({ event_id: event.id });
      setPayments(pays || []);
    } finally {
      setLoading(false);
    }
  }, [event]);

  useEffect(() => {
    if (open && event && !isEgresados) {
      loadData();
      setPayForm((p) => ({ ...p, payer_name: event.client_name || '' }));
    }
  }, [open, event, loadData, isEgresados]);

  useEffect(() => {
    if (event && event.budget_id && (!event.selected_services || event.selected_services.length === 0)) {
      base44.entities.Budget.get(event.budget_id)
        .then((budget) => setBudgetServices(budget?.selected_services || []))
        .catch(() => setBudgetServices([]));
    } else {
      setBudgetServices([]);
    }
  }, [event]);

  const balance = (event?.total_amount || 0) - (event?.paid_amount || 0);
  const servicesToShow = event?.selected_services?.length > 0 ? event.selected_services : budgetServices;

  const handleSaveContract = async (contractData) => {
    await base44.entities.Event.update(event.id, { contract_data: contractData });
    onEventUpdated({ ...event, contract_data: contractData });
  };

  const handleQuickDownloadContractPdf = async () => {
    if (!event.contract_data) {
      setContractModalOpen(true);
      return;
    }
    try {
      await generateContractPdf({ event, contractData: event.contract_data, servicesToShow, settings });
      toast({ title: 'Contrato PDF generado con éxito' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al generar el PDF del contrato', variant: 'destructive' });
    }
  };

  const handleAddPayment = async () => {
    const amount = Number(payForm.amount) || 0;
    if (amount <= 0) return;
    const receiptNumber = generateReceiptNumber();
    await base44.entities.Payment.create({
      event_id: event.id,
      event_title: event.title,
      amount,
      date: payForm.date,
      payer_name: payForm.payer_name,
      payment_method: payForm.payment_method,
      receipt_number: receiptNumber,
    });
    const newPaid = (event.paid_amount || 0) + amount;
    await base44.entities.Event.update(event.id, { paid_amount: newPaid });
    onEventUpdated({ ...event, paid_amount: newPaid });
    setShowPayForm(false);
    setPayForm({ amount: 0, date: new Date().toISOString().slice(0, 10), payer_name: event.client_name || '', payment_method: 'efectivo' });
    toast({ title: 'Pago registrado' });
    loadData();
  };

  const handleSendReceipt = (payment) => {
    const msg = buildReceiptMessage({
      receiptNumber: payment.receipt_number,
      date: formatDate(payment.date),
      payerName: payment.payer_name || event.client_name,
      concept: event.title,
      amount: payment.amount,
      method: payment.payment_method,
    });
    const url = buildWhatsAppUrl(event.client_phone, msg);
    window.open(url, '_blank');
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      await generateReceiptPdf({
        receiptNumber: payment.receipt_number,
        date: payment.date,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        payerName: payment.payer_name || event.client_name,
        eventDate: event.start_date,
        eventTitle: event.title,
      });
    } catch (e) {
      toast({ title: 'Error al generar el recibo', variant: 'destructive' });
    }
  };

  const handleDeletePayment = async (payment) => {
    if (!confirm('¿Eliminar este pago?')) return;
    await base44.entities.Payment.delete(payment.id);
    const newPaid = (event.paid_amount || 0) - payment.amount;
    await base44.entities.Event.update(event.id, { paid_amount: Math.max(0, newPaid) });
    onEventUpdated({ ...event, paid_amount: Math.max(0, newPaid) });
    loadData();
    toast({ title: 'Pago eliminado' });
  };

  if (!event) return null;

  if (isEgresados) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>{event.title}</DialogTitle>
          </DialogHeader>
          <EgresadosEventDetail
            event={event}
            budgetServices={budgetServices}
            settings={settings}
            onOpenChange={onOpenChange}
            onEventUpdated={onEventUpdated}
            onDeleteEvent={onDeleteEvent}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <DialogTitle className="flex items-center gap-2 flex-wrap text-lg">
              {event.title}
              <Badge variant="outline">{EVENT_TYPE_LABELS[event.type]}</Badge>
            </DialogTitle>

            {/* BOTONES DE CONTRATO */}
            <div className="flex items-center gap-2 flex-wrap">
              {event.contract_data ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-violet-700 border-violet-300 hover:bg-violet-50 text-xs h-8"
                    onClick={() => setContractModalOpen(true)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Ver / Editar Contrato
                  </Button>
                  <Button
                    size="sm"
                    className="bg-violet-700 hover:bg-violet-800 text-white text-xs h-8 shadow-sm"
                    onClick={handleQuickDownloadContractPdf}
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" /> Contrato PDF
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs h-8 shadow-sm"
                  onClick={() => setContractModalOpen(true)}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> 📜 Generar Contrato
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            <div className="bg-stone-50 rounded-lg p-3">
              <p className="text-xs text-stone-400">Total</p>
              <p className="font-semibold text-stone-800 text-sm">{formatCurrency(event.total_amount)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs text-emerald-600">Pagado</p>
              <p className="font-semibold text-emerald-700 text-sm">{formatCurrency(event.paid_amount)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-600">Saldo</p>
              <p className="font-semibold text-amber-700 text-sm">{formatCurrency(balance)}</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3">
              <p className="text-xs text-stone-400">Fecha</p>
              <p className="font-semibold text-stone-800 text-sm">{formatDate(event.start_date)}</p>
            </div>
          </div>

          {servicesToShow.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-stone-700">Servicios contratados</h4>
              <ContractedServices
                selectedServices={servicesToShow}
                peopleCount={event.number_of_people || 0}
                showPrices={true}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-stone-700">Pagos registrados</h4>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 text-xs" onClick={() => setShowPayForm(!showPayForm)}>
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
                  <div className="space-y-1">
                    <Label className="text-xs">Pagador</Label>
                    <Input value={payForm.payer_name} onChange={(e) => setPayForm((p) => ({ ...p, payer_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
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
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddPayment}>Registrar pago</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPayForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white border border-stone-200 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-stone-500">{formatDate(p.date)} · {p.payer_name} · {p.payment_method}</p>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Form Modal */}
      <ContractFormDialog
        open={contractModalOpen}
        onOpenChange={setContractModalOpen}
        event={event}
        servicesToShow={servicesToShow}
        settings={settings}
        onSaveContract={handleSaveContract}
      />
    </>
  );
}
