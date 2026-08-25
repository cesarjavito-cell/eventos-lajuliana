import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

export default function CategoriaDialog({ open, onOpenChange, onChanged }) {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    const [cats, prods] = await Promise.all([
      base44.entities.Categoria.list('orden', 200),
      base44.entities.Producto.list('-updated_date', 500),
    ]);
    setCategorias(cats);
    setProductos(prods);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const countProducts = (catName) => productos.filter(p => p.categoria === catName).length;

  const handleAdd = async () => {
    const name = newCat.trim();
    if (!name) return;
    if (categorias.some(c => c.nombre.toLowerCase() === name.toLowerCase())) {
      toast.error('Ya existe una categoría con ese nombre');
      return;
    }
    await base44.entities.Categoria.create({ nombre: name, orden: categorias.length });
    setNewCat('');
    load();
    onChanged();
    toast.success('Categoría creada');
  };

  const handleRename = async (cat) => {
    const name = editName.trim();
    if (!name || name === cat.nombre) {
      setEditingId(null);
      return;
    }
    if (categorias.some(c => c.nombre.toLowerCase() === name.toLowerCase() && c.id !== cat.id)) {
      toast.error('Ya existe una categoría con ese nombre');
      return;
    }
    await base44.entities.Categoria.update(cat.id, { nombre: name });
    await base44.entities.Producto.updateMany({ categoria: cat.nombre }, { $set: { categoria: name } });
    setEditingId(null);
    setEditName('');
    load();
    onChanged();
    toast.success('Categoría actualizada');
  };

  const handleDelete = async (cat) => {
    const count = countProducts(cat.nombre);
    if (count > 0) {
      await base44.entities.Producto.updateMany({ categoria: cat.nombre }, { $set: { categoria: 'Otros' } });
    }
    await base44.entities.Categoria.delete(cat.id);
    load();
    onChanged();
    toast.success(`Categoría eliminada${count > 0 ? ` (${count} productos movidos a Otros)` : ''}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Gestionar categorías</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nueva categoría..."
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} size="icon"><Plus className="w-4 h-4" /></Button>
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-thin">
            {categorias.map(cat => {
              const count = countProducts(cat.nombre);
              const isEditing = editingId === cat.id;
              return (
                <div key={cat.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(cat)}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <button onClick={() => handleRename(cat)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded-md">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:bg-muted rounded-md">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium text-sm">{cat.nombre}</span>
                      <span className="text-xs text-muted-foreground">{count} producto{count !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => { setEditingId(cat.id); setEditName(cat.nombre); }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {categorias.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No hay categorías. Agregá una arriba.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
