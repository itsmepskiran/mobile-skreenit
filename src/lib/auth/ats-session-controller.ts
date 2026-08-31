// Lets api/ats.ts read the ATS bearer token and sign out without importing
// auth/ats-store.ts directly — ats-store.ts registers itself here after it's
// created. Mirrors session-controller.ts's one-directional dependency trick
// (store -> api -> this) instead of a require cycle (store -> api -> store).
interface AtsSessionController {
  getToken: () => string | null;
  signOut: () => Promise<void>;
}

let controller: AtsSessionController | null = null;

export function registerAtsSessionController(next: AtsSessionController) {
  controller = next;
}

export function getAtsSessionController(): AtsSessionController {
  if (!controller) {
    throw new Error('ATS session controller accessed before ats-store initialized');
  }
  return controller;
}
