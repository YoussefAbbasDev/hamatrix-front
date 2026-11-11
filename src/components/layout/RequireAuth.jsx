import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider.jsx';
import { FullPageLoader } from '../ui/Switch.jsx';

export function RequireAuth({ children }) {
  const { isAuthenticated, isBooting } = useAuth();
  const location = useLocation();

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <FullPageLoader label="جارٍ التحقق من الجلسة…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
