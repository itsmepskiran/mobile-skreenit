import type { AuthTokens } from '@/lib/auth/store';

// Lets api/client.ts read/update tokens and sign out without importing
// auth/store.ts directly — store.ts registers itself here after it's created.
// That keeps the dependency one-directional (store -> api -> client -> this)
// instead of a require cycle (store -> api -> client -> store).
interface SessionController {
  getTokens: () => AuthTokens | null;
  updateTokens: (tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
}

let controller: SessionController | null = null;

export function registerSessionController(next: SessionController) {
  controller = next;
}

export function getSessionController(): SessionController {
  if (!controller) {
    throw new Error('Session controller accessed before auth store initialized');
  }
  return controller;
}
