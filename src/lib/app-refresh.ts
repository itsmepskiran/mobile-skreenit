import * as Updates from 'expo-updates';

// Over-the-air update helper used by the launch / resume welcome screen.
//
// By default expo-updates downloads a new update in the background and only applies it on the
// launch AFTER that — so a user can run an old version for a whole extra session. During the
// welcome screen we check right away instead: if an update is ready we fetch it and restart into
// it before the app is shown. Bounded by a timeout so a slow network never traps the user on the
// splash. Does nothing in development builds (Updates.isEnabled is false).

function timeout<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Resolves true only when it is restarting into a freshly downloaded update. */
export async function applyUpdateIfAvailable(timeoutMs = 4000): Promise<boolean> {
  if (!Updates.isEnabled) return false;
  const work = (async () => {
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return false;
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    } catch {
      return false; // offline or server hiccup — just continue into the app
    }
  })();
  return Promise.race([work, timeout(timeoutMs, false)]);
}

/** Download a pending update without restarting (used when the app resumes from the background,
 *  where an unexpected restart could throw away a half-filled form). It applies on the next launch. */
export async function prefetchUpdate(): Promise<void> {
  if (!Updates.isEnabled) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    /* ignore */
  }
}
