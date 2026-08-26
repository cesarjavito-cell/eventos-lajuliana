import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Productos from '@/pages/Productos';
import Menus from '@/pages/Menus';
import Eventos from '@/pages/Eventos';
import CalculoCompra from '@/pages/CalculoCompra';
import Ajustes from '@/pages/Ajustes';
import { Toaster as HotToaster } from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-2xl font-bold font-heading text-foreground">La Juliana Catering</h2>
            <p className="text-muted-foreground text-sm">
              La aplicación se ha actualizado. Presioná el botón para recargar el contenido.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-sm"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/menus" element={<Menus />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/calculo" element={<CalculoCompra />} />
        <Route path="/ajustes" element={<Ajustes />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <HotToaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } }} />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
