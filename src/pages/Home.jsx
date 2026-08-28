import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, CalendarDays, Home as HomeIcon, FileText } from 'lucide-react';
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
import { Link } from 'react-router-dom';
import PullToRefresh from '@/components/PullToRefresh';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

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
            label: ev.title,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-800">Calendario</h1>
          <p className="text-sm text-stone-500 mt-1">Vista mensual de eventos y reservas</p>
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
                className={`min-h-[90px] lg:min-h-[120px] border-r border-b border-stone-100 p-1.5 ${
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
                      className={`text-[10px] lg:text-xs px-1.5 py-0.5 rounded truncate ${colorClasses[item.color]} cursor-pointer transition-colors`}
                      title={item.label}
                    >
                      {item.label}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-stone-400 px-1">+{items.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
