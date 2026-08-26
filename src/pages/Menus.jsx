import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, UtensilsCrossed, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MenuDialog from '@/components/MenuDialog';
import { useUrlDialog } from '@/hooks/useUrlDialog';
import PullToRefresh from '@/components/PullToRefresh';

export default function Menus() {
  const [menus, setMenus] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen: dialogOpen, id: dialogId, open: openDialog, close: closeDialog } = useUrlDialog('menu');
  const editing = dialogId ? menus.find(m => m.id === dialogId) : null;
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([
        base44.entities.Menu.list('-updated_date', 200),
        base44.entities.Producto.list('-updated_date', 500),
      ]);
      setMenus(m || []);
      setProductos(p || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await base44.entities.Menu.update(editing.id, formData);
        toast.success('Menú actualizado');
      } else {
        await base44.entities.Menu.create(formData);
        toast.success('Menú creado');
      }
      closeDialog();
      load();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Menu.delete(deleteTarget.id);
      toast.success('Menú eliminado');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const openNew = () => openDialog();
  const openEdit = (m) => openDialog(m.id);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Menús</h1>
          <p className="text-muted-foreground mt-1">Armá cada menú con sus productos y gramaje por persona</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nuevo menú</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : menus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Todavía no hay menús.</p>
          <Button onClick={openNew} className="mt-4"><Plus className="w-4 h-4 mr-1" /> Crear primer menú</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map(m => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading font-semibold text-lg">{m.nombre}</h3>
                  {m.tipo && <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-accent/10 text-xs text-accent font-medium">{m.tipo}</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    title="Editar menú"
                    className="min-w-[40px] h-[36px] flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all font-medium text-xs px-2"
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(m)}
                    title="Eliminar menú"
                    className="min-w-[40px] h-[36px] flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all font-medium text-xs px-2"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Borrar
                  </button>
                </div>
              </div>
              {m.descripcion && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.descripcion}</p>}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{m.items?.length || 0} productos</span>
              </div>
              {m.items && m.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.items.slice(0, 4).map((item, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {item.producto_nombre}
                    </span>
                  ))}
                  {m.items.length > 4 && (
                    <span className="text-xs px-2 py-0.5 text-muted-foreground">+{m.items.length - 4} más</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <MenuDialog
        open={dialogOpen}
        onOpenChange={(o) => !o && closeDialog()}
        menu={editing}
        products={productos}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar menú?</AlertDialogTitle>
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
