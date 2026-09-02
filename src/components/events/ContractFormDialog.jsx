import React, { useState, useEffect } from 'react';
import { FileText, Printer, Save, Calendar, User, Phone, MapPin, Users, DollarSign, CheckCircle2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { generateContractPdf } from '@/lib/contractPdf';

export default function ContractFormDialog({
  open,
  onOpenChange,
  event,
  servicesToShow = [],
  settings,
  onSaveContract,
}) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    contract_date: new Date().toISOString().slice(0, 10),
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
  });

  useEffect(() => {
    if (event) {
      const existing = event.contract_data || {};
      setFormData({
        contract_date: existing.contract_date || new Date().toISOString().slice(0, 10),
        client_name: existing.client_name || event.client_name || event.title || '',
        client_dni: existing.client_dni || event.client_dni || '',
        client_address: existing.client_address || event.client_address || '',
        client_phone: existing.client_phone || event.client_phone || '',
        event_date: existing.event_date || (event.start_date ? event.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        start_time: existing.start_time || '21:00 hs',
        end_time: existing.end_time || '04:30 hs del día siguiente',
        guests_count: existing.guests_count || event.guests_count || 60,
        diners_count: existing.diners_count || event.diners_count || existing.guests_count || event.guests_count || 40,
        deposit_amount: existing.deposit_amount !== undefined ? existing.deposit_amount : (event.deposit_amount || 0),
        installments_info: existing.installments_info || 'se convienen según el presupuesto convenido entre las partes',
      });
    }
  }, [event, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.client_name.trim()) {
      toast({ title: 'Por favor ingrese el nombre del cliente', variant: 'destructive' });
      return;
    }
    await onSaveContract(formData);
    toast({ title: 'Datos del contrato guardados correctamente' });
    onOpenChange(false);
  };

  const handlePrintPdf = async () => {
    if (!formData.client_name.trim()) {
      toast({ title: 'Por favor ingrese el nombre del cliente', variant: 'destructive' });
      return;
    }
    await onSaveContract(formData);
    try {
      await generateContractPdf({ event, contractData: formData, servicesToShow, settings });
      toast({ title: 'Contrato PDF generado con éxito' });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al generar el PDF del contrato', variant: 'destructive' });
    }
  };

  if (!event) return null;

  const actualServices = servicesToShow && servicesToShow.length > 0
    ? servicesToShow
    : (event?.selected_services && event.selected_services.length > 0)
      ? event.selected_services
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-900 text-lg">
            <FileText className="w-5 h-5 text-violet-600" />
            {event.contract_data ? 'Ver / Editar Contrato de Locación' : 'Generar Contrato de Locación de Servicios'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Preview of Services Tildados en el Registro */}
          <div className="bg-violet-50/80 border border-violet-200 rounded-xl p-3.5 space-y-2">
            <h4 className="font-semibold text-violet-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-violet-600" /> Servicios Contratados en el Registro ({actualServices.length})
            </h4>
            {actualServices.length === 0 ? (
              <p className="text-stone-500 italic">No se registran servicios específicos tildados (se incluirán los servicios base por defecto).</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {actualServices.map((s, idx) => (
                  <Badge key={idx} className="bg-white text-violet-900 border border-violet-300 font-medium text-[11px] py-1 px-2.5 shadow-xs">
                    ✓ {s.service_name || s.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Seccion 1: Datos del Cliente */}
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

          {/* Seccion 2: Logistica y Horarios */}
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

          {/* Seccion 3: Asistentes y Comensales */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
            <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-violet-600" /> Invitados vs Comensales (Cena)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cantidad de Invitados Totales</Label>
                <Input
                  type="number"
                  placeholder="Ej: 60"
                  value={formData.guests_count}
                  onChange={(e) => handleChange('guests_count', e.target.value)}
                />
                <p className="text-[10px] text-stone-400">Total de personas que asisten al salón</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cantidad de Comensales (Cena)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 40"
                  value={formData.diners_count}
                  onChange={(e) => handleChange('diners_count', e.target.value)}
                />
                <p className="text-[10px] text-stone-400">Comensales que formarán parte del plato principal</p>
              </div>
            </div>
          </div>

          {/* Seccion 4: Seña y Plan de Pagos */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
            <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-violet-600" /> Reserva, Seña y Plan de Cuotas
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Monto de Seña Abonado ($)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 200000"
                  value={formData.deposit_amount}
                  onChange={(e) => handleChange('deposit_amount', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Detalle de Cuotas / Convenio de Pago</Label>
                <Input
                  placeholder="Ej: 5 Cuotas mensuales de $ 120.000"
                  value={formData.installments_info}
                  onChange={(e) => handleChange('installments_info', e.target.value)}
                />
              </div>
            </div>
          </div>
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
