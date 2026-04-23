import { Navigate, useLocation } from 'react-router-dom';
import { hasAnyRole } from '../utils/permissions';

export default function ProtectedRoute({ user, allowedRoles, children }) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // CHANGED: all role checks go through normalized helper
  if (!hasAnyRole(user?.role, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
