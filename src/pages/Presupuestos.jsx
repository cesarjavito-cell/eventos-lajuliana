import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CalendarPlus, Sparkles, MessageSquareShare, Bell, CheckCircle2, Clock, Calendar, Users, Phone, FileText } from 'lucide-react';
import { useBudgetsQuery, useDeleteBudget, EVENTS_KEY, BUDGETS_KEY } from '@/hooks/useEntityQueries';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

  const [quoteRequests, setQuoteRequests] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [activeTab, setActiveTab] = useState('budgets');
  const [convertInitialData, setConvertInitialData] = useState(null);

  const formDialog = useUrlDialog('budgetForm');
  const registerDialog = useUrlDialog('registerBudget');
  const formOpen = formDialog.isOpen;
  const editingBudget = formDialog.paramValue && formDialog.paramValue !== 'new'
    ? budgets.find((b) => b.id === formDialog.paramValue) : null;
  const registerBudget = registerDialog.paramValue
    ? budgets.find((b) => b.id === registerDialog.paramValue) : null;
  const registerOpen = registerDialog.isOpen;

  const loadQuoteRequests = useCallback(async () => {
    setLoadingQuotes(true);
    try {
      const data = await base44.entities.QuoteRequest.list('-created_at', 100);
      setQuoteRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Error loading quote requests:', e);
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  useEffect(() => {
    loadQuoteRequests();
  }, [loadQuoteRequests]);

  const handleDelete = async (budget) => {
    if (!confirm(`¿Eliminar el presupuesto de ${budget.client_name}?`)) return;
    await deleteBudget.mutateAsync(budget.id);
    toast({ title: 'Presupuesto eliminado' });
  };

  const handleDeleteQuoteRequest = async (id) => {
    if (!confirm('¿Eliminar esta solicitud de cliente?')) return;
    try {
      await base44.entities.QuoteRequest.delete(id);
      toast({ title: 'Solicitud eliminada' });
      loadQuoteRequests();
    } catch (e) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleShareFormWhatsApp = () => {
    const msg = `Hola! Te envío el enlace oficial de Quinta La Juliana para que selecciones los servicios que te interesan para tu evento:\n\nhttps://catering-pro-tfcv.vercel.app/cotizar`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleConvertQuoteToBudget = (req) => {
    const allSelectedServices = [
      ...(req.selected_gastronomy || []),
      ...(req.selected_pastry || []),
      ...(req.selected_general_services || []),
      ...(req.selected_furniture || []),
      ...(req.selected_special_equipment || []),
    ];

    // Map Event Type
    let mappedType = 'fiesta_particular';
    const typeLower = (req.event_type || '').toLowerCase();
    if (typeLower.includes('egresados')) mappedType = 'egresados';
    else if (typeLower.includes('empresarial') || typeLower.includes('corporativo')) mappedType = 'empresarial';
    else mappedType = 'fiesta_particular';

    setConvertInitialData({
      event_title: `${req.event_type || 'Evento'} - ${req.client_name}`,
      client_name: req.client_name,
      client_phone: req.client_phone,
      event_date: req.event_date,
      number_of_people: req.guests_count || 100,
      event_type: mappedType,
      notes: `Solicitud Web Cliente: ${req.notes || 'Sin notas.'}\nVisita: ${req.visit_preference || 'Por el momento no, gracias'}`,
      preSelectedServices: allSelectedServices,
    });

    formDialog.open('new');
  };

  const pendingQuotesCount = quoteRequests.filter((q) => q.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="max-w-5xl mx-auto pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-stone-800">Presupuestos</h1>
            <p className="text-sm text-stone-500 mt-1">Gestión de presupuestos y solicitudes de cotización de clientes</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleShareFormWhatsApp}
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs sm:text-sm"
            >
              <MessageSquareShare className="w-4 h-4 mr-1.5" /> Compartir Formulario
            </Button>
            <Button
              onClick={() => {
                setConvertInitialData(null);
                formDialog.open('new');
              }}
              className="bg-stone-800 hover:bg-stone-900 text-white text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Nuevo presupuesto
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="budgets" className="text-xs sm:text-sm">
              Presupuestos Cargados ({budgets.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs sm:text-sm flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              Solicitudes de Clientes
              {pendingQuotesCount > 0 && (
                <Badge className="bg-amber-500 text-black ml-1 text-[10px] px-1.5 py-0 h-4">
                  {pendingQuotesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="budgets">
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
                            className="text-violet-600 border-violet-200 hover:bg-violet-50 whitespace-nowrap text-xs"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Registrar
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
          </TabsContent>

          <TabsContent value="requests">
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {quoteRequests.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-sm space-y-2">
                  <p>No hay solicitudes de cotización recibidas de clientes todavía.</p>
                  <p className="text-xs text-stone-500">
                    Envía el enlace interactivo a tus clientes usando el botón <strong>"Compartir Formulario"</strong>.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {quoteRequests.map((req) => {
                    const gastronomyCount = (req.selected_gastronomy || []).length;
                    const pastryCount = (req.selected_pastry || []).length;
                    const generalCount = (req.selected_general_services || []).length;
                    const furnitureCount = (req.selected_furniture || []).length;
                    const equipmentCount = (req.selected_special_equipment || []).length;
                    const totalSelectedCount = gastronomyCount + pastryCount + generalCount + furnitureCount + equipmentCount;

                    return (
                      <div key={req.id} className="p-4 sm:p-5 hover:bg-stone-50 transition-colors space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-stone-800 text-base">{req.client_name}</span>
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{req.event_type}</Badge>
                            {req.schedule && <Badge variant="outline" className="text-xs">{req.schedule}</Badge>}
                            <span className="text-xs text-stone-400">{formatDate(req.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleConvertQuoteToBudget(req)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1" /> Convertir en Presupuesto
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDeleteQuoteRequest(req.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            <strong>WhatsApp:</strong> {req.client_phone}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <strong>Fecha:</strong> {formatDate(req.event_date)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-stone-400" />
                            <strong>Invitados:</strong> {req.guests_count || 0} personas
                          </div>
                        </div>

                        {/* Servicios tildados por el cliente */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Servicios Tildados por el Cliente ({totalSelectedCount}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              ...(req.selected_gastronomy || []),
                              ...(req.selected_pastry || []),
                              ...(req.selected_general_services || []),
                              ...(req.selected_furniture || []),
                              ...(req.selected_special_equipment || []),
                            ].map((sName, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[11px] bg-stone-100 text-stone-700 border border-stone-200">
                                {sName}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {req.visit_preference && (
                          <p className="text-xs text-stone-500">
                            <strong>Visita a la Quinta:</strong> {req.visit_preference}
                          </p>
                        )}

                        {req.notes && (
                          <p className="text-xs text-stone-500 italic bg-amber-50/50 border border-amber-100 p-2 rounded-md">
                            "{req.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <BudgetFormDialog
          budget={editingBudget}
          initialData={convertInitialData}
          open={formOpen}
          onOpenChange={(open) => {
            if (!open) {
              formDialog.close();
              setConvertInitialData(null);
            }
          }}
          onSaved={() => {
            loadQuoteRequests();
          }}
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
