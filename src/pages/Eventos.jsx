import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { useEventsQuery, useDeleteEvent, EVENTS_KEY } from '@/hooks/useEntityQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, EVENT_TYPE_LABELS } from '@/lib/pricing';
import EventFormDialog from '@/components/events/EventFormDialog';
import EventDetailDialog from '@/components/events/EventDetailDialog';
import PullToRefresh from '@/components/PullToRefresh';
import { useUrlDialog } from '@/hooks/useUrlDialog';

const TYPE_COLORS = {
  general: 'bg-red-100 text-red-700 hover:bg-red-100',
  egresados: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  fiesta_particular: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
};

export default function Eventos() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: events = [], isLoading: loading, refetch } = useEventsQuery();
  const deleteEvent = useDeleteEvent();
  const formDialog = useUrlDialog('eventForm');
  const detailDialog = useUrlDialog('viewEvent');
  const formOpen = formDialog.isOpen;
  const editingEvent = formDialog.paramValue && formDialog.paramValue !== 'new'
    ? events.find((e) => e.id === formDialog.paramValue) : null;
  const detailOpen = detailDialog.isOpen;
  const detailEvent = detailDialog.paramValue
    ? events.find((e) => e.id === detailDialog.paramValue) : null;
  const [filter, setFilter] = useState('all');

  const handleDelete = async (event) => {
    if (!confirm(`¿Eliminar "${event.title}"?`)) return;
    await deleteEvent.mutateAsync(event.id);
    toast({ title: 'Evento eliminado' });
  };

  const handleEventUpdated = (updated) => {
    qc.setQueryData(EVENTS_KEY, (old) => (old || []).map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleEventDeleted = () => {
    qc.invalidateQueries(EVENTS_KEY);
    detailDialog.close();
  };

  const filtered = events
    .filter((e) => filter === 'all' || e.type === filter)
    .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refetch}>
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-800">Eventos</h1>
          <p className="text-sm text-stone-500 mt-1">Registro de fiestas, egresados y eventos generales</p>
        </div>
        <Button onClick={() => formDialog.open('new')}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo evento
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="general">Generales</TabsTrigger>
          <TabsTrigger value="egresados">Egresados</TabsTrigger>
          <TabsTrigger value="fiesta_particular">Fiestas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-stone-400 text-sm">No hay eventos en esta categoría.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map((event) => {
              const balance = (event.total_amount || 0) - (event.paid_amount || 0);
              return (
                <div key={event.id} className="flex items-center gap-3 p-4 hover:bg-stone-50">
                  <div className={`w-1.5 h-12 rounded-full ${event.type === 'egresados' ? 'bg-violet-500' : 'bg-red-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-stone-800 truncate">{event.title}</span>
                      <Badge variant="outline" className={TYPE_COLORS[event.type]}>
                        {EVENT_TYPE_LABELS[event.type]}
                      </Badge>
                      <Badge variant="secondary">{event.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-1">
                      <span>{formatDate(event.start_date)}</span>
                      {event.client_name && <span>· {event.client_name}</span>}
                      {event.type === 'egresados' && event.card_value > 0 ? (
                        <span>· {Math.floor((event.paid_amount || 0) / event.card_value)} pers. pagas</span>
                      ) : event.number_of_people > 0 ? (
                        <span>· {event.number_of_people} pers.</span>
                      ) : null}
                      {event.total_amount > 0 && (
                        <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                          · {formatCurrency(event.paid_amount)}/{formatCurrency(event.total_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => detailDialog.open(event.id)} title="Ver detalle">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => formDialog.open(event.id)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(event)} title="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EventFormDialog
        event={editingEvent}
        open={formOpen}
        onOpenChange={(open) => { if (!open) formDialog.close(); }}
        onSaved={() => {}}
      />
      <EventDetailDialog
        event={detailEvent}
        open={detailOpen}
        onOpenChange={(open) => { if (!open) detailDialog.close(); }}
        onEventUpdated={handleEventUpdated}
        onDeleteEvent={handleEventDeleted}
      />
    </div>
    </PullToRefresh>
  );
}
