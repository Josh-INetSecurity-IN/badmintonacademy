import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { login as apiLogin, getProfile } from '@/services/auth';
import type { ApiUser } from '@/types';

interface AuthContextValue {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ba_token');
    const storedUser = localStorage.getItem('ba_user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      getProfile()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('ba_token');
          localStorage.removeItem('ba_user');
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem('ba_token', res.token);
    localStorage.setItem('ba_user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('ba_token');
    localStorage.removeItem('ba_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const can = (user: ApiUser | null, roles: string[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role) || user.role === 'super_admin';
};
