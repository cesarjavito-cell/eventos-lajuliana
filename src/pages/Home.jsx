import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, CalendarDays, Home as HomeIcon, FileText, Users, Clock, User, Phone, Sparkles } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import PullToRefresh from '@/components/PullToRefresh';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventData, resData] = await Promise.all([
        base44.entities.Event.list('-start_date', 200),
        base44.entities.CabinReservation.list('-check_in', 200),
      ]);
      setEvents(eventData || []);
      setReservations(resData || []);
    } catch (e) {
      console.error('Error loading calendar data', e);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getItemsForDay = (day) => {
    const items = [];
    events.forEach((ev) => {
      if (ev.start_date) {
        const evDate = parseISO(ev.start_date);
        if (isSameDay(evDate, day)) {
          items.push({
            ...ev,
            color: ev.type === 'egresados' ? 'violet' : 'red',
            label: ev.title || `Evento de ${ev.client_name || 'Cliente'}`,
          });
        }
      }
    });
    reservations.forEach((res) => {
      if (res.check_in && res.check_out) {
        const ci = parseISO(res.check_in);
        const co = parseISO(res.check_out);
        if (day >= ci && day < co) {
          items.push({
            ...res,
            color: 'sky',
            label: `Cabaña ${res.cabin_number || ''} - ${res.client_name || ''}`,
          });
        }
      }
    });
    return items;
  };

  const colorClasses = {
    red: 'bg-red-500 text-white hover:bg-red-600',
    violet: 'bg-violet-500 text-white hover:bg-violet-600',
    sky: 'bg-sky-400 text-white hover:bg-sky-500',
  };

  const formatDateLong = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = parseISO(dateStr);
      return format(d, "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="max-w-6xl mx-auto pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-stone-800">Calendario</h1>
            <p className="text-sm text-stone-500 mt-1">Toca cualquier evento para ver su título completo y detalles</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-display text-lg font-semibold capitalize min-w-[180px] text-center text-stone-800">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" /> Eventos generales
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-violet-500" /> Egresados
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-400" /> Cabañas
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2.5 text-center text-xs font-semibold text-stone-500 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const items = getItemsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    if (items.length === 1) setSelectedItem(items[0]);
                    else if (items.length > 1) setSelectedDayEvents({ day, items });
                  }}
                  className={`min-h-[90px] lg:min-h-[120px] border-r border-b border-stone-100 p-1.5 cursor-pointer hover:bg-amber-50/40 transition-colors ${
                    !inMonth ? 'bg-stone-50/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-stone-800 text-white'
                          : inMonth
                          ? 'text-stone-600'
                          : 'text-stone-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className={`text-[10px] lg:text-xs px-1.5 py-0.5 rounded truncate ${colorClasses[item.color]} cursor-pointer shadow-sm active:scale-95 transition-all`}
                        title={item.label}
                      >
                        {item.label}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-[10px] text-[#C9A04E] font-semibold px-1">+{items.length - 3} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal de Detalle de Evento */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
          <DialogContent className="sm:max-w-md bg-stone-900 border-[#C9A04E]/40 text-stone-100 p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={selectedItem?.color === 'violet' ? 'bg-violet-600 text-white' : selectedItem?.color === 'sky' ? 'bg-sky-400 text-black' : 'bg-red-600 text-white'}>
                  {selectedItem?.color === 'violet' ? 'Egresados' : selectedItem?.color === 'sky' ? 'Reserva Cabaña' : 'Evento'}
                </Badge>
                {selectedItem?.status && (
                  <Badge variant="outline" className="border-stone-700 text-stone-300 capitalize text-xs">
                    {selectedItem.status}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-display font-bold text-[#E6C57A] leading-snug">
                {selectedItem?.title || selectedItem?.label || 'Detalle del Evento'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3 border-y border-stone-800 my-2">
              {/* Fecha */}
              <div className="flex items-start gap-3">
                <CalendarDays className="w-5 h-5 text-[#C9A04E] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-stone-400 font-medium">Fecha del Evento</p>
                  <p className="text-sm font-semibold text-stone-100 capitalize">
                    {selectedItem?.start_date
                      ? formatDateLong(selectedItem.start_date)
                      : selectedItem?.check_in
                      ? `${formatDateLong(selectedItem.check_in)} al ${formatDateLong(selectedItem.check_out)}`
                      : 'Fecha a confirmar'}
                  </p>
                </div>
              </div>

              {/* Horario */}
              {selectedItem?.schedule && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#C9A04E] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-stone-400 font-medium">Horario Estimado</p>
                    <p className="text-sm text-stone-200">{selectedItem.schedule}</p>
                  </div>
                </div>
              )}

              {/* Invitados */}
              {(selectedItem?.number_of_people > 0 || selectedItem?.guests_count > 0) && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-[#C9A04E] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-stone-400 font-medium">Cantidad de Personas</p>
                    <p className="text-sm text-stone-200">{selectedItem.number_of_people || selectedItem.guests_count} invitados</p>
                  </div>
                </div>
              )}

              {/* Anfitrión / Cliente */}
              {(selectedItem?.client_name || selectedItem?.client_phone) && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#C9A04E] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-stone-400 font-medium">Anfitrión / Cliente</p>
                    <p className="text-sm font-medium text-stone-200">{selectedItem.client_name || 'Sin nombre'}</p>
                    {selectedItem.client_phone && (
                      <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> {selectedItem.client_phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notas adicionales */}
              {selectedItem?.notes && (
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs text-stone-300 space-y-1">
                  <p className="font-semibold text-[#E6C57A]">Notas o Observaciones:</p>
                  <p className="leading-relaxed italic">{selectedItem.notes}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="w-full border-stone-700 text-stone-300 hover:bg-stone-800"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Lista cuando hay múltiples eventos el mismo día */}
        <Dialog open={!!selectedDayEvents} onOpenChange={(open) => { if (!open) setSelectedDayEvents(null); }}>
          <DialogContent className="sm:max-w-md bg-stone-900 border-[#C9A04E]/40 text-stone-100 p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-display font-bold text-[#E6C57A]">
                Eventos del {selectedDayEvents?.day ? format(selectedDayEvents.day, "d 'de' MMMM", { locale: es }) : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2 max-h-[300px] overflow-y-auto">
              {selectedDayEvents?.items.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedItem(item);
                    setSelectedDayEvents(null);
                  }}
                  className="p-3 bg-stone-950 rounded-xl border border-stone-800 hover:border-[#C9A04E]/50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-100">{item.title || item.label}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{item.client_name || 'Evento'}</p>
                  </div>
                  <Badge className={item.color === 'violet' ? 'bg-violet-600 text-white' : item.color === 'sky' ? 'bg-sky-400 text-black' : 'bg-red-600 text-white'}>
                    Ver
                  </Badge>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/eventos"
            className="block p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
          >
            <CalendarDays className="w-5 h-5 text-red-500 mb-2" />
            <h3 className="font-semibold text-sm text-stone-800">Registrar evento</h3>
            <p className="text-xs text-stone-500 mt-0.5">Fiestas, egresados y eventos generales</p>
          </Link>
          <Link
            to="/cabanas"
            className="block p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
          >
            <HomeIcon className="w-5 h-5 text-sky-400 mb-2" />
            <h3 className="font-semibold text-sm text-stone-800">Reservar cabaña</h3>
            <p className="text-xs text-stone-500 mt-0.5">Check-in, check-out y pagos</p>
          </Link>
          <Link
            to="/presupuestos"
            className="block p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
          >
            <FileText className="w-5 h-5 text-violet-500 mb-2" />
            <h3 className="font-semibold text-sm text-stone-800">Nuevo presupuesto</h3>
            <p className="text-xs text-stone-500 mt-0.5">Servicios y cálculo automático</p>
          </Link>
        </div>
      </div>
    </PullToRefresh>
  );
}
