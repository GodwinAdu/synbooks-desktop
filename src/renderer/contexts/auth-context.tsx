import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api-client';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  organizationId: string;
  profileImage?: string;
  permissions?: string[];
}

interface Organization {
  id: string;
  name: string;
  organizationCode: string;
  settings?: any;
  modules?: any;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; organizationName: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      api.setToken(token);
      api.get('/auth/me')
        .then((data: any) => {
          setUser(data.user);
          setOrganization(data.organization);
        })
        .catch(() => {
          localStorage.removeItem('auth-token');
          api.setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post('/auth/login', { email, password });
    api.setToken(result.token);
    setUser(result.user);
    setOrganization(result.organization);
  }, []);

  const register = useCallback(async (data: { fullName: string; email: string; password: string; organizationName: string }) => {
    const result = await api.post('/auth/register', data);
    api.setToken(result.token);
    setUser(result.user);
    setOrganization(result.organization);
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    setOrganization(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, organization, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
