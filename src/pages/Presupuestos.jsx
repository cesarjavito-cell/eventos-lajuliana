import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileDown, Eye, CalendarPlus } from 'lucide-react';
import { useBudgetsQuery, useDeleteBudget, EVENTS_KEY, BUDGETS_KEY } from '@/hooks/useEntityQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, EVENT_TYPE_LABELS } from '@/lib/pricing';
import BudgetFormDialog from '@/components/budgets/BudgetFormDialog';
import RegisterEventDialog from '@/components/budgets/RegisterEventDialog';
import PullToRefresh from '@/components/PullToRefresh';
import { useUrlDialog } from '@/hooks/useUrlDialog';

export default function Presupuestos() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: budgets = [], isLoading: loading, refetch } = useBudgetsQuery();
  const deleteBudget = useDeleteBudget();
  const formDialog = useUrlDialog('budgetForm');
  const registerDialog = useUrlDialog('registerBudget');
  const formOpen = formDialog.isOpen;
  const editingBudget = formDialog.paramValue && formDialog.paramValue !== 'new'
    ? budgets.find((b) => b.id === formDialog.paramValue) : null;
  const registerBudget = registerDialog.paramValue
    ? budgets.find((b) => b.id === registerDialog.paramValue) : null;
  const registerOpen = registerDialog.isOpen;

  const handleDelete = async (budget) => {
    if (!confirm(`¿Eliminar el presupuesto de ${budget.client_name}?`)) return;
    await deleteBudget.mutateAsync(budget.id);
    toast({ title: 'Presupuesto eliminado' });
  };

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
          <h1 className="font-display text-2xl font-semibold text-stone-800">Presupuestos</h1>
          <p className="text-sm text-stone-500 mt-1">Generación de presupuestos con cálculo automático</p>
        </div>
        <Button onClick={() => formDialog.open('new')}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo presupuesto
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {budgets.length === 0 ? (
          <p className="p-8 text-center text-stone-400 text-sm">No hay presupuestos cargados todavía.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {budgets.map((budget) => (
              <div key={budget.id} className="flex items-center gap-3 p-4 hover:bg-stone-50">
                <div className="w-1.5 h-12 rounded-full bg-violet-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-stone-800">{budget.client_name}</span>
                    <Badge variant="outline">{EVENT_TYPE_LABELS[budget.event_type] || budget.event_type}</Badge>
                    <Badge variant="secondary">{budget.status}</Badge>
                    {budget.status === 'aceptado' && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">En agenda</Badge>
                    )}
                    {budget.inflation_applied > 0 && (
                      <Badge variant="outline" className="text-amber-600">+{budget.inflation_applied}% infl.</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-1">
                    <span>Evento: {formatDate(budget.event_date)}</span>
                    <span>· {budget.number_of_people} pers.</span>
                    <span>· {(budget.selected_services || []).length} servicios</span>
                    <span className="font-semibold text-stone-700">· Total: {formatCurrency(budget.total_amount)}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {budget.status !== 'aceptado' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => registerDialog.open(budget.id)}
                      className="text-violet-600 border-violet-200 hover:bg-violet-50 whitespace-nowrap"
                    >
                      <CalendarPlus className="w-4 h-4 mr-1" /> Registrar
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => formDialog.open(budget.id)} title="Editar">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(budget)} title="Eliminar">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BudgetFormDialog
        budget={editingBudget}
        open={formOpen}
        onOpenChange={(open) => { if (!open) formDialog.close(); }}
        onSaved={() => {}}
      />

      <RegisterEventDialog
        budget={registerBudget}
        open={registerOpen}
        onOpenChange={(open) => { if (!open) registerDialog.close(); }}
        onRegistered={() => {
          toast({ title: 'Evento registrado en agenda' });
          qc.invalidateQueries(BUDGETS_KEY);
          qc.invalidateQueries(EVENTS_KEY);
        }}
      />
    </div>
    </PullToRefresh>
  );
}
