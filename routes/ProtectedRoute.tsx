import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const lang = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('preferred_language') : null;
  const email = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('user_email') : null;

  // Not logged in
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Only redirect when gender is explicitly null
  if (user?.gender === null) {
    return <Redirect href="/gender" />;
  }
  if (!lang) {
    return <Redirect href="/language" />;
  }
  if (!email) {
    return <Redirect href="/email" />;
  }

  return <>{children}</>;
}
