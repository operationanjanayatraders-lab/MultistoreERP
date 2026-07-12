import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PUBLIC_ROUTES = ['/login', '/reset-password'];

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_ROUTES.includes(location.pathname);
  if (!session && !isPublic) return <Navigate to="/login" replace />;
  if (session && isPublic) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};
