import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Package, UtensilsCrossed, CalendarDays, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import PullToRefresh from '@/components/PullToRefresh';

export default function Dashboard() {
  const [stats, setStats] = useState({ productos: 0, menus: 0, eventos: 0, proximosEventos: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [productos, menus, eventos] = await Promise.all([
      base44.entities.Producto.list('-updated_date', 500),
      base44.entities.Menu.list('-updated_date', 200),
      base44.entities.Evento.list('-fecha', 100),
    ]);
    const hoy = new Date().toISOString().split('T')[0];
    const proximos = eventos.filter(e => e.fecha >= hoy && e.estado !== 'cancelado').slice(0, 5);
    setStats({ productos: productos.length, menus: menus.length, eventos: eventos.length, proximosEventos: proximos });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Productos', value: stats.productos, icon: Package, to: '/productos', color: 'text-blue-600 bg-blue-50' },
    { label: 'Menús', value: stats.menus, icon: UtensilsCrossed, to: '/menus', color: 'text-accent bg-accent/10' },
    { label: 'Eventos', value: stats.eventos, icon: CalendarDays, to: '/eventos', color: 'text-primary bg-primary/10' },
  ];

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Panel</h1>
        <p className="text-muted-foreground mt-1">Resumen general de tu quinta</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to}>
              <div className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-heading font-bold mt-4">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold">Próximos eventos</h2>
          </div>
          <Link to="/eventos">
            <Button variant="ghost" size="sm">Ver todos <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>
        {stats.proximosEventos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No hay eventos próximos.</p>
            <Link to="/eventos"><Button variant="outline" size="sm" className="mt-3"><Plus className="w-4 h-4 mr-1" /> Crear evento</Button></Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.proximosEventos.map(ev => (
              <Link key={ev.id} to={`/calculo?evento=${ev.id}`} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
                <div>
                  <p className="font-medium">{ev.nombre}</p>
                  <p className="text-sm text-muted-foreground">{ev.cliente || 'Sin cliente'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatDate(ev.fecha)}</p>
                  <p className="text-sm text-muted-foreground">{ev.cantidad_comensales} comensales</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
