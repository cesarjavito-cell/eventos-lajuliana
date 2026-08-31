import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from 'next-themes'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import RoleGuard from '@/components/RoleGuard';
import Home from '@/pages/Home';
import Presupuestos from '@/pages/Presupuestos';
import Ajustes from '@/pages/Ajustes';
import Eventos from '@/pages/Eventos';
import Cabanas from '@/pages/Cabanas';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
import CotizarPublic from '@/pages/CotizarPublic';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle specific user not registered error
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app routes
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/cotizar" element={<CotizarPublic />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/presupuestos" element={<RoleGuard page="presupuestos"><Presupuestos /></RoleGuard>} />
          <Route path="/ajustes" element={<RoleGuard page="ajustes"><Ajustes /></RoleGuard>} />
          <Route path="/eventos" element={<RoleGuard page="eventos"><Eventos /></RoleGuard>} />
          <Route path="/cabanas" element={<RoleGuard page="cabanas"><Cabanas /></RoleGuard>} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
