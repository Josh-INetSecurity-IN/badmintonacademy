import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, can } from '@/features/auth/useAuth';

interface RequireRoleProps {
  roles: string[];
  children: ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth();

  if (!can(user, roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
