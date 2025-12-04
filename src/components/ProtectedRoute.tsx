import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return null; // or redirect to login page
  }

  return <>{children}</>;
};