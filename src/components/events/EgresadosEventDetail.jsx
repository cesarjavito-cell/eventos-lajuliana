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
  Search,
  CreditCard,
  Eye,
  Send,
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
import { generateEgresadosReportPdf, generateIndividualGraduatePdf } from '@/lib/egresadosPdf';
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

  // Main Payments Modal Open State
  const [paymentsDialogOpen, setPaymentsDialogOpen] = useState(false);

  // Search Filter in Payments Modal
  const [searchTerm, setSearchTerm] = useState('');

  // Digital Account Statement On-Screen Modal State
  const [previewGrad, setPreviewGrad] = useState(null);

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

  // Quick Add Payment Form toggle inside Payments Modal
  const [showPayForm, setShowPayForm] = useState(false);
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

      const fetchedGrads = gradData || [];
      const fetchedPays = payData || [];

      // Auto-recalculate and sync paid_amount for all graduates in Firestore
      for (const g of fetchedGrads) {
        const gPayments = fetchedPays.filter(
          (p) => (p.payer_name || '').toLowerCase().trim() === (g.name || '').toLowerCase().trim()
        );
        const actualPaid = gPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const adultC = Number(g.adult_cards || 0);
        const halfC = Number(g.half_cards || 0);
        const cardVal = Number(event?.card_value || 0);
        const totalAccountAmt = (adultC * cardVal) + (halfC * cardVal * 0.5);
        const status = actualPaid >= totalAccountAmt && totalAccountAmt > 0 ? 'pagado' : actualPaid > 0 ? 'parcial' : 'pendiente';

        if (g.paid_amount !== actualPaid || g.status !== status) {
          try {
            await base44.entities.Graduate.update(g.id, { paid_amount: actualPaid, status });
            g.paid_amount = actualPaid;
            g.status = status;
          } catch (err) {
            console.warn('Could not sync graduate paid_amount:', err);
          }
        }
      }

      setGraduates(fetchedGrads);
      setPayments(fetchedPays);
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

    for (const g of graduates) {
      const adultC = Number(g.adult_cards || 0);
      const halfC = Number(g.half_cards || 0);
      const newTotal = (adultC * newVal) + (halfC * newVal * 0.5);

      const gPayments = payments.filter(
        (p) => (p.payer_name || '').toLowerCase().trim() === (g.name || '').toLowerCase().trim()
      );
      const paid = gPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const status = paid >= newTotal && newTotal > 0 ? 'pagado' : paid > 0 ? 'parcial' : 'pendiente';
      await base44.entities.Graduate.update(g.id, { total_amount: newTotal, card_amount: newVal, paid_amount: paid, status });
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

  // Sort graduates ALPHABETICALLY by student name
  const sortedGraduates = [...graduates].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
  );

  // Filtered Graduates based on search
  const filteredGraduates = sortedGraduates.filter((g) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const matchName = (g.name || '').toLowerCase().includes(term);
    const matchPhone = (g.phone || '').toLowerCase().includes(term);
    const cudList = Array.isArray(g.cud_cards_detail) ? g.cud_cards_detail : [];
    const matchCud = cudList.some(
      (b) => (b.name || '').toLowerCase().includes(term) || (b.dni || '').includes(term)
    );
    return matchName || matchPhone || matchCud;
  });

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

    const gPayments = payments.filter(
      (p) => (p.payer_name || '').toLowerCase().trim() === name.toLowerCase().trim()
    );
    const paidAmt = gPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const status = paidAmt >= totalAccountAmount && totalAccountAmount > 0 ? 'pagado' : paidAmt > 0 ? 'parcial' : 'pendiente';

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
      paid_amount: paidAmt,
      status,
    };

    if (editingGrad) {
      await base44.entities.Graduate.update(editingGrad.id, gradData);
      toast({ title: 'Cuenta de Egresado actualizada' });
    } else {
      await base44.entities.Graduate.create(gradData);
      toast({ title: 'Egresado registrado correctamente' });
    }

    setGradDialogOpen(false);
    loadData();
  };

  const handleInjectPayment = async () => {
    const name = payForm.name.trim();
    const amount = Number(payForm.amount) || 0;
    if (!name || amount <= 0) return;

    let grad = graduates.find((g) => g.name.toLowerCase() === name.toLowerCase());

    const inputAdults = Number(payForm.adult_cards) || 0;
    const inputHalfs = Number(payForm.half_cards) || 0;
    const inputFree5 = Number(payForm.free_under5_cards) || 0;
    const cudDetail = (payForm.cud_cards_detail || []).filter((b) => b && b.name && b.name.trim());

    const existingGradPayments = payments.filter(
      (p) => (p.payer_name || '').toLowerCase().trim() === name.toLowerCase().trim()
    );
    const currentPaid = existingGradPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const newPaid = currentPaid + amount;

    if (!grad) {
      const coveredAdults = cardValue > 0 ? Math.max(inputAdults, Math.ceil(newPaid / cardValue)) : inputAdults;
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
        paid_amount: newPaid,
        status: newPaid >= initialTotal ? 'pagado' : 'parcial',
      });
    } else {
      let adultCards = Number(grad.adult_cards || 0);

      if (cardValue > 0) {
        const minAdultsNeeded = Math.ceil(newPaid / cardValue);
        if (minAdultsNeeded > adultCards) {
          adultCards = minAdultsNeeded;
        }
      }

      const updatedTotal = (adultCards * cardValue) + (Number(grad.half_cards || 0) * cardValue * 0.5);
      const newStatus = newPaid >= updatedTotal && updatedTotal > 0 ? 'pagado' : 'parcial';
      await base44.entities.Graduate.update(grad.id, {
        adult_cards: adultCards,
        total_amount: updatedTotal,
        paid_amount: newPaid,
        status: newStatus,
      });
      grad.adult_cards = adultCards;
      grad.total_amount = updatedTotal;
      grad.paid_amount = newPaid;
      grad.status = newStatus;
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

    setShowPayForm(false);
    toast({ title: 'Pago registrado exitosamente' });
    loadData();
  };

  const handleDeletePayment = async (payment) => {
    if (!confirm('¿Eliminar este pago?')) return;
    await base44.entities.Payment.delete(payment.id);

    const grad = graduates.find((g) => g.name.toLowerCase().trim() === (payment.payer_name || '').toLowerCase().trim());
    if (grad) {
      const remainingPayments = payments.filter((p) => p.id !== payment.id && (p.payer_name || '').toLowerCase().trim() === grad.name.toLowerCase().trim());
      const newGradPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalAccountAmt = Number(grad.total_amount || 0);
      const newGradStatus = newGradPaid <= 0 ? 'pendiente' : newGradPaid >= totalAccountAmt && totalAccountAmt > 0 ? 'pagado' : 'parcial';
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

  const handleSendWhatsAppStatement = (grad) => {
    const gradPayments = payments.filter((p) => (p.payer_name || '').toLowerCase().trim() === (grad.name || '').toLowerCase().trim());
    const paidAmt = gradPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const adultC = Number(grad?.adult_cards || 0);
    const halfC = Number(grad?.half_cards || 0);
    const totalAmt = (adultC * cardValue) + (halfC * cardValue * 0.5);
    const balanceAmt = totalAmt - paidAmt;

    let msg = `*RESUMEN Y ESTADO DE CUENTA DE EGRESADO*\n*Quinta La Juliana*\n\n`;
    msg += `🎓 *Alumno:* ${grad.name}\n`;
    msg += `🏫 *Evento:* ${event.title}\n`;
    msg += `📅 *Fecha:* ${formatDate(event.start_date)}\n\n`;
    msg += `💳 *Tarjetas:* ${adultC} Adultos`;
    if (halfC > 0) msg += ` · ${halfC} Menor 50%`;
    msg += `\n`;
    msg += `💰 *Total Cuenta:* ${formatCurrency(totalAmt)}\n`;
    msg += `✅ *Total Abonado:* ${formatCurrency(paidAmt)}\n`;
    msg += balanceAmt > 0 ? `⚠️ *Saldo Pendiente:* ${formatCurrency(balanceAmt)}\n` : `✨ *Estado:* ¡AL DÍA / TOTALMENTE CANCELADO!\n`;
    msg += `\n¡Muchas gracias!`;

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

  const handleDownloadIndividualStatement = async (grad) => {
    try {
      await generateIndividualGraduatePdf({ event, graduate: grad, payments });
      toast({ title: 'Comprobante y Estado de Cuenta PDF generado' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al generar el comprobante PDF', variant: 'destructive' });
    }
  };

  const handleExportPDFReport = async () => {
    try {
      await generateEgresadosReportPdf({ event, graduates: sortedGraduates, payments });
      toast({ title: 'Informe PDF de tarjetas generado' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al generar el informe PDF', variant: 'destructive' });
    }
  };

  const handleDeleteGraduate = async (grad) => {
    if (!confirm(`¿Eliminar la cuenta de ${grad.name} y todos sus pagos?`)) return;
    const gradPayments = payments.filter((p) => (p.payer_name || '').toLowerCase().trim() === grad.name.toLowerCase().trim());
    const gradTotal = gradPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    for (const p of gradPayments) {
      await base44.entities.Payment.delete(p.id);
    }
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

  // Selected Graduate Payments for Digital Statement Preview
  const previewGradPayments = previewGrad
    ? payments.filter((p) => (p.payer_name || '').toLowerCase().trim() === (previewGrad.name || '').toLowerCase().trim())
    : [];

  const previewAdultC = Number(previewGrad?.adult_cards || 0);
  const previewHalfC = Number(previewGrad?.half_cards || 0);
  const previewTotalAmt = (previewAdultC * cardValue) + (previewHalfC * cardValue * 0.5);
  const previewPaidAmt = previewGradPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const previewBalanceAmt = previewTotalAmt - previewPaidAmt;

  return (
    <div className="space-y-4">
      {/* Header & Print Report Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
          🎓 {event.title}
        </h2>
        <Button size="sm" variant="outline" className="text-violet-700 border-violet-300 hover:bg-violet-50" onClick={handleExportPDFReport}>
          <Printer className="w-4 h-4 mr-1.5" /> Informe General PDF
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

      {/* 🔥 BOTÓN DESTACADO PANTALLAZO INICIAL: DETALLES DE PAGOS Y EGRESADOS */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-xl p-4 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-base text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-300" /> Detalles de Pagos y Cuentas de Egresados
            </h3>
            <p className="text-xs text-violet-200 mt-0.5">
              Lista ordenada alfabéticamente con cálculo dinámico en vivo, resumen digital en pantalla e impresión PDF.
            </p>
          </div>
          <Badge className="bg-white/20 text-white font-bold text-xs py-1 px-3">
            {graduates.length} Registrados
          </Badge>
        </div>
        <Button
          onClick={() => setPaymentsDialogOpen(true)}
          className="w-full bg-white text-violet-950 font-bold hover:bg-amber-100 h-11 text-sm shadow-sm"
        >
          💳 Abrir Detalles de Pagos y Cuentas ({graduates.length})
        </Button>
      </div>

      {/* Contracted Services */}
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

      {/* Danger Zone & Back */}
      <div className="space-y-2 pt-2">
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          onClick={handleDeleteEvent}
        >
          ❌ Borrar / Cancelar Fiesta Permanentemente
        </Button>
        <Button className="w-full" variant="outline" onClick={() => onOpenChange(false)}>
          🔄 Volver a la Agenda
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* 🚀 MODAL PRINCIPAL "DETALLES DE PAGOS Y EGRESADOS" CON BUSCADOR EN VIVO */}
      {/* ========================================================================= */}
      <Dialog open={paymentsDialogOpen} onOpenChange={setPaymentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between flex-wrap gap-2 text-lg">
              <span className="flex items-center gap-2 text-violet-900">
                <CreditCard className="w-5 h-5 text-violet-600" />
                Detalles de Pagos y Cuentas - {event.title}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8" onClick={() => handleOpenGradDialog()}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Configurar Nuevo Egresado
                </Button>
                <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs h-8" onClick={() => setShowPayForm(!showPayForm)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Pago
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* 🔍 BUSCADOR DE EGRESADOS EN TIEMPO REAL */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="🔍 Buscar egresado por nombre o DNI de acompañante CUD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-sm bg-stone-50 border-stone-300 focus:bg-white"
            />
            {searchTerm && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">
                {filteredGraduates.length} de {graduates.length} resultados
              </span>
            )}
          </div>

          {/* Quick Pay Form Collapsible */}
          {showPayForm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3 mb-3">
              <h3 className="text-sm font-semibold text-emerald-800">➕ Registrar Pago en Cuenta de Egresado:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre del Alumno / Egresado</Label>
                  <Input placeholder="Nombre del Egresado (ej: Almada Sebastián)" value={payForm.name} onChange={(e) => setPayForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monto entregado ($)</Label>
                  <Input type="number" placeholder="Ej: 230000" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fecha de pago</Label>
                  <Input type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
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

              <div className="flex gap-2 pt-1">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9" onClick={handleInjectPayment} disabled={!payForm.name.trim() || !payForm.amount}>
                  💾 Guardar Pago
                </Button>
                <Button variant="outline" className="text-xs h-9" onClick={() => setShowPayForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* LISTA DE EGRESADOS FILTRADA Y ORDENADA ALFABETICAMENTE */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-stone-400 text-center py-6">Cargando cuentas...</p>
            ) : filteredGraduates.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">
                {searchTerm ? `No se encontraron egresados coincidentes con "${searchTerm}".` : 'No hay egresados registrados.'}
              </p>
            ) : (
              filteredGraduates.map((grad) => {
                const adultC = Number(grad.adult_cards || 0);
                const halfC = Number(grad.half_cards || 0);
                const free5C = Number(grad.free_under5_cards || 0);
                const cudList = Array.isArray(grad.cud_cards_detail) ? grad.cud_cards_detail : [];
                const cudC = cudList.length || Number(grad.cud_cards_count || 0);

                const totalAccountAmt = (adultC * cardValue) + (halfC * cardValue * 0.5);

                // DYNAMICALLY SUM payments for 100% financial accuracy
                const gradPayments = payments.filter(
                  (p) => (p.payer_name || '').toLowerCase().trim() === (grad.name || '').toLowerCase().trim()
                );
                const paidAmt = gradPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const balanceAmt = totalAccountAmt - paidAmt;

                return (
                  <div key={grad.id} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 hover:bg-stone-100/60 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-stone-900">🎓 {grad.name}</span>
                          {balanceAmt <= 0 && totalAccountAmt > 0 ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">PAGADO</Badge>
                          ) : paidAmt > 0 ? (
                            <Badge className="bg-amber-500 text-white text-[10px]">PARCIAL</Badge>
                          ) : (
                            <Badge variant="outline" className="text-stone-500 text-[10px]">PENDIENTE</Badge>
                          )}
                        </div>

                        {/* Badges de tarjetas */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {adultC > 0 && <Badge variant="secondary" className="text-[10px] bg-white border border-stone-200">{adultC} Adulto(s)</Badge>}
                          {halfC > 0 && <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-800">{halfC} Menor 50%</Badge>}
                          {free5C > 0 && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">{free5C} Menor &lt;5a</Badge>}
                          {cudC > 0 && <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800">{cudC} CUD Discapacidad</Badge>}
                        </div>

                        {cudList.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {cudList.map((b, bi) => (
                              <p key={bi} className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Pase CUD: {b.name} (DNI: {b.dni || '-'})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Montos y Botones de Acción */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-stone-800">
                            {formatCurrency(paidAmt)} <span className="text-xs font-normal text-stone-400">/ {formatCurrency(totalAccountAmt)}</span>
                          </p>
                          {balanceAmt > 0 ? (
                            <p className="text-xs text-amber-600 font-medium">Saldo: {formatCurrency(balanceAmt)}</p>
                          ) : (
                            <p className="text-xs text-emerald-600 font-semibold">Al día</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* 🔥 BOTÓN VER ESTADO DE CUENTA DIGITAL EN PANTALLA */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                            onClick={() => setPreviewGrad(grad)}
                            title="Ver resumen y estado de cuenta digital en pantalla"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Ver Resumen
                          </Button>

                          {/* BOTÓN IMPRIMIR PDF COMPROBANTE INDIVIDUAL */}
                          <Button
                            size="sm"
                            className="bg-violet-700 hover:bg-violet-800 text-white text-xs h-8 shadow-sm"
                            onClick={() => handleDownloadIndividualStatement(grad)}
                            title="Imprimir Comprobante / Estado de Cuenta PDF"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir PDF
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-stone-300 hover:bg-white"
                            onClick={() => handleOpenGradDialog(grad)}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-50" onClick={() => handleDeleteGraduate(grad)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Historial de Pagos de este Egresado */}
                    <div className="mt-2 pt-2 border-t border-stone-200/60 space-y-1">
                      {gradPayments.length === 0 ? (
                        <p className="text-xs text-stone-400 italic">Sin entregas registradas</p>
                      ) : (
                        gradPayments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs text-stone-600 bg-white rounded-lg p-2 border border-stone-200">
                            <span>• {formatCurrency(p.amount)} el {formatDate(p.date)} ({p.payment_method})</span>
                            <div className="flex gap-1">
                              {grad.phone && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSendReceipt(grad, p)}>
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadReceipt(grad, p)}>
                                <FileDown className="w-3.5 h-3.5 text-stone-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDeletePayment(p)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-stone-200">
            <Button variant="outline" onClick={() => setPaymentsDialogOpen(false)}>
              Cerrar Detalles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 📱 MODAL DIGITAL DE RESUMEN Y ESTADO DE CUENTA EN PANTALLA */}
      {/* ========================================================================= */}
      <Dialog open={!!previewGrad} onOpenChange={(open) => { if (!open) setPreviewGrad(null); }}>
        <DialogContent className="max-w-lg bg-stone-900 border-[#C9A04E]/40 text-stone-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <Badge className="bg-[#C9A04E] text-black font-bold mb-1">ESTADO DE CUENTA DIGITAL</Badge>
                <DialogTitle className="text-xl font-display font-bold text-[#E6C57A]">
                  🎓 {previewGrad?.name}
                </DialogTitle>
                <p className="text-xs text-stone-400 mt-0.5">{event.title} · Fecha: {formatDate(event.start_date)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Desglose de Tarjetas */}
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1.5">
              <p className="font-semibold text-stone-300">Desglose de Tarjetas Solicitadas:</p>
              <div className="flex flex-wrap gap-1 text-[11px]">
                <Badge variant="outline" className="border-stone-700 text-stone-200 bg-stone-900">
                  {previewGrad?.adult_cards || 0} Adultos ({formatCurrency(cardValue)} c/u)
                </Badge>
                {previewGrad?.half_cards > 0 && (
                  <Badge variant="outline" className="border-stone-700 text-violet-300 bg-stone-900">
                    {previewGrad.half_cards} Menor 50% ({formatCurrency(cardValue * 0.5)} c/u)
                  </Badge>
                )}
                {previewGrad?.free_under5_cards > 0 && (
                  <Badge variant="outline" className="border-stone-700 text-amber-300 bg-stone-900">
                    {previewGrad.free_under5_cards} Menor &lt;5a (Gratis)
                  </Badge>
                )}
              </div>
              {previewGrad?.cud_cards_detail?.length > 0 && (
                <div className="pt-1.5 text-[11px] text-emerald-400 space-y-0.5 border-t border-stone-850 mt-1">
                  {previewGrad.cud_cards_detail.map((b, i) => (
                    <p key={i} className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Pase CUD: {b.name} (DNI: {b.dni || '-'})
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Pagos */}
            <div className="space-y-1.5">
              <p className="font-semibold text-stone-300">Historial de Entregas y Pagos Registrados:</p>
              {previewGradPayments.length === 0 ? (
                <p className="text-stone-500 italic py-2">No hay entregas registradas a la fecha.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {previewGradPayments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-stone-950 p-2.5 rounded-lg border border-stone-800">
                      <div>
                        <span className="font-bold text-emerald-400 text-sm">{formatCurrency(p.amount)}</span>
                        <span className="text-[11px] text-stone-400 ml-2">· {formatDate(p.date)} ({p.payment_method})</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                        {p.receipt_number}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen Financiero Digital con Suma Dinamica */}
            <div className="bg-stone-950 border border-[#C9A04E]/40 rounded-xl p-3.5 flex justify-between items-center text-sm shadow-inner">
              <div>
                <p className="text-xs text-stone-400">Total Tarjetas: <strong className="text-stone-200">{formatCurrency(previewTotalAmt)}</strong></p>
                <p className="text-xs text-emerald-400 font-medium mt-0.5">Total Abonado: <strong>{formatCurrency(previewPaidAmt)}</strong></p>
              </div>
              <div className="text-right">
                {previewBalanceAmt > 0 ? (
                  <div>
                    <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Saldo Pendiente</p>
                    <p className="text-lg font-bold text-amber-300">{formatCurrency(previewBalanceAmt)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Estado de Cuenta</p>
                    <p className="text-sm font-bold text-emerald-400">¡AL DÍA / CANCELADO!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            {previewGrad?.phone && (
              <Button
                variant="outline"
                className="w-full text-emerald-400 border-emerald-500/50 hover:bg-emerald-950/40 text-xs"
                onClick={() => handleSendWhatsAppStatement(previewGrad)}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar por WhatsApp
              </Button>
            )}
            <Button
              className="w-full bg-[#C9A04E] hover:bg-[#b08b3e] text-black font-bold text-xs"
              onClick={() => handleDownloadIndividualStatement(previewGrad)}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Descargar PDF
            </Button>
            <Button
              variant="outline"
              className="w-full border-stone-700 text-stone-300 hover:bg-stone-800 text-xs"
              onClick={() => setPreviewGrad(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
