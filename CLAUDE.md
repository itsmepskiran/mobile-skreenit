@AGENTS.md

# Architecture Map

Expo SDK 57 + React Native 0.86 + React 19, TypeScript, **expo-router** (file-based routing) as the entry (`main: "expo-router/entry"`). State: `zustand`; data fetching: `@tanstack/react-query`; forms: `react-hook-form` + `zod` + `@hookform/resolvers`; nav-adjacent: `expo-linking`, `expo-notifications` (push), `expo-camera`/`expo-image-picker`/`expo-document-picker` (resume/video upload), `react-native-webview`, `expo-video`, `expo-speech`, `react-native-chart-kit`, `react-native-qrcode-svg` (job/assessment-invite QR sharing), Razorpay checkout component.

Sibling repos: `mac-skreenit` ("Backend V1") is the API this app calls, and `sql-skreenit` is the web frontend talking to the same backend under the same `/api/v1` prefix.

## Route groups (`src/app/`, expo-router)
Four parallel route groups, each with its own `_layout.tsx`, mirroring the web app's audience split:
- `(auth)` — `login`, `register`, `forgot-password`, `reset-password`, `confirm-email`
- `(ats-auth)` — separate `login` for the ATS/HRMS employer console (own session, see below)
- `(ats)` — `dashboard`, `departments`, `designations`, `employees`, `jobs`, `positions`, `reports`, `requisitions`, `users`, `menu`
- `(candidate)` — `dashboard`, `jobs` (`index`, `[id]`), `applications`, `assessments` (`index`, `take/[planId]`, `result/[sessionId]`), `interview-room/[applicationId]`, `employability-report`, `resume-writing`, `training-sessions`, `notifications`, `profile`, `purchase-history`
- `(recruiter)` — `dashboard`, `jobs`, `applications` (`index`, `[id]`), `candidate-search`, `interviews`, `interviews-calendar`, `detailed-analysis/[requestId]`, `analysis-reports`, `resume-analysis`, `jd-writer`, `company-quota`, `credits`, `premium`, `ats-services`, `reports`, `notifications`, `profile`, `purchase-history`
- Top-level: `index.tsx` (root/splash routing), `assessment-invite.tsx` (guest/no-login invite deep link).

## `src/lib/` — app logic layer
- `lib/config.ts`: `API_BASE_URL` from `Constants.expoConfig.extra.apiBaseUrl` (default `http://api.skreenit.com`), with dev-host resolution — on Android emulator loopback URLs get rewritten to `10.0.2.2`; on a physical device via Expo Dev, rewritten to the Expo dev-server LAN host. `API_V1 = ${API_BASE_URL}/api/v1` — same `/api/v1` prefix as the backend's single mounted router. Also defines `JOB_DETAILS_URL` (`https://dashboard.skreenit.com/job-details.html`) and `ASSESSMENT_INVITE_APPLY_URL` (`https://assessments.skreenit.com/apply.html`) as fixed production URLs for QR-code/share-link targets, mirroring `CONFIG.PAGES` in the web frontend's `config.js` — these stay absolute since QR codes get scanned off-network.
- `lib/api/`: one file per domain matching backend routers — `auth`, `applicant`, `recruiter`, `dashboard-metrics`, `candidate-dashboard`, `jobs`, `analytics`, `assessments`, `assessment-taking`, `position-assessments`, `interviews`, `notifications`, `credits`, `subscription`, `resume-analysis`, `resume-writing`, `jd-writer`, `training`, `reference`, `ats`, `employability-report`, plus `client.ts` (shared HTTP client, presumably attaches JWT).
- `lib/auth/`: **two separate session stacks** — `store.ts`/`session-controller.ts`/`token-storage.ts` for the normal candidate/recruiter auth, and a distinct `ats-store.ts`/`ats-session-controller.ts`/`ats-token-storage.ts` for the ATS/HRMS console — consistent with `(ats-auth)` being its own route group with its own login.
- `lib/navigation/smart-back.ts`, `lib/assessment-catalog.ts`, `lib/format.ts`.

## `src/components/` (~35 shared components)
Form/UI primitives (`text-field`, `select-field`, `button`, `stepper`, `skill-tag-input`, `location-picker`, `college-autocomplete`), domain widgets (`job-card`, `job-form`, `job-share-modal`, `candidate-profile-modal`, `assessment-wizard-modal`, `assessment-taking/`, `assessment-invite-modal`, `razorpay-checkout`, `schedule-interview-modal`, `reschedule-interview-modal`, `purchase-history-row`/`-screen`), ATS-specific (`ats-form-modal`, `ats-search-bar`, `ats-status-badge`), role/nav chrome (`role-choice-modal`, `role-switcher`, `role-toggle`, `top-brand-bar`, `brand-header`, `auth-screen-layout`, `welcome-screen`), theming (`themed-text`, `themed-view`, `use-theme`/`use-color-scheme` hooks in `src/hooks/`), `profile-wizard/`.

## Notes
- Users can hold multiple roles (candidate/recruiter) and switch between the `(candidate)` and `(recruiter)` route groups at runtime (`role-switcher`/`role-toggle` components) — mirrors the backend's `User.roles` JSON list + `POST /auth/switch-role`.
- Mobile talks to the **same** backend/API as the web frontend (same `/api/v1` prefix, same `api.skreenit.com` in production) — there is one backend serving both clients, not separate mobile/web APIs.

---
*Last synced from local Claude memory 2026-10-03. May drift from code over time — verify against current code before relying on specifics.*
