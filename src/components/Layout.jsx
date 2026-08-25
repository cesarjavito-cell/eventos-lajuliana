import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Package, UtensilsCrossed, CalendarDays, ShoppingCart, ChefHat, Menu, X, LogOut, Settings, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { label: 'Panel', path: '/', icon: LayoutDashboard },
  { label: 'Productos', path: '/productos', icon: Package },
  { label: 'Menús', path: '/menus', icon: UtensilsCrossed },
  { label: 'Eventos', path: '/eventos', icon: CalendarDays },
  { label: 'Cálculo', path: '/calculo', icon: ShoppingCart },
  { label: 'Ajustes', path: '/ajustes', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const hasDialog = searchParams.has('dialog');
  const showBack = location.pathname !== '/' || hasDialog;

  const handleTopBarClick = () => {
    if (hasDialog) {
      const next = new URLSearchParams(searchParams);
      next.delete('dialog');
      next.delete('id');
      setSearchParams(next, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div id="main-scroll" className="fixed inset-0 flex items-start overflow-y-auto bg-background">
      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-sidebar md:hidden"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2 text-sidebar-primary">
          <ChefHat className="w-6 h-6" />
          <span className="font-heading text-lg font-semibold">Juliana</span>
        </div>
        <button
          onClick={showBack ? handleTopBarClick : () => setMobileOpen(!mobileOpen)}
          className="text-sidebar-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {showBack ? <ChevronLeft className="w-6 h-6" /> : (mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />)}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-sidebar flex flex-col
        transform transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold text-sidebar-primary">La Juliana</h1>
              <p className="text-xs text-sidebar-foreground/60">Gestión de Catering</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all select-none min-h-[44px] ${
                  active ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-all select-none min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <main
        className="flex-1 p-6 md:p-10 pt-20 md:pt-10 pb-24 md:pb-10"
      >
        <Outlet />
      </main>

      {/* Bottom navigation (mobile only) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 select-none min-h-[56px] ${
                  active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
