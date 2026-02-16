import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const lang = localStorage.getItem('preferred_language');
  const email = localStorage.getItem('user_email');

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only redirect when gender is explicitly null
  if (user?.gender === null) {
    return <Navigate to="/gender" replace />;
  }
  if (!lang) {
    return <Navigate to="/language" replace />;
  }
  if (!email) {
    return <Navigate to="/email" replace />;
  }

  return <>{children}</>;
}
