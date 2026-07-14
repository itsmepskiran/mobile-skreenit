import { apiGet, apiPostForm, apiPostJson } from '@/lib/api/client';
import type { AuthUser } from '@/lib/auth/store';
import { DEEP_LINK_CONFIRM_EMAIL, DEEP_LINK_RESET_PASSWORD } from '@/lib/config';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export function login(loginId: string, password: string) {
  return apiPostJson<{ ok: boolean; data: AuthSession }>(
    '/login',
    { login_id: loginId, password },
    { auth: false },
  );
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  mobile: string;
  location: string;
  role: 'candidate' | 'recruiter';
}

export function register(input: RegisterInput) {
  return apiPostJson<{ ok: boolean; data: AuthSession }>(
    '/register',
    {
      full_name: input.fullName,
      email: input.email,
      password: input.password,
      mobile: input.mobile,
      location: input.location,
      role: input.role,
      email_redirect_to: DEEP_LINK_CONFIRM_EMAIL,
    },
    { auth: false },
  );
}

export function confirmEmail(token: string, email: string) {
  return apiPostJson<{ ok: boolean; message: string; data?: { user: AuthUser } }>(
    '/confirm-email',
    { token, email },
    { auth: false },
  );
}

export function resendConfirmation(loginId: string) {
  return apiPostJson<{ ok: boolean; message: string }>(
    '/resend-confirmation',
    { login_id: loginId, email_redirect_to: DEEP_LINK_CONFIRM_EMAIL },
    { auth: false },
  );
}

export function forgotPassword(email: string) {
  return apiPostForm<{ ok: boolean; message: string }>(
    '/forgot-password',
    { email, email_redirect_to: DEEP_LINK_RESET_PASSWORD },
    { auth: false },
  );
}

export function verifyResetToken(token: string) {
  return apiPostJson<{ ok: boolean; email: string; message: string }>(
    '/verify-reset-token',
    { token },
    { auth: false },
  );
}

export function resetPassword(token: string, password: string) {
  return apiPostJson<{ ok: boolean; message?: string }>(
    '/reset-password',
    { token, password },
    { auth: false },
  );
}

export function switchRole(role: 'candidate' | 'recruiter') {
  return apiPostJson<{ ok: boolean; access_token: string; refresh_token: string; user: AuthUser }>(
    '/switch-role',
    { role },
  );
}

export interface MeResponseUser {
  id: string;
  email: string;
  full_name: string;
  role: 'candidate' | 'recruiter';
  roles: string[];
  onboarded: boolean;
}

export function getMe() {
  return apiGet<{ ok: boolean; data: MeResponseUser }>('/me');
}

// GET /me doesn't return has_multiple_roles (unlike login/register/switch-role) — derive it.
export function toAuthUser(data: MeResponseUser): AuthUser {
  const roles = data.roles ?? [data.role];
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    roles,
    has_multiple_roles: roles.length > 1,
    onboarded: data.onboarded,
  };
}

export function logout() {
  return apiPostJson<{ ok: boolean; message: string }>('/logout', {});
}
