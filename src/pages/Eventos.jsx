import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CalendarDays, Users, Calculator, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EventoDialog from '@/components/EventoDialog';
import { formatDate } from '@/lib/format';
import { useUrlDialog } from '@/hooks/useUrlDialog';
import PullToRefresh from '@/components/PullToRefresh';

const estadoConfig = {
  borrador: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  confirmado: { label: 'Confirmado', className: 'bg-blue-50 text-blue-600' },
  completado: { label: 'Completado', className: 'bg-green-50 text-green-600' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-600' },
};

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen: dialogOpen, id: dialogId, open: openDialog, close: closeDialog } = useUrlDialog('evento');
  const editing = dialogId ? eventos.find(ev => ev.id === dialogId) : null;
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [evs, ms] = await Promise.all([
        base44.entities.Evento.list('-fecha', 100),
        base44.entities.Menu.list('-updated_date', 200),
      ]);
      setEventos(evs || []);
      setMenus(ms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('catering-cloud-updated', load);
    return () => window.removeEventListener('catering-cloud-updated', load);
  }, []);

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await base44.entities.Evento.update(editing.id, formData);
        toast.success('Evento actualizado');
      } else {
        await base44.entities.Evento.create(formData);
        toast.success('Evento creado');
      }
      closeDialog();
      load();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Evento.delete(deleteTarget.id);
      toast.success('Evento eliminado');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const openNew = () => openDialog();
  const openEdit = (ev) => openDialog(ev.id);

  const getMenuNames = (ids) => {
    return (ids || []).map(id => menus.find(m => m.id === id)?.nombre).filter(Boolean);
  };

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Eventos</h1>
          <p className="text-muted-foreground mt-1">Creá eventos y elegí los menús para cada uno</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nuevo evento</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CalendarDays className="w-12 h-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Todavía no hay eventos.</p>
          <Button onClick={openNew} className="mt-4"><Plus className="w-4 h-4 mr-1" /> Crear primer evento</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eventos.map(ev => {
            const estado = estadoConfig[ev.estado] || estadoConfig.borrador;
            const menuNames = getMenuNames(ev.menus_ids);
            return (
              <div key={ev.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-lg truncate">{ev.nombre}</h3>
                    {ev.cliente && <p className="text-sm text-muted-foreground">{ev.cliente}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${estado.className}`}>
                    {estado.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" /> {formatDate(ev.fecha)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {ev.cantidad_comensales} comensales
                  </span>
                </div>

                {menuNames.length > 0 && (
                  <div className="mt-3 flex items-start gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {menuNames.map((name, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Link to={`/calculo?evento=${ev.id}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full">
                      <Calculator className="w-4 h-4 mr-1" /> Ver cálculo
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon" onClick={() => openEdit(ev)} className="min-w-[44px] min-h-[44px]">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setDeleteTarget(ev)} className="min-w-[44px] min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EventoDialog
        open={dialogOpen}
        onOpenChange={(o) => !o && closeDialog()}
        evento={editing}
        menus={menus}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar "{deleteTarget?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PullToRefresh>
  );
}
