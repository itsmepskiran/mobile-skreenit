import { create } from 'zustand';

import { getMe, toAuthUser } from '@/lib/api/auth';
import { registerSessionController } from '@/lib/auth/session-controller';
import { clearTokens, loadTokens, saveTokens } from '@/lib/auth/token-storage';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'candidate' | 'recruiter';
  roles: string[];
  has_multiple_roles: boolean;
  onboarded: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  tokens: AuthTokens | null;
  user: AuthUser | null;
  rememberMe: boolean;
  hydrate: () => Promise<void>;
  setSession: (tokens: AuthTokens, user: AuthUser, rememberMe?: boolean) => Promise<void>;
  updateTokens: (tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  tokens: null,
  user: null,
  rememberMe: true,

  hydrate: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ status: 'signedOut', tokens: null, user: null });
      return;
    }

    set({ tokens });
    try {
      // Re-fetch the current user (and, critically, their active role) on every
      // cold start — a stored token says nothing about which role is active
      // now, since that can change server-side (e.g. switched on the web app).
      const res = await getMe();
      set({ status: 'signedIn', user: toAuthUser(res.data) });
    } catch {
      await clearTokens();
      set({ status: 'signedOut', tokens: null, user: null });
    }
  },

  setSession: async (tokens, user, rememberMe = true) => {
    await saveTokens(tokens, rememberMe);
    set({ status: 'signedIn', tokens, user, rememberMe });
  },

  updateTokens: async (tokens) => {
    await saveTokens(tokens, get().rememberMe);
    set({ tokens });
  },

  signOut: async () => {
    await clearTokens();
    set({ status: 'signedOut', tokens: null, user: null, rememberMe: true });
  },
}));

registerSessionController({
  getTokens: () => useAuthStore.getState().tokens,
  updateTokens: (tokens) => useAuthStore.getState().updateTokens(tokens),
  signOut: () => useAuthStore.getState().signOut(),
});
