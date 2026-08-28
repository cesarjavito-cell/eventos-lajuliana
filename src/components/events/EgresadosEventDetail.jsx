import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Printer,
  Plus,
  Trash2,
  Edit2,
  FileDown,
  MessageCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MobileSelect } from '@/components/ui/mobile-select';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/pricing';
import { generateReceiptPdf } from '@/lib/receiptPdf';
import { generateEgresadosReportPdf } from '@/lib/egresadosPdf';
import ContractedServices from './ContractedServices';

export default function EgresadosEventDetail({
  event,
  budgetServices = [],
  onOpenChange,
  onEventUpdated,
  onDeleteEvent,
}) {
  const { toast } = useToast();

  const [graduates, setGraduates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Card Value Quick Edit
  const [editingCardValue, setEditingCardValue] = useState(false);
  const [cardValueInput, setCardValueInput] = useState(event?.card_value || 0);

  // Graduate Account Form (Modal)
  const [gradDialogOpen, setGradDialogOpen] = useState(false);
  const [editingGrad, setEditingGrad] = useState(null);
  const [gradForm, setGradForm] = useState({
    name: '',
    phone: '',
    adult_cards: 1,
    half_cards: 0,
    free_under5_cards: 0,
    cud_cards_detail: [],
  });

  // Main Screen Quick Add Payment & Guest Account Form
  const [payForm, setPayForm] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    payment_method: 'efectivo',
    adult_cards: 1,
    half_cards: 0,
    free_under5_cards: 0,
    cud_cards_detail: [],
  });

  useEffect(() => {
    if (event?.card_value !== undefined) {
      setCardValueInput(event.card_value);
    }
  }, [event]);

  const loadData = async () => {
    if (!event) return;
    try {
      const [gradData, payData] = await Promise.all([
        base44.entities.Graduate.filter({ event_id: event.id }),
        base44.entities.Payment.filter({ event_id: event.id }),
      ]);
      setGraduates(gradData || []);
      setPayments(payData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [event?.id]);

  const cardValue = Number(event?.card_value) || 0;

  // Save updated Card Value
  const handleSaveCardValue = async () => {
    const newVal = Number(cardValueInput) || 0;
    if (newVal <= 0) return;
    await base44.entities.Event.update(event.id, { card_value: newVal });

    // Recalculate totals for all graduates
    for (const g of graduates) {
      const adultC = Number(g.adult_cards || 0);
      const halfC = Number(g.half_cards || 0);
      const newTotal = (adultC * newVal) + (halfC * newVal * 0.5);
      const paid = Number(g.paid_amount || 0);
      const status = paid >= newTotal ? 'pagado' : paid > 0 ? 'parcial' : 'pendiente';
      await base44.entities.Graduate.update(g.id, { total_amount: newTotal, card_amount: newVal, status });
    }

    onEventUpdated({ ...event, card_value: newVal });
    setEditingCardValue(false);
    toast({ title: 'Valor de tarjeta actualizado' });
    loadData();
  };

  // Summary Metrics
  const totalRecaudado = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  let totalAdultos = 0;
  let totalMenores50 = 0;
  let totalSinCargo5 = 0;
  let totalCUD = 0;

  graduates.forEach((g) => {
    totalAdultos += Number(g.adult_cards || 0);
    totalMenores50 += Number(g.half_cards || 0);
    totalSinCargo5 += Number(g.free_under5_cards || 0);
    const cudList = Array.isArray(g.cud_cards_detail) ? g.cud_cards_detail : [];
    totalCUD += cudList.length || Number(g.cud_cards_count || 0);
  });

  const totalComensales = totalAdultos + totalMenores50 + totalSinCargo5 + totalCUD;
  const plazasPagasEquiv = totalAdultos + totalMenores50 * 0.5;
  const servicesToShow = event?.selected_services?.length > 0 ? event.selected_services : budgetServices;

  // Open Dialog to Create or Edit Graduate Account
  const handleOpenGradDialog = (grad = null) => {
    if (grad) {
      setEditingGrad(grad);
      setGradForm({
        name: grad.name || '',
        phone: grad.phone || '',
        adult_cards: grad.adult_cards !== undefined ? grad.adult_cards : 1,
        half_cards: grad.half_cards || 0,
        free_under5_cards: grad.free_under5_cards || 0,
        cud_cards_detail: Array.isArray(grad.cud_cards_detail) ? grad.cud_cards_detail : [],
      });
    } else {
      setEditingGrad(null);
      setGradForm({
        name: '',
        phone: '',
        adult_cards: 1,
        half_cards: 0,
        free_under5_cards: 0,
        cud_cards_detail: [],
      });
    }
    setGradDialogOpen(true);
  };

  // Helper CUD beneficiaries in Dialog
  const handleAddCudBeneficiary = (isPayForm = false) => {
    if (isPayForm) {
      setPayForm((p) => ({ ...p, cud_cards_detail: [...p.cud_cards_detail, { name: '', dni: '' }] }));
    } else {
      setGradForm((p) => ({ ...p, cud_cards_detail: [...p.cud_cards_detail, { name: '', dni: '' }] }));
    }
  };

  const handleUpdateCudBeneficiary = (index, field, value, isPayForm = false) => {
    if (isPayForm) {
      setPayForm((p) => ({
        ...p,
        cud_cards_detail: p.cud_cards_detail.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
      }));
    } else {
      setGradForm((p) => ({
        ...p,
        cud_cards_detail: p.cud_cards_detail.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
      }));
    }
  };

  const handleRemoveCudBeneficiary = (index, isPayForm = false) => {
    if (isPayForm) {
      setPayForm((p) => ({ ...p, cud_cards_detail: p.cud_cards_detail.filter((_, i) => i !== index) }));
    } else {
      setGradForm((p) => ({ ...p, cud_cards_detail: p.cud_cards_detail.filter((_, i) => i !== index) }));
    }
  };

  const handleSaveGraduate = async () => {
    const name = gradForm.name.trim();
    if (!name) return;

    const adultCards = Number(gradForm.adult_cards) || 0;
    const halfCards = Number(gradForm.half_cards) || 0;
    const free5Cards = Number(gradForm.free_under5_cards) || 0;
    const cudDetail = (gradForm.cud_cards_detail || []).filter((b) => b && b.name && b.name.trim());

    const totalAccountAmount = (adultCards * cardValue) + (halfCards * cardValue * 0.5);

    const gradData = {
      event_id: event.id,
      name,
      phone: gradForm.phone,
      adult_cards: adultCards,
      half_cards: halfCards,
      free_under5_cards: free5Cards,
      cud_cards_detail: cudDetail,
      cud_cards_count: cudDetail.length,
      total_amount: totalAccountAmount,
      card_amount: cardValue,
    };

    if (editingGrad) {
      const paidAmt = Number(editingGrad.paid_amount || 0);
      const status = paidAmt >= totalAccountAmount && totalAccountAmount > 0 ? 'pagado' : paidAmt > 0 ? 'parcial' : 'pendiente';
      await base44.entities.Graduate.update(editingGrad.id, { ...gradData, paid_amount: paidAmt, status });
      toast({ title: 'Cuenta de Egresado actualizada' });
    } else {
      await base44.entities.Graduate.create({ ...gradData, paid_amount: 0, status: 'pendiente' });
      toast({ title: 'Egresado registrado correctamente' });
    }

    setGradDialogOpen(false);
    loadData();
  };

  // Register Payment + Auto-calculates Covered Cards
  const handleInjectPayment = async () => {
    const name = payForm.name.trim();
    const amount = Number(payForm.amount) || 0;
    if (!name || amount <= 0) return;

    let grad = graduates.find((g) => g.name.toLowerCase() === name.toLowerCase());

    const inputAdults = Number(payForm.adult_cards) || 0;
    const inputHalfs = Number(payForm.half_cards) || 0;
    const inputFree5 = Number(payForm.free_under5_cards) || 0;
    const cudDetail = (payForm.cud_cards_detail || []).filter((b) => b && b.name && b.name.trim());

    if (!grad) {
      // Calculate how many adult cards this payment covers if cardValue > 0
      const coveredAdults = cardValue > 0 ? Math.max(inputAdults, Math.ceil(amount / cardValue)) : inputAdults;
      const initialTotal = (coveredAdults * cardValue) + (inputHalfs * cardValue * 0.5);

      grad = await base44.entities.Graduate.create({
        event_id: event.id,
        name,
        phone: '',
        adult_cards: coveredAdults,
        half_cards: inputHalfs,
        free_under5_cards: inputFree5,
        cud_cards_detail: cudDetail,
        cud_cards_count: cudDetail.length,
        total_amount: initialTotal,
        card_amount: cardValue,
        paid_amount: 0,
        status: 'pendiente',
      });
    } else {
      // Graduate already exists: check if total paid amount requires scaling up adult_cards
      const currentPaid = Number(grad.paid_amount || 0);
      const newPaid = currentPaid + amount;
      let adultCards = Number(grad.adult_cards || 0);

      // Auto-scale adult cards if new payment exceeds current account total
      if (cardValue > 0) {
        const minAdultsNeeded = Math.ceil(newPaid / cardValue);
        if (minAdultsNeeded > adultCards) {
          adultCards = minAdultsNeeded;
        }
      }

      const updatedTotal = (adultCards * cardValue) + (Number(grad.half_cards || 0) * cardValue * 0.5);
      await base44.entities.Graduate.update(grad.id, {
        adult_cards: adultCards,
        total_amount: updatedTotal,
      });
      grad.adult_cards = adultCards;
      grad.total_amount = updatedTotal;
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    await base44.entities.Payment.create({
      event_id: event.id,
      event_title: event.title,
      amount,
      date: payForm.date,
      payer_name: name,
      payment_method: payForm.payment_method,
      receipt_number: receiptNumber,
    });

    const newGradPaid = (grad.paid_amount || 0) + amount;
    const newGradStatus = newGradPaid >= (grad.total_amount || cardValue) ? 'pagado' : 'parcial';
    await base44.entities.Graduate.update(grad.id, { paid_amount: newGradPaid, status: newGradStatus });

    const newEventPaid = (event.paid_amount || 0) + amount;
    await base44.entities.Event.update(event.id, { paid_amount: newEventPaid });
    onEventUpdated({ ...event, paid_amount: newEventPaid });

    setPayForm({
      name: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      payment_method: 'efectivo',
      adult_cards: 1,
      half_cards: 0,
      free_under5_cards: 0,
      cud_cards_detail: [],
    });

    toast({ title: 'Pago y tarjetas registradas exitosamente' });
    loadData();
  };

  const handleDeletePayment = async (payment) => {
    if (!confirm('¿Eliminar este pago?')) return;
    await base44.entities.Payment.delete(payment.id);

    const grad = graduates.find((g) => g.name === payment.payer_name);
    if (grad) {
      const newGradPaid = Math.max(0, (grad.paid_amount || 0) - payment.amount);
      const newGradStatus = newGradPaid <= 0 ? 'pendiente' : newGradPaid >= (grad.total_amount || cardValue) ? 'pagado' : 'parcial';
      await base44.entities.Graduate.update(grad.id, { paid_amount: newGradPaid, status: newGradStatus });
    }

    const newEventPaid = Math.max(0, (event.paid_amount || 0) - payment.amount);
    await base44.entities.Event.update(event.id, { paid_amount: newEventPaid });
    onEventUpdated({ ...event, paid_amount: newEventPaid });
    loadData();
    toast({ title: 'Pago eliminado' });
  };

  const handleSendReceipt = (grad, payment) => {
    const msg = `Hola ${grad.name}! Confirmamos el recibo de tu pago de ${formatCurrency(payment.amount)} (${payment.payment_method}) para ${event.title}. Recibo N° ${payment.receipt_number}. Muchas gracias! Quinta La Juliana.`;
    window.open(`https://wa.me/${(grad.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDownloadReceipt = async (grad, payment) => {
    try {
      await generateReceiptPdf({
        receiptNumber: payment.receipt_number,
        date: payment.date,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        payerName: grad.name,
        eventDate: event.start_date,
        eventTitle: `${event.title} - ${grad.name}`,
      });
    } catch (e) {
      toast({ title: 'Error al generar el recibo', variant: 'destructive' });
    }
  };

  const handleExportPDFReport = async () => {
    try {
      await generateEgresadosReportPdf({ event, graduates, payments });
      toast({ title: 'Informe PDF de tarjetas generado' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al generar el informe PDF', variant: 'destructive' });
    }
  };

  const handleDeleteGraduate = async (grad) => {
    if (!confirm(`¿Eliminar la cuenta de ${grad.name} y todos sus pagos?`)) return;
    const gradPayments = payments.filter((p) => p.payer_name === grad.name);
    for (const p of gradPayments) {
      await base44.entities.Payment.delete(p.id);
    }
    const gradTotal = grad.paid_amount || 0;
    await base44.entities.Graduate.delete(grad.id);
    if (gradTotal > 0) {
      const newEventPaid = Math.max(0, (event.paid_amount || 0) - gradTotal);
      await base44.entities.Event.update(event.id, { paid_amount: newEventPaid });
      onEventUpdated({ ...event, paid_amount: newEventPaid });
    }
    loadData();
    toast({ title: 'Egresado eliminado' });
  };

  const handleDeleteEvent = async () => {
    if (!confirm(`¿Borrar permanentemente "${event.title}"? Esta acción no se puede deshacer.`)) return;
    await base44.entities.Graduate.deleteMany({ event_id: event.id });
    await base44.entities.Payment.deleteMany({ event_id: event.id });
    await base44.entities.Event.delete(event.id);
    onDeleteEvent();
    toast({ title: 'Evento eliminado' });
  };

  if (!event) return null;

  return (
    <div className="space-y-4">
      {/* Header & Print Report Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
          🎓 {event.title}
        </h2>
        <Button size="sm" variant="outline" className="text-violet-700 border-violet-300 hover:bg-violet-50" onClick={handleExportPDFReport}>
          <Printer className="w-4 h-4 mr-1.5" /> Imprimir Informe PDF
        </Button>
      </div>

      {/* Logistics & Metrics Box */}
      <div className="bg-violet-50/70 border border-violet-200 rounded-lg p-4 space-y-3 text-sm">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-semibold text-violet-800">Detalles de Logística del Evento:</h3>
          {editingCardValue ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-stone-500 font-medium">Valor Tarjeta ($):</span>
              <Input
                type="number"
                className="w-28 h-7 text-xs bg-white"
                value={cardValueInput}
                onChange={(e) => setCardValueInput(e.target.value)}
              />
              <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveCardValue}>
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white text-violet-700 border-violet-300 font-bold text-xs py-1 px-2.5">
                Valor Tarjeta: {formatCurrency(cardValue)}
              </Badge>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-violet-700 hover:bg-violet-100" onClick={() => setEditingCardValue(true)}>
                <Edit2 className="w-3 h-3 mr-1" /> Modificar Precio
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="bg-white p-2.5 rounded border border-violet-100">
            <span className="text-stone-400 block">Total Recaudado</span>
            <span className="font-bold text-stone-800 text-sm">{formatCurrency(totalRecaudado)}</span>
          </div>
          <div className="bg-white p-2.5 rounded border border-violet-100">
            <span className="text-stone-400 block">Comensales Totales</span>
            <span className="font-bold text-stone-800 text-sm">{totalComensales} pers.</span>
          </div>
          <div className="bg-white p-2.5 rounded border border-violet-100">
            <span className="text-stone-400 block">Plazas Pagas Equiv.</span>
            <span className="font-bold text-violet-700 text-sm">{plazasPagasEquiv}</span>
          </div>
          <div className="bg-white p-2.5 rounded border border-violet-100">
            <span className="text-stone-400 block">Egresados / Cuentas</span>
            <span className="font-bold text-stone-800 text-sm">{graduates.length}</span>
          </div>
        </div>
      </div>

      {/* Planilla de Cobranzas por Egresado */}
      <div className="border border-stone-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700">Planilla de Cuentas y Cobranzas:</h3>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => handleOpenGradDialog()}>
            <Plus className="w-4 h-4 mr-1" /> Configurar Nuevo Egresado
          </Button>
        </div>
        <div className="border-b border-dashed border-stone-200" />

        {loading ? (
          <p className="text-sm text-stone-400 text-center py-2">Cargando cuentas...</p>
        ) : graduates.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-2">No hay egresados registrados todavía. Presiona "+ Configurar Nuevo Egresado" o registra un pago abajo.</p>
        ) : (
          <div className="space-y-3 divide-y divide-stone-100">
            {graduates.map((grad) => {
              const adultC = Number(grad.adult_cards || 0);
              const halfC = Number(grad.half_cards || 0);
              const free5C = Number(grad.free_under5_cards || 0);
              const cudList = Array.isArray(grad.cud_cards_detail) ? grad.cud_cards_detail : [];
              const cudC = cudList.length || Number(grad.cud_cards_count || 0);

              const totalAccountAmt = (adultC * cardValue) + (halfC * cardValue * 0.5);
              const paidAmt = Number(grad.paid_amount || 0);
              const balanceAmt = totalAccountAmt - paidAmt;

              const gradPayments = payments.filter((p) => p.payer_name.toLowerCase() === grad.name.toLowerCase());

              return (
                <div key={grad.id} className="pt-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-stone-800">🎓 {grad.name}</span>
                        {balanceAmt <= 0 && totalAccountAmt > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">PAGADO</Badge>
                        ) : paidAmt > 0 ? (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px]">PARCIAL</Badge>
                        ) : (
                          <Badge variant="outline" className="text-stone-400 text-[10px]">PENDIENTE</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-violet-300 text-violet-700 bg-violet-50/60 hover:bg-violet-100"
                          onClick={() => handleOpenGradDialog(grad)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Configurar Tarjetas e Invitados
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => handleDeleteGraduate(grad)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Badges de desglose de tarjetas */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {adultC > 0 && <Badge variant="secondary" className="text-[10px] bg-stone-100">{adultC} Adulto(s) (100%)</Badge>}
                        {halfC > 0 && <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-800">{halfC} Menor &lt;12a (50%)</Badge>}
                        {free5C > 0 && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">{free5C} Menor &lt;5a (Sin Cargo)</Badge>}
                        {cudC > 0 && <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800">{cudC} CUD Discapacidad (Sin Cargo)</Badge>}
                      </div>

                      {/* Lista de beneficiarios CUD con DNI */}
                      {cudList.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {cudList.map((b, bi) => (
                            <p key={bi} className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Pase CUD: {b.name} (DNI: {b.dni || '-'})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-stone-800">
                        {formatCurrency(paidAmt)} <span className="text-xs font-normal text-stone-400">/ {formatCurrency(totalAccountAmt)}</span>
                      </p>
                      {balanceAmt > 0 ? (
                        <p className="text-xs text-amber-600 font-medium">Saldo: {formatCurrency(balanceAmt)}</p>
                      ) : (
                        <p className="text-xs text-emerald-600 font-medium">Al día</p>
                      )}
                    </div>
                  </div>

                  {/* Historial de pagos de esta cuenta */}
                  {gradPayments.length === 0 ? (
                    <p className="pl-4 text-xs text-stone-400">Sin pagos registrados</p>
                  ) : (
                    gradPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between pl-4 text-xs text-stone-500 bg-stone-50 rounded p-1.5">
                        <span>• {formatCurrency(p.amount)} el {formatDate(p.date)} ({p.payment_method})</span>
                        <div className="flex gap-0.5">
                          {grad.phone && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSendReceipt(grad, p)}>
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownloadReceipt(grad, p)}>
                            <FileDown className="w-3 h-3 text-stone-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeletePayment(p)}>
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Injection Form + Direct Guest Ticket Controls */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-emerald-700">➕ Registrar Pago en Cuenta de Egresado:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del Alumno / Egresado</Label>
            <Input placeholder="Nombre del Egresado (ej: Almada Sebastián)" value={payForm.name} onChange={(e) => setPayForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Monto entregado ($)</Label>
            <Input type="number" placeholder="Ej: 230000" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} />
          </div>
        </div>

        {/* Guest & Special Tickets Configuration inline */}
        <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
          <Label className="text-xs font-semibold text-stone-700 block">
            🎟️ Configuración de Tarjetas e Invitados de esta cuenta:
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-stone-600">Adultos (100%)</Label>
              <Input type="number" min="0" value={payForm.adult_cards} onChange={(e) => setPayForm((p) => ({ ...p, adult_cards: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-stone-600">Menor &lt;12a (50%)</Label>
              <Input type="number" min="0" value={payForm.half_cards} onChange={(e) => setPayForm((p) => ({ ...p, half_cards: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-stone-600">Menor &lt;5a (Sin Cargo)</Label>
              <Input type="number" min="0" value={payForm.free_under5_cards} onChange={(e) => setPayForm((p) => ({ ...p, free_under5_cards: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>

          {/* CUD Beneficiaries */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Personas con Discapacidad CUD (Sin Cargo)
              </Label>
              <Button type="button" size="sm" variant="outline" className="h-6 text-[11px] text-emerald-700 border-emerald-300" onClick={() => handleAddCudBeneficiary(true)}>
                <Plus className="w-3 h-3 mr-1" /> Agregar CUD
              </Button>
            </div>
            {payForm.cud_cards_detail.map((b, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input placeholder="Nombre Completo" value={b.name} onChange={(e) => handleUpdateCudBeneficiary(idx, 'name', e.target.value, true)} className="h-7 text-xs flex-1" />
                <Input placeholder="N° DNI" value={b.dni} onChange={(e) => handleUpdateCudBeneficiary(idx, 'dni', e.target.value, true)} className="h-7 text-xs w-28" />
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleRemoveCudBeneficiary(idx, true)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de pago</Label>
            <Input type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Método de pago</Label>
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
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleInjectPayment}
          disabled={!payForm.name.trim() || !payForm.amount}
        >
          💾 Registrar Pago en Cuenta
        </Button>
      </div>

      {/* Contracted Services (Scales according to plazasPagasEquiv) */}
      {servicesToShow.length > 0 && (
        <div className="border border-stone-200 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-stone-700">Servicios a Contratar:</h3>
          <p className="text-xs text-stone-500">Calculado para {plazasPagasEquiv} plazas pagas equivalentes</p>
          <ContractedServices
            selectedServices={servicesToShow}
            peopleCount={plazasPagasEquiv}
            showPrices={false}
          />
        </div>
      )}

      {/* Dialog for Creating/Editing Graduate Account & Special Tickets */}
      <Dialog open={gradDialogOpen} onOpenChange={setGradDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGrad ? 'Editar Tarjetas e Invitados de Egresado' : 'Configurar Cuenta de Egresado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre del Alumno</Label>
                <Input placeholder="Ej: Lucas Gómez" value={gradForm.name} onChange={(e) => setGradForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono de contacto</Label>
                <Input placeholder="Ej: 3511234567" value={gradForm.phone} onChange={(e) => setGradForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div className="border border-stone-200 rounded-lg p-3 space-y-3 bg-stone-50">
              <h4 className="font-semibold text-stone-700 text-xs uppercase tracking-wider">Desglose de Tarjetas Solicitadas</h4>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Adultos (100%)</Label>
                  <Input type="number" min="0" value={gradForm.adult_cards} onChange={(e) => setGradForm((p) => ({ ...p, adult_cards: e.target.value }))} />
                  <p className="text-[10px] text-stone-400">{formatCurrency(cardValue)} c/u</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Menor &lt;12a (50%)</Label>
                  <Input type="number" min="0" value={gradForm.half_cards} onChange={(e) => setGradForm((p) => ({ ...p, half_cards: e.target.value }))} />
                  <p className="text-[10px] text-stone-400">{formatCurrency(cardValue * 0.5)} c/u</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Menor &lt;5a (Sin Cargo)</Label>
                  <Input type="number" min="0" value={gradForm.free_under5_cards} onChange={(e) => setGradForm((p) => ({ ...p, free_under5_cards: e.target.value }))} />
                  <p className="text-[10px] text-emerald-600 font-semibold">Gratis</p>
                </div>
              </div>

              {/* Seccion Personas con Discapacidad CUD */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Tarjetas CUD Discapacidad (Sin Cargo)
                  </Label>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-300" onClick={() => handleAddCudBeneficiary(false)}>
                    <Plus className="w-3 h-3 mr-1" /> Agregar CUD
                  </Button>
                </div>

                {gradForm.cud_cards_detail.map((b, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-stone-200">
                    <div className="flex-1 space-y-1">
                      <Input placeholder="Nombre Completo" value={b.name} onChange={(e) => handleUpdateCudBeneficiary(idx, 'name', e.target.value, false)} className="h-8 text-xs" />
                    </div>
                    <div className="w-32 space-y-1">
                      <Input placeholder="N° DNI" value={b.dni} onChange={(e) => handleUpdateCudBeneficiary(idx, 'dni', e.target.value, false)} className="h-8 text-xs" />
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleRemoveCudBeneficiary(idx, false)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {gradForm.cud_cards_detail.length === 0 && (
                  <p className="text-[11px] text-stone-400 italic">No hay beneficiarios CUD agregados. Haz clic en "+ Agregar CUD".</p>
                )}
              </div>

              <div className="bg-white p-2.5 rounded border border-stone-200 flex justify-between items-center text-xs">
                <span className="text-stone-500">Monto total de esta cuenta:</span>
                <span className="font-bold text-stone-800 text-sm">
                  {formatCurrency((Number(gradForm.adult_cards || 0) * cardValue) + (Number(gradForm.half_cards || 0) * cardValue * 0.5))}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGradDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGraduate} disabled={!gradForm.name.trim()}>
              Guardar Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Danger Zone */}
      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        onClick={handleDeleteEvent}
      >
        ❌ Borrar / Cancelar Fiesta Permanentemente
      </Button>

      {/* Back Button */}
      <Button className="w-full" variant="outline" onClick={() => onOpenChange(false)}>
        🔄 Volver a la Agenda
      </Button>
    </div>
  );
}
