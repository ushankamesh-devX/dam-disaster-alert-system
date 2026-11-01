import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authService, type LoginPayload, type RegisterPayload } from '@/services/auth/auth.service';
import { userService } from '@/services/users/user.service';
import { tokenStorage } from '@/services/api/token.storage';
import { setUnauthorizedHandler } from '@/services/api/axios.instance';
import type { UserProfile } from '@/models/user';
import i18n from '@/i18n/i18n';

interface Session {
  user: UserProfile | null;
  booting: boolean;
  restoreError: boolean;
  restore: () => Promise<void>;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (damId: number, language: string) => Promise<void>;
}
const AuthContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const applyUser = useCallback(async (profile: UserProfile, attempt: number) => {
    if (['en', 'si'].includes(profile.languagePreference)) await i18n.changeLanguage(profile.languagePreference);
    if (attempt === generation.current) setUser(profile);
  }, []);
  const restore = useCallback(async () => {
    const attempt = ++generation.current;
    setBooting(true); setRestoreError(false);
    try {
      if (await tokenStorage.get()) {
        const result = await userService.getMe();
        if (attempt === generation.current) await applyUser(result.data.data, attempt);
      }
    } catch {
      // 401 handling removes invalid tokens; connectivity errors keep them for retry.
      if (attempt === generation.current && await tokenStorage.get()) setRestoreError(true);
    } finally { if (attempt === generation.current) setBooting(false); }
  }, [applyUser]);
  useEffect(() => {
    setUnauthorizedHandler(() => { generation.current++; setUser(null); setBooting(false); setRestoreError(false); });
    const initial = setTimeout(() => void restore(), 0);
    return () => { clearTimeout(initial); invalidate(); setUnauthorizedHandler(null); };
  }, [restore, invalidate]);
  const logout = async () => {
    generation.current++;
    await authService.logout();
    setUser(null); setRestoreError(false); setBooting(false);
  };
  const value: Session = {
    user, booting, restoreError, restore, logout,
    login: async data => { const attempt = ++generation.current; await applyUser((await authService.login(data)).data.data.user, attempt); },
    register: async data => { const attempt = ++generation.current; await applyUser((await authService.register(data)).data.data.user, attempt); },
    completeOnboarding: async (damId, language) => {
      const attempt = generation.current;
      const response = await userService.updateProfile({ preferredDamId: damId, languagePreference: language });
      await applyUser(response.data.data, attempt);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const session = useContext(AuthContext);
  if (!session) throw new Error('AuthProvider is required');
  return session;
}
