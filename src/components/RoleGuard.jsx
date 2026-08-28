import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { canAccess } from '@/lib/roles';

export default function RoleGuard({ page, children }) {
  const { user } = useAuth();
  if (!canAccess(user?.role, page)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
