import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Calendar, FileText, Settings, PartyPopper, Home, Menu, LogOut, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { canAccess, ROLE_LABELS, normalizeRole } from '@/lib/roles';

const navItems = [
  { to: '/', label: 'Calendario', icon: Calendar, page: 'calendario' },
  { to: '/presupuestos', label: 'Presupuestos', icon: FileText, page: 'presupuestos' },
  { to: '/eventos', label: 'Eventos', icon: PartyPopper, page: 'eventos' },
  { to: '/cabanas', label: 'Cabañas', icon: Home, page: 'cabanas' },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, page: 'ajustes' },
];

const PAGE_TITLES = {
  '/': 'Calendario',
  '/presupuestos': 'Presupuestos',
  '/eventos': 'Eventos',
  '/cabanas': 'Cabañas',
  '/ajustes': 'Ajustes',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const hasDialogOpen = searchParams.toString() !== '';
  const canGoBack = window.history.length > 1;
  const showBackButton = hasDialogOpen || canGoBack;
  const userRole = normalizeRole(user?.role);
  const visibleItems = navItems.filter((item) => canAccess(user?.role, item.page));
  const pageTitle = PAGE_TITLES[location.pathname] || 'La Juliana';

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-[#9CA86E] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0a0a0a] text-stone-100 z-40 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-[#C9A04E]/20 flex flex-col items-center">
          <img
            src="https://media.base44.com/images/public/6a70f20332bd3ec0ab545f1c/459640b1b_9bf4ee4a-29e8-47a9-bf22-f881699a455d.jpg"
            alt="La Juliana"
            className="w-20 h-20 rounded-lg object-cover mb-2"
          />
          <h1 className="font-display text-base font-semibold leading-tight tracking-tight text-[#E6C57A]">LA JULIANA</h1>
          <p className="text-[10px] text-[#C9A04E]/70 mt-0.5 tracking-[0.2em] uppercase">Eventos y Hospedaje</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#C9A04E] text-black font-medium' : 'text-stone-300 hover:bg-[#C9A04E]/10 hover:text-[#E6C57A]'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[#C9A04E]/20 space-y-2">
          {user && (
            <div className="px-3 py-2 text-xs text-stone-400">
              <p className="truncate">{user.full_name || user.email}</p>
              <p className="text-[#C9A04E]">{ROLE_LABELS[userRole] || userRole}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-stone-300 hover:text-[#E6C57A] hover:bg-[#C9A04E]/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-sm border-b border-stone-200 z-20 px-4 flex items-center justify-between"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)', paddingBottom: '0.75rem' }}
        >
          <button
            onClick={() => (showBackButton ? navigate(-1) : setSidebarOpen(true))}
            className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {showBackButton ? <ArrowLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-display font-semibold text-base text-stone-800">{pageTitle}</span>
          <div className="w-11" />
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-stone-200 z-30"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-around items-center h-14">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-1 transition-colors ${
                    isActive ? 'text-[#C9A04E]' : 'text-stone-400'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
