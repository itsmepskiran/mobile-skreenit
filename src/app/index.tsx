import { Redirect } from 'expo-router';

// Root layout's `useProtectedRoute` handles the real redirect once the auth
// store finishes hydrating; this is just the initial route it lands on.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
