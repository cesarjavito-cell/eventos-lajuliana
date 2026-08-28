import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Save, Download, Upload, Database, Cloud, CloudLightning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { MEASUREMENT_LABELS, CATEGORY_LABELS, formatCurrency } from '@/lib/pricing';
import { ensureSeedServices } from '@/lib/seedServices';
import { exportBackupJSON, importBackupJSON } from '@/lib/localEntityStore';
import { getStoredFirebaseConfig, saveFirebaseConfig } from '@/lib/firebaseConfig';
import ServiceFormDialog from '@/components/settings/ServiceFormDialog';
import CabinFormDialog from '@/components/settings/CabinFormDialog';
import UserManagement from '@/components/settings/UserManagement';

export default function Ajustes() {
  const { toast } = useToast();
  const [firebaseForm, setFirebaseForm] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  useEffect(() => {
    const cfg = getStoredFirebaseConfig();
    if (cfg) {
      setFirebaseForm(cfg);
    }
  }, []);

  const handleSaveFirebaseConfig = () => {
    if (!firebaseForm.apiKey || !firebaseForm.projectId) {
      toast({ title: 'Atención', description: 'Ingresa al menos el API Key y Project ID de tu proyecto Google Firebase.', variant: 'destructive' });
      return;
    }
    const success = saveFirebaseConfig(firebaseForm);
    if (success) {
      toast({ title: '¡Conexión guardada con éxito!', description: 'Todos los dispositivos registrados comenzarán a sincronizar en tiempo real con Google Cloud.' });
    }
  };

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

  const handleExportBackup = () => {
    try {
      const jsonStr = exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quinta_la_juliana_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Copia descargada', description: 'Se guardaron todos tus servicios, presupuestos y datos.' });
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo exportar el backup', variant: 'destructive' });
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target.result;
      const success = importBackupJSON(content);
      if (success) {
        toast({ title: '¡Datos cargados con éxito!', description: 'Tus servicios y eventos se han restaurado correctamente.' });
        await loadData();
      } else {
        toast({ title: 'Error', description: 'El archivo de backup no tiene un formato válido', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
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
      <p className="text-sm text-stone-500 mb-6">Gestión de servicios, cabañas, inflación y copias de datos</p>

      <Tabs defaultValue="services">
        <TabsList className="mb-4">
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="inflation">Inflación</TabsTrigger>
          <TabsTrigger value="cabins">Cabañas</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="backup">💾 Copia de Seguridad</TabsTrigger>
          <TabsTrigger value="firebase">⚡ Sincronización Nube (Google)</TabsTrigger>
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
                  <div key={svc.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800">{svc.name}</span>
                        <Badge variant="outline" className="text-xs text-stone-500">
                          {CATEGORY_LABELS[svc.category] || svc.category}
                        </Badge>
                        {!svc.active && <Badge variant="secondary">Inactivo</Badge>}
                      </div>
                      <p className="text-xs text-stone-400 mt-1">
                        Tipo: {MEASUREMENT_LABELS[svc.measurement_type]} · Precio base: {formatCurrency(svc.base_price)}
                        {svc.hours_included > 0 && ` (${svc.hours_included} hs inc.)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingService(svc);
                          setServiceDialogOpen(true);
                        }}
                      >
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
          <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl space-y-4">
            <h2 className="font-semibold text-stone-800 mb-2">Porcentajes de inflación proyectada</h2>
            <div className="space-y-4">
              <div>
                <Label>Inflación proyectada año que viene (%)</Label>
                <Input
                  type="number"
                  value={settingsForm.next_year_inflation}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, next_year_inflation: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Inflación proyectada año subsiguiente (%)</Label>
                <Input
                  type="number"
                  value={settingsForm.following_year_inflation}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, following_year_inflation: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                <Save className="w-4 h-4 mr-1" /> {savingSettings ? 'Guardando...' : 'Guardar inflación'}
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

        <TabsContent value="backup">
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-lg text-stone-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" /> Copia de Seguridad y Migración de Datos
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Transfiere tus datos cargados en <code>localhost</code> directamente a tu nueva versión web publicada en Vercel en 2 clics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-semibold text-stone-800 text-sm">1. Exportar Datos Guardados</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Descarga un archivo con todos los servicios, precios, presupuestos, egresados y cabañas cargados.
                  </p>
                </div>
                <Button onClick={handleExportBackup} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                  <Download className="w-4 h-4 mr-2" /> Descargar Copia de Datos (.json)
                </Button>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-semibold text-stone-800 text-sm">2. Restaurar o Cargar en la Web</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Selecciona el archivo descargado para restaurar instantáneamente todos tus datos en la aplicación web.
                  </p>
                </div>
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportFile} className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 w-full">
                  <Upload className="w-4 h-4 mr-2" /> Cargar / Restaurar Archivo (.json)
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="firebase">
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-6 max-w-2xl">
            <div>
              <div className="flex items-center gap-2">
                <CloudLightning className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-lg text-stone-800">Conexión con Google Cloud Firestore</h2>
              </div>
              <p className="text-sm text-stone-500 mt-1">
                Conecta tu proyecto gratuito de Google Firebase para que todas las agendas, cobros y presupuestos se sincronicen en tiempo real entre todos los celulares de tu equipo.
              </p>
            </div>

            {firebaseForm.apiKey && firebaseForm.projectId ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <Badge className="bg-emerald-600 text-white">🟢 Conectado</Badge>
                <p className="text-xs text-emerald-800 font-medium">
                  Sincronización en tiempo real activa con el proyecto Google Cloud <code>{firebaseForm.projectId}</code>.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                💡 <strong>¿Cómo obtener tu clave gratuita de Google Firebase?</strong><br />
                1. Entra a <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-semibold">console.firebase.google.com</a>.<br />
                2. Crea un proyecto gratuito llamado <strong>Quinta La Juliana</strong>.<br />
                3. Agrega una Web App, copia las claves de configuración y pégalas a continuación.
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div>
                <Label>API Key de Google Firebase</Label>
                <Input
                  placeholder="Ej: AIzaSyD..."
                  value={firebaseForm.apiKey}
                  onChange={(e) => setFirebaseForm((p) => ({ ...p, apiKey: e.target.value }))}
                />
              </div>

              <div>
                <Label>ID del Proyecto (Project ID)</Label>
                <Input
                  placeholder="Ej: quinta-la-juliana-prod"
                  value={firebaseForm.projectId}
                  onChange={(e) => setFirebaseForm((p) => ({ ...p, projectId: e.target.value }))}
                />
              </div>

              <div>
                <Label>Dominio de Autenticación (Auth Domain - opcional)</Label>
                <Input
                  placeholder="Ej: quinta-la-juliana-prod.firebaseapp.com"
                  value={firebaseForm.authDomain}
                  onChange={(e) => setFirebaseForm((p) => ({ ...p, authDomain: e.target.value }))}
                />
              </div>

              <Button onClick={handleSaveFirebaseConfig} className="bg-stone-800 hover:bg-stone-900 text-white w-full">
                <Save className="w-4 h-4 mr-2" /> Guardar Conexión Google Cloud
              </Button>
            </div>
          </div>
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
