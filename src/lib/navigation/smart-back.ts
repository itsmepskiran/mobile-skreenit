import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import type { Href } from 'expo-router';

// Expo Router organizes screens into tab-scoped nested Stacks (e.g.
// (recruiter)/applications/_layout.tsx is a Stack with index + [id]). When a
// screen OUTSIDE that stack — a different tab, especially a hidden one like
// candidate-search.tsx — pushes directly into a non-root screen of a stack it
// doesn't belong to (e.g. router.push('/(recruiter)/applications/SOME_ID')),
// Expo Router synthesizes that stack's own index screen underneath it in
// history. So router.back() (default header back button, a mutation's
// onSuccess, a cancel button, ...) pops to that stack's index instead of back
// to wherever the user actually came from.
//
// Fix: the pusher tags the destination URL with a `backTo` query param naming
// its own route; the destination reads it via useSmartBack() and replaces to
// that route instead of calling router.back() when present. Same-stack pushes
// (e.g. applications/index.tsx -> applications/[id]) don't need this — the
// default back behavior is already correct there — so just don't pass backTo.

// Cast through Href: Expo Router's typed routes only recognize the exact
// literal path patterns generated from the file tree, and a dynamic path with
// a query string appended (e.g. `/(recruiter)/applications/${id}?backTo=...`)
// doesn't match any of those literals even though it resolves correctly at
// runtime.
export function withBackTo(path: string, backTo: string): Href {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}backTo=${encodeURIComponent(backTo)}` as Href;
}

export function useSmartBack() {
  const { backTo } = useLocalSearchParams<{ backTo?: string }>();

  const goBack = () => {
    if (backTo) router.replace(backTo as Href);
    else router.back();
  };

  return { backTo, goBack };
}

// For a screen with several early-return render branches (a multi-stage flow
// where sprinkling <Stack.Screen options={...}/> into every branch is
// impractical) — sets the header back button imperatively once instead.
export function useSmartBackHeader(renderBackButton: (goBack: () => void) => ReactNode) {
  const navigation = useNavigation();
  const { backTo, goBack } = useSmartBack();

  useLayoutEffect(() => {
    if (backTo) {
      navigation.setOptions({ headerLeft: () => renderBackButton(goBack) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backTo, navigation]);

  return { backTo, goBack };
}
