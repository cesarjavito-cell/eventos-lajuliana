import React, { useState, useEffect } from 'react';
import { FileText, Printer, Save, Calendar, User, Phone, MapPin, Users, DollarSign, CheckCircle2, GraduationCap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { generateContractPdf } from '@/lib/contractPdf';
import { formatCurrency } from '@/lib/pricing';

export default function ContractFormDialog({
  open,
  onOpenChange,
  event,
  servicesToShow = [],
  settings,
  onSaveContract,
}) {
  const { toast } = useToast();
  const isEgresados = event?.type === 'egresados';

  const [formData, setFormData] = useState({
    contract_date: new Date().toISOString().slice(0, 10),
    // General fields
    client_name: '',
    client_dni: '',
    client_address: '',
    client_phone: '',
    event_date: new Date().toISOString().slice(0, 10),
    start_time: '21:00 hs',
    end_time: '04:30 hs del día siguiente',
    guests_count: 60,
    diners_count: 40,
    deposit_amount: 0,
    installments_info: 'se convienen según el presupuesto convenido entre las partes',

    // Egresados fields
    school_name: '',
    card_value: 170000,
    after_card_value: 60000,
    cutoff_date: new Date().toISOString().slice(0, 10),
    ticket_sales_close_date: new Date().toISOString().slice(0, 10),
    after_date: new Date().toISOString().slice(0, 10),
    after_start_time: '06:00 hs',
    after_end_time: '13:00 hs',
    advance_cards_count: 6,
    catering_menu_text: 'Menú 3: ASADO\nMENU: Entrada (Sand. Miga, Empanadas varias, Canastitas Españolas, Brusquetas, Pizzas)\nCarne Vacuna, Carne de Pollo, Chorizo y Morcilla\n4 variedades de ensaladas.',
  });

  useEffect(() => {
    if (event) {
      const existing = event.contract_data || {};
      const evDate = event.start_date ? event.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const evDateTime = new Date(evDate).getTime();

      const defaultCutoff = new Date(evDateTime - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const defaultSalesClose = new Date(evDateTime - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const defaultAfter = new Date(evDateTime + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      setFormData({
        contract_date: existing.contract_date || new Date().toISOString().slice(0, 10),
        client_name: existing.client_name || event.client_name || event.title || '',
        client_dni: existing.client_dni || event.client_dni || '',
        client_address: existing.client_address || event.client_address || '',
        client_phone: existing.client_phone || event.client_phone || '',
        event_date: existing.event_date || evDate,
        start_time: existing.start_time || (isEgresados ? '20:30 hs' : '21:00 hs'),
        end_time: existing.end_time || '04:30 hs',
        guests_count: existing.guests_count || event.guests_count || 60,
        diners_count: existing.diners_count || event.diners_count || existing.guests_count || event.guests_count || 40,
        deposit_amount: existing.deposit_amount !== undefined ? existing.deposit_amount : (isEgresados ? 30000 : (event.deposit_amount || 0)),
        installments_info: existing.installments_info || 'se convienen según el presupuesto convenido entre las partes',

        // Egresados
        school_name: existing.school_name || event.title || 'E.P.E.T. N° 1 – Informática',
        card_value: existing.card_value || event.card_value || 170000,
        after_card_value: existing.after_card_value || 60000,
        cutoff_date: existing.cutoff_date || defaultCutoff,
        ticket_sales_close_date: existing.ticket_sales_close_date || defaultSalesClose,
        after_date: existing.after_date || defaultAfter,
        after_start_time: existing.after_start_time || '06:00 hs',
        after_end_time: existing.after_end_time || '13:00 hs',
        advance_cards_count: existing.advance_cards_count || 6,
        catering_menu_text: existing.catering_menu_text || 'Menú 3: ASADO\nMENU: Entrada (Sand. Miga, Empanadas varias, Canastitas Españolas, Brusquetas, Pizzas)\nCarne Vacuna, Carne de Pollo, Chorizo y Morcilla\n4 variedades de ensaladas.',
      });
    }
  }, [event, open, isEgresados]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const dataToSave = { ...formData, is_egresados: isEgresados };
    await onSaveContract(dataToSave);
    toast({ title: 'Datos del contrato guardados correctamente' });
    onOpenChange(false);
  };

  const handlePrintPdf = async () => {
    const dataToSave = { ...formData, is_egresados: isEgresados };
    await onSaveContract(dataToSave);
    try {
      await generateContractPdf({ event, contractData: dataToSave, servicesToShow, settings });
      toast({ title: 'Contrato PDF generado con éxito' });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al generar el PDF del contrato', variant: 'destructive' });
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-900 text-lg">
            {isEgresados ? <GraduationCap className="w-5 h-5 text-violet-600" /> : <FileText className="w-5 h-5 text-violet-600" />}
            {event.contract_data
              ? `Ver / Editar Contrato ${isEgresados ? 'de Egresados' : 'de Locación'}`
              : `Generar Contrato ${isEgresados ? 'de Egresados (5 Páginas)' : 'de Locación de Servicios'}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* ========================================================================= */}
          {/* FORMULARIO ESPECÍFICO PARA EGRESADOS */}
          {/* ========================================================================= */}
          {isEgresados ? (
            <>
              {/* Seccion 1: Colegio y Locatario (Grupo de Padres) */}
              <div className="bg-violet-50/80 border border-violet-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-violet-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-violet-600" /> Colegio / Institución & Locatario (Grupo de Padres)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre del Colegio / División</Label>
                    <Input
                      placeholder="Ej: E.P.E.T. N° 1 – Informática"
                      value={formData.school_name}
                      onChange={(e) => handleChange('school_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha de Firma del Contrato</Label>
                    <Input
                      type="date"
                      value={formData.contract_date}
                      onChange={(e) => handleChange('contract_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Seccion 2: Precios de Tarjetas & Fechas de Tope */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-violet-600" /> Tarifas de Tarjetas & Fechas de Congelamiento
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Precio Tarjeta CENA por Persona ($)</Label>
                    <Input
                      type="number"
                      value={formData.card_value}
                      onChange={(e) => handleChange('card_value', e.target.value)}
                    />
                    <p className="text-[10px] text-stone-400">Tarifa fija hasta la fecha de congelamiento (7 días antes)</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio Tarjeta DESPUÉS DE CENA ($)</Label>
                    <Input
                      type="number"
                      value={formData.after_card_value}
                      onChange={(e) => handleChange('after_card_value', e.target.value)}
                    />
                    <p className="text-[10px] text-stone-400">Tarifa para trasnochadores (mayores de 18 años)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha Tope de Congelamiento (7 días antes)</Label>
                    <Input
                      type="date"
                      value={formData.cutoff_date}
                      onChange={(e) => handleChange('cutoff_date', e.target.value)}
                    />
                    <p className="text-[10px] text-amber-700">Pasada esta fecha aplica recargo del 20% (+{formatCurrency(formData.card_value * 0.2)})</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha de Cierre de Venta de Tarjetas</Label>
                    <Input
                      type="date"
                      value={formData.ticket_sales_close_date}
                      onChange={(e) => handleChange('ticket_sales_close_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Seccion 3: Seña en Tarjetas & Depósito de Garantía */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-violet-600" /> Anticipo de Reserva & Depósito de Imprevistos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Anticipo Reserva (Cantidad de Tarjetas)</Label>
                    <Input
                      type="number"
                      value={formData.advance_cards_count}
                      onChange={(e) => handleChange('advance_cards_count', e.target.value)}
                    />
                    <p className="text-[10px] text-stone-400">Default: 6 tarjetas de egresados</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Depósito de Garantía por Imprevistos ($)</Label>
                    <Input
                      type="number"
                      value={formData.deposit_amount}
                      onChange={(e) => handleChange('deposit_amount', e.target.value)}
                    />
                    <p className="text-[10px] text-stone-400">Reembolsable al finalizar el evento (Default: $30.000)</p>
                  </div>
                </div>
              </div>

              {/* Seccion 4: Horarios de Fiesta & After Hours */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-violet-600" /> Horarios del Evento y Párrafo de After Hours
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Día del Evento (Fiesta)</Label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => handleChange('event_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horario Inicio Fiesta</Label>
                    <Input
                      value={formData.start_time}
                      onChange={(e) => handleChange('start_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horario Fin Fiesta</Label>
                    <Input
                      value={formData.end_time}
                      onChange={(e) => handleChange('end_time', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-200">
                  <div className="space-y-1">
                    <Label className="text-xs">Día del After Hours (Al día siguiente)</Label>
                    <Input
                      type="date"
                      value={formData.after_date}
                      onChange={(e) => handleChange('after_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horario Inicio After</Label>
                    <Input
                      value={formData.after_start_time}
                      onChange={(e) => handleChange('after_start_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horario Fin After</Label>
                    <Input
                      value={formData.after_end_time}
                      onChange={(e) => handleChange('after_end_time', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Seccion 5: Menú Elegido (Anexo I Catering) */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider">
                  🍽️ Menú Elegido por los Egresados (Anexo I - Categoría Catering)
                </h4>
                <Textarea
                  rows={4}
                  className="text-xs font-mono bg-white"
                  placeholder="Detalle el menú seleccionado (ej: Menú 3 ASADO...)"
                  value={formData.catering_menu_text}
                  onChange={(e) => handleChange('catering_menu_text', e.target.value)}
                />
              </div>
            </>
          ) : (
            /* ========================================================================= */
            /* FORMULARIO EVENTOS GENERALES */
            /* ========================================================================= */
            <>
              <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-xl p-3.5 space-y-2">
                <h4 className="font-semibold text-violet-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-violet-600" /> Servicios Contratados en el Registro ({servicesToShow.length})
                </h4>
                {servicesToShow.length === 0 ? (
                  <p className="text-stone-500 italic">No se registran servicios específicos tildados (se incluirán los servicios base por defecto).</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {servicesToShow.map((s, idx) => (
                      <Badge key={idx} className="bg-white text-violet-900 border border-violet-300 font-medium text-[11px] py-1 px-2.5 shadow-xs">
                        ✓ {s.service_name || s.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-violet-600" /> Datos del Locatario (Cliente)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre Completo del Cliente</Label>
                    <Input
                      placeholder="Ej: Pessoa Gabriela Inés"
                      value={formData.client_name}
                      onChange={(e) => handleChange('client_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">N° de DNI / CUIT</Label>
                    <Input
                      placeholder="Ej: 31.759.379"
                      value={formData.client_dni}
                      onChange={(e) => handleChange('client_dni', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Domicilio Completo</Label>
                    <Input
                      placeholder="Ej: Noruega N° 1544, Posadas"
                      value={formData.client_address}
                      onChange={(e) => handleChange('client_address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono de Contacto</Label>
                    <Input
                      placeholder="Ej: 3764828294"
                      value={formData.client_phone}
                      onChange={(e) => handleChange('client_phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-violet-600" /> Logística y Fechas del Evento
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha de Firma del Contrato</Label>
                    <Input
                      type="date"
                      value={formData.contract_date}
                      onChange={(e) => handleChange('contract_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Día del Evento</Label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => handleChange('event_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horario de Inicio</Label>
                    <Input
                      placeholder="Ej: 21:00 hs"
                      value={formData.start_time}
                      onChange={(e) => handleChange('start_time', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Horario de Finalización</Label>
                    <Input
                      placeholder="Ej: 04:30 hs del día siguiente"
                      value={formData.end_time}
                      onChange={(e) => handleChange('end_time', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-violet-600" /> Invitados vs Comensales (Cena)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad de Invitados Totales</Label>
                    <Input
                      type="number"
                      value={formData.guests_count}
                      onChange={(e) => handleChange('guests_count', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad de Comensales (Cena)</Label>
                    <Input
                      type="number"
                      value={formData.diners_count}
                      onChange={(e) => handleChange('diners_count', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-violet-600" /> Reserva, Seña y Plan de Cuotas
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Monto de Seña Abonado ($)</Label>
                    <Input
                      type="number"
                      value={formData.deposit_amount}
                      onChange={(e) => handleChange('deposit_amount', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Detalle de Cuotas / Convenio de Pago</Label>
                    <Input
                      value={formData.installments_info}
                      onChange={(e) => handleChange('installments_info', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-200">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="secondary" className="bg-stone-200 hover:bg-stone-300 text-stone-800" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" /> Guardar Datos
          </Button>
          <Button className="bg-violet-700 hover:bg-violet-800 text-white font-bold" onClick={handlePrintPdf}>
            <Printer className="w-4 h-4 mr-1.5" /> Imprimir Contrato PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
