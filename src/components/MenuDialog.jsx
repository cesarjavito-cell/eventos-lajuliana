import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, PackageOpen } from 'lucide-react';

const tipos = ['Principal', 'Entrada', 'Postre', 'Brunch', 'Té', 'Cocktail', 'Infantil', 'Especial'];

export default function MenuDialog({ open, onOpenChange, menu, products, onSave }) {
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', tipo: 'Principal', items: [] });
  const [newItem, setNewItem] = useState({ producto_id: '', cantidad: '' });

  useEffect(() => {
    if (menu) {
      setFormData({
        nombre: menu.nombre || '',
        descripcion: menu.descripcion || '',
        tipo: menu.tipo || 'Principal',
        items: menu.items || [],
      });
    } else {
      setFormData({ nombre: '', descripcion: '', tipo: 'Principal', items: [] });
    }
    setNewItem({ producto_id: '', cantidad: '' });
  }, [menu, open]);

  const addItem = () => {
    if (!newItem.producto_id || !newItem.cantidad) return;
    const product = products.find(p => p.id === newItem.producto_id);
    if (!product) return;
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          producto_id: product.id,
          producto_nombre: product.nombre,
          cantidad_por_persona: parseFloat(newItem.cantidad) || 0,
          unidad: product.unidad,
        },
      ],
    });
    setNewItem({ producto_id: '', cantidad: '' });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{menu ? 'Editar menú' : 'Nuevo menú'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="menu-nombre">Nombre del menú *</Label>
            <Input
              id="menu-nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Ej: Menú Parrilla"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de menú</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-desc">Descripción</Label>
              <Input
                id="menu-desc"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Items editor */}
          <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
            <Label className="text-sm font-semibold">Productos del menú</Label>

            {/* Add item row */}
            {products.length > 0 ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Producto</Label>
                  <Select
                    value={newItem.producto_id}
                    onValueChange={(v) => setNewItem({ ...newItem, producto_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} ({p.unidad})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs text-muted-foreground">Cant./persona</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={newItem.cantidad}
                    onChange={(e) => setNewItem({ ...newItem, cantidad: e.target.value })}
                    placeholder="0.250"
                  />
                </div>
                <Button type="button" size="icon" onClick={addItem} disabled={!newItem.producto_id || !newItem.cantidad}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <PackageOpen className="w-4 h-4" />
                Primero creá productos para poder agregarlos al menú.
              </div>
            )}

            {/* Items list */}
            {formData.items.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {formData.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-card border border-border px-3 py-2 text-sm">
                    <span className="font-medium">{item.producto_nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {item.cantidad_por_persona} {item.unidad}/persona
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{menu ? 'Guardar cambios' : 'Crear menú'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
