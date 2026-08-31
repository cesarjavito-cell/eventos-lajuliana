import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Send, Calendar, Users, Clock, Utensils, Sparkles, Building2, HelpCircle, Phone, User } from 'lucide-react';

const EVENT_TYPES = [
  'Cumpleaños Infantil',
  'Cumpleaños de Adultos',
  'Cumple de 15 años',
  'Casamiento',
  'Aniversario',
  'Reunión Familiar / Asado',
  'Evento Corporativo / Empresarial',
  'Egresados',
  'Otro',
];

const GASTRONOMY_OPTIONS = [
  'Entraditas',
  'Finger Food',
  'Galeto deshuesado Relleno',
  'Asado Completo',
  'Menú Mixto / Doblón (Gastronomía + Vajilla Diferenciada)',
  'Ninguno, no deseo servicio de gastronomía',
];

const PASTRY_OPTIONS = [
  'Torta Real + Maqueta Decorada',
  'Mesa de Dulces',
  'Sin Pastelería',
];

const GENERAL_SERVICES = [
  'Recepcionistas',
  'Mozos',
  'Bartender',
  'Decoración Fondo de Torta',
  'Decoración Completa',
  'DJ',
  'Animador',
  'Ninguno de estos servicios',
];

const FURNITURE_OPTIONS = [
  'Mesas',
  'Sillas Tiffany',
  'Mantelería',
  'Vajillas Completas',
];

const SPECIAL_EQUIPMENT = [
  'Proyector y Pantalla Gigante',
  'Sillón de 15 Años',
  'Cabina Selfie',
  'Ninguno de estos elementos',
];

const VISIT_OPTIONS = [
  'Sí, me gustaría ir por la mañana (9 a 12 hs)',
  'Sí, me gustaría ir por la tarde (17 a 19 hs)',
  'Sí, pero necesito coordinar otro horario',
  'Por el momento no, gracias',
];

