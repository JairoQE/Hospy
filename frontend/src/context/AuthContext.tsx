import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearTokens, getAccessToken, setTokens } from "../api/client";
import type { RegisterResponse, User, UserRole } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    options?: { remember?: boolean },
  ) => Promise<void>;
  register: (
    data: {
      email: string;
      first_name: string;
      last_name: string;
      password: string;
      username?: string;
    },
    asOwner?: boolean,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isRole: (...roles: UserRole[]) => boolean;
  isOwnerApproved: () => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const profile = await api.get<User>("/auth/perfil/");
      setUser(profile);
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const onSessionEnd = () => {
      clearTokens();
      setUser(null);
    };
    window.addEventListener("hospy:session-expired", onSessionEnd);
    window.addEventListener("hospy:logout", onSessionEnd);
    return () => {
      window.removeEventListener("hospy:session-expired", onSessionEnd);
      window.removeEventListener("hospy:logout", onSessionEnd);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, options?: { remember?: boolean }) => {
      const tokens = await api.post<{ access: string; refresh: string }>(
        "/auth/login/",
        { email, password },
        false,
      );
      setTokens(tokens.access, tokens.refresh, options?.remember !== false);
      await refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    async (
      data: {
        email: string;
        first_name: string;
        last_name: string;
        password: string;
        username?: string;
      },
      asOwner = false,
    ) => {
      const path = asOwner ? "/auth/registro-propietario/" : "/auth/registro/";
      const res = await api.post<RegisterResponse>(path, data, false);
      setTokens(res.access, res.refresh);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    window.dispatchEvent(new Event("hospy:logout"));
  }, []);

  const isRole = useCallback(
    (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const isOwnerApproved = useCallback(
    () =>
      user?.role === "propietario" ? user.owner_status === "aprobado" : false,
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isRole,
      isOwnerApproved,
    }),
    [user, loading, login, register, logout, refreshUser, isRole, isOwnerApproved],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
