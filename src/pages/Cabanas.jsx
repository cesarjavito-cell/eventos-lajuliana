import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, Home } from 'lucide-react';
import { useCabinsQuery, useReservationsQuery, useDeleteReservation, RESERVATIONS_KEY } from '@/hooks/useEntityQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/pricing';
import ReservationFormDialog from '@/components/cabins/ReservationFormDialog';
import ReservationDetailDialog from '@/components/cabins/ReservationDetailDialog';
import PullToRefresh from '@/components/PullToRefresh';
import { useUrlDialog } from '@/hooks/useUrlDialog';

export default function Cabanas() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: cabins = [] } = useCabinsQuery();
  const { data: reservations = [], isLoading: loading, refetch } = useReservationsQuery();
  const deleteReservation = useDeleteReservation();
  const formDialog = useUrlDialog('resForm');
  const detailDialog = useUrlDialog('viewRes');
  const formOpen = formDialog.isOpen;
  const editingRes = formDialog.paramValue && formDialog.paramValue !== 'new'
    ? reservations.find((r) => r.id === formDialog.paramValue) : null;
  const detailOpen = detailDialog.isOpen;
  const detailRes = detailDialog.paramValue
    ? reservations.find((r) => r.id === detailDialog.paramValue) : null;

  const handleDelete = async (res) => {
    if (!confirm(`¿Eliminar la reserva de ${res.client_name}?`)) return;
    await deleteReservation.mutateAsync(res.id);
    toast({ title: 'Reserva eliminada' });
  };

  const handleUpdated = (updated) => {
    qc.setQueryData(RESERVATIONS_KEY, (old) => (old || []).map((r) => (r.id === updated.id ? updated : r)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = reservations.filter((r) => r.check_in >= today);
  const past = reservations.filter((r) => r.check_in < today);

  return (
    <PullToRefresh onRefresh={refetch}>
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-800">Cabañas</h1>
          <p className="text-sm text-stone-500 mt-1">Reservas, check-in/out y pagos</p>
        </div>
        <Button onClick={() => formDialog.open('new')}>
          <Plus className="w-4 h-4 mr-1" /> Nueva reserva
        </Button>
      </div>

      {/* Cabin overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {cabins.map((cab) => {
          const activeRes = reservations.find(
            (r) => r.cabin_id === cab.id && r.check_in <= today && r.check_out > today && r.status !== 'cancelada'
          );
          return (
            <div
              key={cab.id}
              className={`rounded-lg border p-3 text-center ${
                activeRes ? 'border-sky-300 bg-sky-50' : 'border-stone-200 bg-white'
              }`}
            >
              <Home className={`w-5 h-5 mx-auto mb-1 ${activeRes ? 'text-sky-500' : 'text-stone-400'}`} />
              <p className="text-xs font-semibold text-stone-800 truncate">{cab.name}</p>
              <p className="text-[10px] text-stone-500">N° {cab.number}</p>
              <Badge variant="secondary" className="mt-1 text-[10px]">
                {activeRes ? 'Ocupada' : 'Libre'}
              </Badge>
            </div>
          );
        })}
        {cabins.length === 0 && (
          <p className="col-span-full text-center text-sm text-stone-400 py-4">
            No hay cabañas cargadas. Configúralas en Ajustes.
          </p>
        )}
      </div>

      {/* Upcoming reservations */}
      <h2 className="font-semibold text-stone-700 mb-3">Próximas reservas</h2>
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
        {upcoming.length === 0 ? (
          <p className="p-6 text-center text-stone-400 text-sm">No hay próximas reservas.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {upcoming.map((res) => {
              const balance = (res.total_amount || 0) - (res.paid_amount || 0);
              return (
                <div key={res.id} className="flex items-center gap-3 p-4 hover:bg-stone-50">
                  <div className="w-1.5 h-12 rounded-full bg-sky-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-stone-800">{res.cabin_name}</span>
                      <Badge variant="secondary">{res.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-1">
                      <span>{res.client_name}</span>
                      <span>· In: {formatDate(res.check_in)}</span>
                      <span>· Out: {formatDate(res.check_out)}</span>
                      <span>· {res.number_of_people || '-'} pers.</span>
                      <span>· {res.nights} noche(s)</span>
                      <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                        · {formatCurrency(res.paid_amount)}/{formatCurrency(res.total_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => detailDialog.open(res.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => formDialog.open(res.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(res)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past reservations */}
      {past.length > 0 && (
        <>
          <h2 className="font-semibold text-stone-700 mb-3">Reservas anteriores</h2>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="divide-y divide-stone-100">
              {past.map((res) => {
                const balance = (res.total_amount || 0) - (res.paid_amount || 0);
                return (
                  <div key={res.id} className="flex items-center gap-3 p-4 hover:bg-stone-50 opacity-75">
                    <div className="w-1.5 h-10 rounded-full bg-stone-300" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm text-stone-700">{res.cabin_name} - {res.client_name}</span>
                      <div className="flex gap-x-3 text-xs text-stone-500 mt-0.5">
                        <span>{formatDate(res.check_in)} → {formatDate(res.check_out)}</span>
                        <span className={balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          · Saldo: {formatCurrency(balance)}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => detailDialog.open(res.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <ReservationFormDialog
        reservation={editingRes}
        cabins={cabins}
        open={formOpen}
        onOpenChange={(open) => { if (!open) formDialog.close(); }}
        onSaved={() => {}}
      />
      <ReservationDetailDialog
        reservation={detailRes}
        open={detailOpen}
        onOpenChange={(open) => { if (!open) detailDialog.close(); }}
        onUpdated={handleUpdated}
      />
    </div>
    </PullToRefresh>
  );
}
