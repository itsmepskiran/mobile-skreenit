import { useRouter } from 'expo-router';
import { useState } from 'react';

import { switchRole as switchRoleRequest } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/button';

// Only renders for dual-role accounts — most users have a single role and
// never see this. Web equivalent: the role toggle exposed once has_multiple_roles.
export function RoleSwitcher() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const rememberMe = useAuthStore((state) => state.rememberMe);
  const setSession = useAuthStore((state) => state.setSession);
  const [loading, setLoading] = useState(false);

  if (!user?.has_multiple_roles) return null;

  const targetRole = user.role === 'recruiter' ? 'candidate' : 'recruiter';

  const onPress = async () => {
    setLoading(true);
    try {
      const res = await switchRoleRequest(targetRole);
      // Preserve the existing remember-me choice — this isn't a fresh login decision.
      await setSession({ accessToken: res.access_token, refreshToken: res.refresh_token }, res.user, rememberMe);
      router.replace(targetRole === 'recruiter' ? '/(recruiter)/ats-services' : '/(candidate)/jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      title={`Switch to ${targetRole === 'recruiter' ? 'Recruiter' : 'Candidate'} view`}
      variant="secondary"
      icon="right-left"
      loading={loading}
      onPress={onPress}
    />
  );
}
