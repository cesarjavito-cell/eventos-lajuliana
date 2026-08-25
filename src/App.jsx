import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Productos from '@/pages/Productos';
import Menus from '@/pages/Menus';
import Eventos from '@/pages/Eventos';
import CalculoCompra from '@/pages/CalculoCompra';
import Ajustes from '@/pages/Ajustes';
import { Toaster as HotToaster } from 'react-hot-toast';

const AuthenticatedApp = () => {
  return (
    <Routes>
      {/* Add your page Route elements here */}
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
  )
}

export default App
