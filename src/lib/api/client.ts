import * as FileSystem from 'expo-file-system/legacy';

import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : 'Request failed');
    this.status = status;
    this.detail = detail;
  }
}

// Backend mixes JSON and form-encoded bodies across endpoints (see routers/auth.py):
// login/register/confirm-email/reset-password use JSON, forgot-password/refresh-token
// use `Form(...)`. The two POST helpers below mirror that split exactly.

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { getTokens, updateTokens, signOut } = getSessionController();
  const tokens = getTokens();
  if (!tokens?.refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const body = new URLSearchParams({ refresh_token: tokens.refreshToken });
        const res = await fetch(`${API_V1}/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        if (!res.ok) {
          // Only a definitive rejection of the refresh token itself (401)
          // means the session is actually over. A network blip, timeout, or
          // 5xx from this call is transient — signing the user out for that
          // would nuke a valid session over a hiccup unrelated to auth (this
          // is what mirrors web's backend-client.js, which never force-logs-out
          // on a failed refresh either). Just fail this one refresh attempt
          // and let the original request surface its own error instead.
          if (res.status === 401) await signOut();
          return null;
        }
        const json = await res.json();
        const newTokens = { accessToken: json.data.access_token as string, refreshToken: json.data.refresh_token as string };
        await updateTokens(newTokens);
        return newTokens.accessToken;
      } catch {
        // Network-level failure reaching /refresh-token — transient, not a
        // verdict on the refresh token's validity. Don't sign out.
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function rawRequest(path: string, init: RequestInit, useAuth: boolean, isRetry = false): Promise<Response> {
  const headers = new Headers(init.headers);
  if (useAuth) {
    const tokens = getSessionController().getTokens();
    if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  const res = await fetch(`${API_V1}${path}`, { ...init, headers });

  if (res.status === 401 && useAuth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      return rawRequest(path, { ...init, headers }, useAuth, true);
    }
  }

  return res;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    // Route-level errors are wrapped by utils_others/error_handler.py's global handlers
    // as {ok, error, message, request_id} — but middleware/auth_middleware.py's own 401s
    // (missing/invalid Authorization header) short-circuit before that and use FastAPI's
    // plain {"detail": ...} instead. Handle whichever shape is actually present.
    // `message` is usually a string, but is an array of validation errors for 422s.
    let detail: unknown = body;
    if (isJson && body && typeof body === 'object') {
      if ('message' in body) detail = body.message;
      else if ('detail' in body) detail = body.detail;
    }
    throw new ApiError(res.status, detail);
  }

  return body as T;
}

interface RequestOpts {
  auth?: boolean;
}

export async function apiGet<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const res = await rawRequest(path, { method: 'GET' }, opts.auth ?? true);
  return parseResponse<T>(res);
}

// `body` is JSON-encoded when present (e.g. PUT /recruiter/jobs/{id}); omit it
// for the bodyless PUTs elsewhere in the app (e.g. /notifications/{id}/read).
export async function apiPut<T>(path: string, opts: RequestOpts & { body?: unknown } = {}): Promise<T> {
  const { body, auth, ...rest } = opts;
  const init: RequestInit = { method: 'PUT', ...rest };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await rawRequest(path, init, auth ?? true);
  return parseResponse<T>(res);
}

export async function apiDelete<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const res = await rawRequest(path, { method: 'DELETE' }, opts.auth ?? true);
  return parseResponse<T>(res);
}

export async function apiPostJson<T>(path: string, body: unknown, opts: RequestOpts = {}): Promise<T> {
  const res = await rawRequest(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    opts.auth ?? true,
  );
  return parseResponse<T>(res);
}

export async function apiPostForm<T>(
  path: string,
  form: Record<string, string | undefined>,
  opts: RequestOpts = {},
): Promise<T> {
  const params = new URLSearchParams();
  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, value);
  });

  const res = await rawRequest(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() },
    opts.auth ?? true,
  );
  return parseResponse<T>(res);
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

// Uploads via expo-file-system's native upload task instead of fetch+FormData.
// The RN/Hermes FormData polyfill under Expo Router on Android throws
// "Unsupported FormDataPart implementation" for the {uri,name,type} shorthand
// in this SDK — a native task hands the file straight to platform code and
// sidesteps that layer entirely. Only supports a single file field, which
// covers /generate-interview-questions and /upload-video-response.
export async function apiUploadNative<T>(
  path: string,
  file: UploadFile,
  fieldName: string,
  fields: Record<string, string | number> = {},
  opts: RequestOpts = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.auth ?? true) {
    const tokens = getSessionController().getTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const result = await FileSystem.uploadAsync(`${API_V1}${path}`, file.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    mimeType: file.type,
    parameters: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)])),
    headers,
  });

  const isJson = result.headers['content-type']?.includes('application/json') ?? true;
  const body = isJson ? JSON.parse(result.body) : result.body;

  if (result.status < 200 || result.status >= 300) {
    const detail = body && typeof body === 'object' && 'message' in body ? body.message : body;
    throw new ApiError(result.status, detail);
  }
  return body as T;
}

// Shared polling loop for the backend's "submit now, poll later" job pattern
// (utils_others/async_job_store.py). Needed because neither apiUploadNative
// (FileSystem.uploadAsync has no timeout option at all) nor the plain fetch()
// in rawRequest above (no AbortController) can be given a longer timeout the
// way the web client does per-call — so any endpoint whose real work can run
// past the OS's default request timeout returns a job_id immediately instead,
// and callers poll GET .../async/{job_id} with this until it completes.
export async function pollAsyncJob<T>(
  getStatus: () => Promise<{ ok: boolean; data: { status: string } & Partial<T> }>,
  opts: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<T> {
  const intervalMs = opts.intervalMs ?? 4000;
  const maxAttempts = opts.maxAttempts ?? 90; // ~6 minutes ceiling

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const res = await getStatus();
    if (res.data.status === 'completed') {
      const { status: _status, ...result } = res.data;
      return result as T;
    }
  }

  throw new ApiError(0, 'This is taking longer than expected. Please try again.');
}
