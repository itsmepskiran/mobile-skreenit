import { create } from 'zustand';

import { atsMe, type AtsUser } from '@/lib/api/ats';
import { registerAtsSessionController } from '@/lib/auth/ats-session-controller';
import { clearAtsToken, loadAtsToken, saveAtsToken } from '@/lib/auth/ats-token-storage';

type AtsAuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AtsAuthState {
  status: AtsAuthStatus;
  token: string | null;
  user: AtsUser | null;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: AtsUser) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAtsStore = create<AtsAuthState>((set, get) => ({
  status: 'loading',
  token: null,
  user: null,

  hydrate: async () => {
    const token = await loadAtsToken();
    if (!token) {
      set({ status: 'signedOut', token: null, user: null });
      return;
    }

    set({ token });
    try {
      // Re-validate on every cold start (no refresh token to fall back on) —
      // mirrors useAuthStore.hydrate()'s getMe() call for the candidate/recruiter session.
      const res = await atsMe();
      set({ status: 'signedIn', user: res.data });
    } catch {
      await clearAtsToken();
      set({ status: 'signedOut', token: null, user: null });
    }
  },

  setSession: async (token, user) => {
    await saveAtsToken(token);
    set({ status: 'signedIn', token, user });
  },

  signOut: async () => {
    await clearAtsToken();
    set({ status: 'signedOut', token: null, user: null });
  },
}));

registerAtsSessionController({
  getToken: () => useAtsStore.getState().token,
  signOut: () => useAtsStore.getState().signOut(),
});
