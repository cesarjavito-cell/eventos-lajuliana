import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, Package, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ProductoDialog from '@/components/ProductoDialog';
import CategoriaDialog from '@/components/CategoriaDialog';
import { formatPrice } from '@/lib/format';
import { useUrlDialog } from '@/hooks/useUrlDialog';
import PullToRefresh from '@/components/PullToRefresh';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOpen: dialogOpen, id: dialogId, open: openDialog, close: closeDialog } = useUrlDialog('producto');
  const editing = dialogId ? productos.find(p => p.id === dialogId) : null;
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [catDialogOpen, setCatDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [data, cats] = await Promise.all([
      base44.entities.Producto.list('-updated_date', 500),
      base44.entities.Categoria.list('orden', 200),
    ]);
    setProductos(data);
    setCategorias(cats.map(c => c.nombre));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = productos.filter(p => {
    const matchesSearch = p.nombre?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === 'Todas' || p.categoria === catFilter;
    return matchesSearch && matchesCat;
  });

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await base44.entities.Producto.update(editing.id, formData);
        toast.success('Producto actualizado');
      } else {
        await base44.entities.Producto.create(formData);
        toast.success('Producto creado');
      }
      closeDialog();
      load();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Producto.delete(deleteTarget.id);
      toast.success('Producto eliminado');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const openNew = () => openDialog();
  const openEdit = (p) => openDialog(p.id);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Productos</h1>
          <p className="text-muted-foreground mt-1">Gestioná tu lista de insumos y precios</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatDialogOpen(true)}><Settings className="w-4 h-4 mr-1" /> Categorías</Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nuevo producto</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['Todas', ...categorias].map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                catFilter === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="w-12 h-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">{productos.length === 0 ? 'Todavía no hay productos.' : 'No se encontraron productos.'}</p>
          {productos.length === 0 && <Button onClick={openNew} className="mt-4"><Plus className="w-4 h-4 mr-1" /> Crear primer producto</Button>}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm select-none">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Nombre</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Categoría</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Unidad</th>
                  <th className="text-right font-medium px-4 py-3 text-muted-foreground">Precio</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Proveedor</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">{p.categoria}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.unidad}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(p.precio_actual)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.proveedor || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProductoDialog
        open={dialogOpen}
        onOpenChange={(o) => !o && closeDialog()}
        producto={editing}
        onSave={handleSave}
        categories={categorias}
      />

      <CategoriaDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        onChanged={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
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
