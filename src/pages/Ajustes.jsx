import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { MEASUREMENT_LABELS, CATEGORY_LABELS, formatCurrency } from '@/lib/pricing';
import { ensureSeedServices } from '@/lib/seedServices';
import ServiceFormDialog from '@/components/settings/ServiceFormDialog';
import CabinFormDialog from '@/components/settings/CabinFormDialog';
import UserManagement from '@/components/settings/UserManagement';

export default function Ajustes() {
  const { toast } = useToast();
  const [services, setServices] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ next_year_inflation: 0, following_year_inflation: 0, quinta_name: '', quinta_phone: '' });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [cabinDialogOpen, setCabinDialogOpen] = useState(false);
  const [editingCabin, setEditingCabin] = useState(null);

  const loadData = useCallback(async () => {
    try {
      await ensureSeedServices();
      const [svcData, cabData, setData] = await Promise.all([
        base44.entities.Service.list('display_order', 200),
        base44.entities.Cabin.list('number', 20),
        base44.entities.Setting.list(),
      ]);
      setServices(svcData || []);
      setCabins(cabData || []);
      const s = setData && setData.length > 0 ? setData[0] : null;
      setSettings(s);
      if (s) {
        setSettingsForm({
          next_year_inflation: s.next_year_inflation || 0,
          following_year_inflation: s.following_year_inflation || 0,
          quinta_name: s.quinta_name || 'Quinta La Juliana',
          quinta_phone: s.quinta_phone || '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteService = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await base44.entities.Service.delete(id);
    toast({ title: 'Servicio eliminado' });
    loadData();
  };

  const handleDeleteCabin = async (id) => {
    if (!confirm('¿Eliminar esta cabaña?')) return;
    await base44.entities.Cabin.delete(id);
    toast({ title: 'Cabaña eliminada' });
    loadData();
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const data = {
        next_year_inflation: Number(settingsForm.next_year_inflation) || 0,
        following_year_inflation: Number(settingsForm.following_year_inflation) || 0,
        quinta_name: settingsForm.quinta_name,
        quinta_phone: settingsForm.quinta_phone,
      };
      if (settings) {
        await base44.entities.Setting.update(settings.id, data);
      } else {
        const created = await base44.entities.Setting.create(data);
        setSettings(created);
      }
      toast({ title: 'Configuración guardada' });
    } finally {
      setSavingSettings(false);
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
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-stone-800 mb-1">Ajustes</h1>
      <p className="text-sm text-stone-500 mb-6">Gestión de servicios, cabañas e inflación</p>

      <Tabs defaultValue="services">
        <TabsList className="mb-4">
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="inflation">Inflación</TabsTrigger>
          <TabsTrigger value="cabins">Cabañas</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-stone-700">Lista de servicios</h2>
            <Button
              onClick={() => {
                setEditingService(null);
                setServiceDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Nuevo servicio
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {services.length === 0 ? (
              <p className="p-8 text-center text-stone-400 text-sm">No hay servicios cargados todavía.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between p-4 hover:bg-stone-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-stone-800">{svc.name}</span>
                        {!svc.active && <Badge variant="secondary">Inactivo</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-stone-500">
                        <Badge variant="outline">{CATEGORY_LABELS[svc.category] || svc.category}</Badge>
                        <Badge variant="outline">{MEASUREMENT_LABELS[svc.measurement_type]}</Badge>
                        <span className="text-stone-600">{formatCurrency(svc.base_price)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingService(svc); setServiceDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteService(svc.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inflation">
          <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
            <h2 className="font-semibold text-stone-700 mb-1">Índice de inflación</h2>
            <p className="text-sm text-stone-500 mb-6">
              Estos porcentajes se aplican automáticamente a los presupuestos cuando la fecha del evento es en un año futuro.
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Inflación próximo año (%)</Label>
                <Input
                  type="number"
                  value={settingsForm.next_year_inflation}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, next_year_inflation: e.target.value }))}
                />
                <p className="text-xs text-stone-400">Se aplica cuando el evento es el año que viene.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Inflación año siguiente (%)</Label>
                <Input
                  type="number"
                  value={settingsForm.following_year_inflation}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, following_year_inflation: e.target.value }))}
                />
                <p className="text-xs text-stone-400">Se aplica (compuesta) para eventos a 2+ años.</p>
              </div>
              <div className="border-t border-stone-100 pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Nombre de la quinta</Label>
                  <Input value={settingsForm.quinta_name} onChange={(e) => setSettingsForm((p) => ({ ...p, quinta_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono de contacto</Label>
                  <Input value={settingsForm.quinta_phone} onChange={(e) => setSettingsForm((p) => ({ ...p, quinta_phone: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                <Save className="w-4 h-4 mr-1" />
                {savingSettings ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cabins">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-stone-700">Cabañas ({cabins.length})</h2>
            <Button onClick={() => { setEditingCabin(null); setCabinDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Nueva cabaña
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cabins.map((cab) => (
              <div key={cab.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-stone-800">{cab.name}</h3>
                    <p className="text-xs text-stone-500">Cabaña N° {cab.number}</p>
                  </div>
                  {cab.active ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Disponible</Badge> : <Badge variant="secondary">No disponible</Badge>}
                </div>
                {cab.description && <p className="text-xs text-stone-500 mt-2">{cab.description}</p>}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                  <span className="text-sm font-medium text-stone-700">{formatCurrency(cab.base_price_per_night)}<span className="text-xs text-stone-400"> /noche</span></span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingCabin(cab); setCabinDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCabin(cab.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
      </Tabs>

      <ServiceFormDialog
        service={editingService}
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        onSaved={loadData}
      />
      <CabinFormDialog
        cabin={editingCabin}
        open={cabinDialogOpen}
        onOpenChange={setCabinDialogOpen}
        onSaved={loadData}
      />
    </div>
  );
}