export default function CotizarPublic() {
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    event_date: '',
    schedule: 'Evento de Noche',
    guests_count: '',
    event_type: 'Cumpleaños de Adultos',
    selected_gastronomy: [],
    selected_pastry: [],
    selected_general_services: [],
    selected_furniture: [],
    selected_special_equipment: [],
    visit_preference: 'Por el momento no, gracias',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleArrayItem = (field, value) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((i) => i !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.client_phone.trim()) {
      alert('Por favor, ingresa tu Nombre, Apellido y WhatsApp de contacto.');
      return;
    }

    setSubmitting(true);
    try {
      const quoteData = {
        id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim(),
        event_date: form.event_date || '',
        schedule: form.schedule,
        guests_count: Number(form.guests_count) || 0,
        event_type: form.event_type,
        selected_gastronomy: form.selected_gastronomy,
        selected_pastry: form.selected_pastry,
        selected_general_services: form.selected_general_services,
        selected_furniture: form.selected_furniture,
        selected_special_equipment: form.selected_special_equipment,
        visit_preference: form.visit_preference,
        notes: form.notes,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      await base44.entities.QuoteRequest.create(quoteData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al enviar la solicitud. Por favor intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-stone-800 border border-[#C9A04E]/40 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-emerald-900/50 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#E6C57A]">¡Solicitud Enviada!</h1>
            <p className="text-stone-300 text-sm mt-2">
              Muchas gracias <strong>{form.client_name}</strong>. Hemos recibido tu solicitud para el evento.
            </p>
            <p className="text-xs text-stone-400 mt-4 leading-relaxed bg-stone-900/60 p-4 rounded-xl border border-stone-700">
              Nos pondremos en contacto contigo a través de WhatsApp al <strong>{form.client_phone}</strong> a la brevedad con tu presupuesto detallado.
            </p>
          </div>
          <Button
            onClick={() => {
              setSubmitted(false);
              setForm({
                client_name: '',
                client_phone: '',
                event_date: '',
                schedule: 'Evento de Noche',
                guests_count: '',
                event_type: 'Cumpleaños de Adultos',
                selected_gastronomy: [],
                selected_pastry: [],
                selected_general_services: [],
                selected_furniture: [],
                selected_special_equipment: [],
                visit_preference: 'Por el momento no, gracias',
                notes: '',
              });
            }}
            variant="outline"
            className="border-[#C9A04E] text-[#E6C57A] hover:bg-[#C9A04E]/10 w-full"
          >
            Enviar otra solicitud
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-16">
      {/* Banner Superior Oficial */}
      <div className="w-full bg-stone-900 border-b border-[#C9A04E]/30 overflow-hidden shadow-xl">
        <img
          src="/banner_cotizacion.jpg"
          alt="Quinta La Juliana - Solicitud de Presupuesto"
          className="w-full max-h-[320px] object-cover object-center mx-auto"
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-stone-900/90 backdrop-blur-md border border-[#C9A04E]/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <p className="text-xs sm:text-sm text-stone-300 mb-6 leading-relaxed bg-stone-950/60 p-4 rounded-xl border border-stone-800">
            Gracias por elegirnos para tu evento. Por favor, completa los siguientes datos para que podamos registrar tu solicitud o enviarte un presupuesto detallado. Nos pondremos en contacto contigo a la brevedad.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Datos del Anfitrión & Evento */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#E6C57A] flex items-center gap-2 border-b border-stone-800 pb-2">
                <User className="w-5 h-5 text-[#C9A04E]" /> 1. Datos del Anfitrión y Evento
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-stone-300 text-xs">Nombre y Apellido *</Label>
                  <div className="relative mt-1">
                    <User className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      required
                      placeholder="Ej: Juan Pérez"
                      value={form.client_name}
                      onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
                      className="bg-stone-950 border-stone-800 text-stone-100 pl-10 focus:border-[#C9A04E]"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-stone-300 text-xs">Teléfono de Contacto (WhatsApp) *</Label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      required
                      placeholder="Ej: 341 1234567"
                      value={form.client_phone}
                      onChange={(e) => setForm((p) => ({ ...p, client_phone: e.target.value }))}
                      className="bg-stone-950 border-stone-800 text-stone-100 pl-10 focus:border-[#C9A04E]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <Label className="text-stone-300 text-xs">Fecha Solicitada</Label>
                  <Input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
                    className="bg-stone-950 border-stone-800 text-stone-100 mt-1 focus:border-[#C9A04E]"
                  />
                </div>

                <div>
                  <Label className="text-stone-300 text-xs">Horario Estimado</Label>
                  <select
                    value={form.schedule}
                    onChange={(e) => setForm((p) => ({ ...p, schedule: e.target.value }))}
                    className="w-full h-10 rounded-md bg-stone-950 border border-stone-800 text-stone-100 text-sm px-3 mt-1 focus:border-[#C9A04E]"
                  >
                    <option value="Evento de Día">Evento de Día</option>
                    <option value="Evento de Noche">Evento de Noche</option>
                  </select>
                </div>

                <div>
                  <Label className="text-stone-300 text-xs">Cantidad de Invitados Aprox.</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 80"
                    value={form.guests_count}
                    onChange={(e) => setForm((p) => ({ ...p, guests_count: e.target.value }))}
                    className="bg-stone-950 border-stone-800 text-stone-100 mt-1 focus:border-[#C9A04E]"
                  />
                </div>
              </div>

              <div>
                <Label className="text-stone-300 text-xs">Tipo de Evento</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {EVENT_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setForm((p) => ({ ...p, event_type: type }))}
                      className={`text-xs p-2.5 rounded-lg border text-left transition-all ${
                        form.event_type === type
                          ? 'bg-[#C9A04E]/20 border-[#C9A04E] text-[#E6C57A] font-medium'
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Gastronomía & Pastelería */}
            <div className="space-y-4 pt-4 border-t border-stone-800">
              <h2 className="text-lg font-semibold text-[#E6C57A] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Utensils className="w-5 h-5 text-[#C9A04E]" /> 2. Gastronomía & Pastelería
              </h2>

              <div>
                <Label className="text-stone-300 text-xs font-semibold block mb-2">Gastronomía (Marca los servicios deseados):</Label>
                <div className="space-y-2">
                  {GASTRONOMY_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg bg-stone-950/60 border border-stone-800 hover:border-stone-700 cursor-pointer">
                      <Checkbox
                        checked={form.selected_gastronomy.includes(opt)}
                        onCheckedChange={() => toggleArrayItem('selected_gastronomy', opt)}
                      />
                      <span className="text-xs text-stone-200">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Label className="text-stone-300 text-xs font-semibold block mb-2">Pastelería:</Label>
                <div className="space-y-2">
                  {PASTRY_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg bg-stone-950/60 border border-stone-800 hover:border-stone-700 cursor-pointer">
                      <Checkbox
                        checked={form.selected_pastry.includes(opt)}
                        onCheckedChange={() => toggleArrayItem('selected_pastry', opt)}
                      />
                      <span className="text-xs text-stone-200">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Servicios Generales, Mobiliario & Equipamiento */}
            <div className="space-y-4 pt-4 border-t border-stone-800">
              <h2 className="text-lg font-semibold text-[#E6C57A] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Sparkles className="w-5 h-5 text-[#C9A04E]" /> 3. Servicios Generales & Equipamiento
              </h2>

              <div>
                <Label className="text-stone-300 text-xs font-semibold block mb-2">Servicios Generales:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GENERAL_SERVICES.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg bg-stone-950/60 border border-stone-800 hover:border-stone-700 cursor-pointer">
                      <Checkbox
                        checked={form.selected_general_services.includes(opt)}
                        onCheckedChange={() => toggleArrayItem('selected_general_services', opt)}
                      />
                      <span className="text-xs text-stone-200">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-stone-300 text-xs font-semibold block mb-2">Mobiliario y Otros:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FURNITURE_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg bg-stone-950/60 border border-stone-800 hover:border-stone-700 cursor-pointer">
                      <Checkbox
                        checked={form.selected_furniture.includes(opt)}
                        onCheckedChange={() => toggleArrayItem('selected_furniture', opt)}
                      />
                      <span className="text-xs text-stone-200">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-stone-300 text-xs font-semibold block mb-2">Equipamiento Especial:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SPECIAL_EQUIPMENT.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg bg-stone-950/60 border border-stone-800 hover:border-stone-700 cursor-pointer">
                      <Checkbox
                        checked={form.selected_special_equipment.includes(opt)}
                        onCheckedChange={() => toggleArrayItem('selected_special_equipment', opt)}
                      />
                      <span className="text-xs text-stone-200">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Visita a la Quinta & Consultas */}
            <div className="space-y-4 pt-4 border-t border-stone-800">
              <h2 className="text-lg font-semibold text-[#E6C57A] flex items-center gap-2 border-b border-stone-800 pb-2">
                <Building2 className="w-5 h-5 text-[#C9A04E]" /> 4. Coordinar Visita a la Quinta
              </h2>

              <div>
                <Label className="text-stone-300 text-xs leading-relaxed block mb-2">
                  ¿Quisiera concretar una visita a la Quinta para conocerla y ultimar detalles? <em>(Nos encontramos de 9 a 12 y de 17 a 19 hs. Si necesitas otro horario, lo coordinamos).</em>
                </Label>
                <div className="space-y-2 mt-2">
                  {VISIT_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setForm((p) => ({ ...p, visit_preference: opt }))}
                      className={`w-full text-left text-xs p-3 rounded-lg border transition-all ${
                        form.visit_preference === opt
                          ? 'bg-[#C9A04E]/20 border-[#C9A04E] text-[#E6C57A] font-medium'
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-stone-300 text-xs">¿Tienes alguna duda, consulta o pedido especial?</Label>
                <textarea
                  rows={3}
                  placeholder="Escribe aquí cualquier comentario o consulta adicional..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg p-3 text-xs mt-1 focus:border-[#C9A04E] outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C9A04E] hover:bg-[#b08b3e] text-black font-semibold h-12 text-base shadow-xl rounded-xl"
            >
              {submitting ? 'Enviando Solicitud...' : '✨ Enviar Solicitud de Presupuesto'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
