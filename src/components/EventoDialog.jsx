import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, Square } from 'lucide-react';

const estados = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export default function EventoDialog({ open, onOpenChange, evento, menus, onSave }) {
  const [formData, setFormData] = useState({
    nombre: '',
    cliente: '',
    fecha: '',
    cantidad_comensales: 0,
    menus_ids: [],
    estado: 'borrador',
    notas: '',
  });

  useEffect(() => {
    if (evento) {
      setFormData({
        nombre: evento.nombre || '',
        cliente: evento.cliente || '',
        fecha: evento.fecha || '',
        cantidad_comensales: evento.cantidad_comensales || 0,
        menus_ids: evento.menus_ids || [],
        estado: evento.estado || 'borrador',
        notas: evento.notas || '',
      });
    } else {
      setFormData({
        nombre: '',
        cliente: '',
        fecha: '',
        cantidad_comensales: 0,
        menus_ids: [],
        estado: 'borrador',
        notas: '',
      });
    }
  }, [evento, open]);

  const toggleMenu = (menuId) => {
    setFormData(prev => ({
      ...prev,
      menus_ids: prev.menus_ids.includes(menuId)
        ? prev.menus_ids.filter(id => id !== menuId)
        : [...prev.menus_ids, menuId],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evento ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-nombre">Nombre del evento *</Label>
            <Input
              id="ev-nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Ej: Boda de Juan y María"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-cliente">Cliente</Label>
              <Input
                id="ev-cliente"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-fecha">Fecha</Label>
              <Input
                id="ev-fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-comensales">Comensales</Label>
              <Input
                id="ev-comensales"
                type="number"
                min="0"
                value={formData.cantidad_comensales}
                onChange={(e) => setFormData({ ...formData, cantidad_comensales: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {estados.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Menu selection */}
          <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/30">
            <Label className="text-sm font-semibold">Menús seleccionados</Label>
            {menus.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No hay menús creados. Creá al menos uno primero.</p>
            ) : (
              <div className="space-y-1.5 mt-1">
                {menus.map(m => {
                  const selected = formData.menus_ids.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMenu(m.id)}
                      className={`flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-all border ${
                        selected
                          ? 'bg-primary/10 border-primary/30 text-foreground'
                          : 'bg-card border-border hover:bg-muted/50'
                      }`}
                    >
                      <span className={`flex-shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                        {selected ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </span>
                      <div className="text-left">
                        <span className="font-medium">{m.nombre}</span>
                        {m.tipo && <span className="text-muted-foreground ml-2">· {m.tipo}</span>}
                      </div>
                      {m.items && (
                        <span className="ml-auto text-xs text-muted-foreground">{m.items.length} productos</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-notas">Notas</Label>
            <Textarea
              id="ev-notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
              placeholder="Opcional"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{evento ? 'Guardar cambios' : 'Crear evento'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
