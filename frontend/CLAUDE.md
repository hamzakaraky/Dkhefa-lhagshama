# CLAUDE.md — Frontend

Onboarding context for `frontend/`. Read the root `CLAUDE.md` for project-wide context. This file is area-specific; do not duplicate the root.

Next.js 16 (Pages Router) + React 18 + Tailwind 3. Bilingual HE/EN, RTL-first. Talks to the Express backend over HTTP.

## Run

- `npm run dev` — Next dev server on **port 3000**.
- `npm run build` / `npm run start` — production build + serve. `npm run lint` — `next lint`.
- Requires `frontend/.env.local`:
  - `NEXT_PUBLIC_FIREBASE_*` — Firebase Web SDK config (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
  - `NEXT_PUBLIC_API_BASE_URL` — Express backend base URL (defaults to `http://localhost:3001` if unset).

## Architecture

- **Pages Router** under `pages/`. Page files are **thin wrappers** that delegate to a screen, e.g. `pages/requests.tsx` → `<RequestsPage />` from `src/screens/`.
- **Screens** live in `src/screens/*.jsx` (HomePage, RequestsPage, MyRequestsPage, DirectoryPage, ChatListPage, ChatWindowPage, LoginPage, RegisterPage, VolunteerPage, AccountDisabledPage, `screens/admin/*`). All real UI/logic goes here, not in `pages/`.
- **i18n** via custom `src/contexts/LanguageContext.jsx`. `useLanguage()` returns `{ lang, setLang, toggleLang, t, isRTL, hydrated }`. Default lang `he`; preference persisted to `localStorage` key `pff-lang`. The provider sets `document.documentElement.lang/dir` and toggles `rtl`/`ltr` body classes on change.
- **Copy** is all in `src/data/translations.js` (`{ he: {...}, en: {...} }`, each with a `dir` field). Access via `t.<namespace>.<key>` (e.g. `t.nav.home`).
- `lib/firebase.ts` holds the Web SDK init; `src/lib/auth.ts` + `src/lib/apiClient.ts` are the auth/API surface.

## Conventions

- **NO hardcoded user-facing strings.** Every label, button, error, aria-label goes through `translations.js` and is read via `t.*`. Add both `he` and `en` entries.
- **RTL via logical CSS properties** (`margin-inline-start`, `padding-inline-end`, `start-0`, etc.) — never hardcode left/right. Use `isRTL` only when logical properties can't express it.
- **Design tokens** are CSS custom properties in `src/styles/globals.css` (`--sky`, `--ink`, `--ember`, `--cream`, gray ramp, semantic `--success`/`--danger`). The brand palette is locked — do not retune hues. Use tokens, not raw hex.
- **Thin page wrappers**: a new route is `pages/<x>.tsx` importing a screen from `src/screens/`. Keep `pages/` files minimal.
- **Route-collision rule (sharp edge):** never have both `pages/x.tsx` and a `pages/x/` directory. Choose one form per route. Existing nested routes use index files: `pages/chats/index.tsx`, `pages/admin/index.tsx`, `pages/admin/requests/index.tsx`, etc.

## Auth / roles

- `src/contexts/AuthContext.tsx` is the single source of truth: `useAuth()` → `{ user, role, loading, login, register, logout, refreshClaims }`.
- Roles (Firebase custom claim `role`): `beneficiary | businessOwner | volunteer | admin`.
- Role is read from the ID token via `getIdTokenResult()`. **Self-heal:** on login, a signed-in user with no role calls `ensureRoleAssigned()` (`POST /api/auth/register`, idempotent) which assigns default `beneficiary`, then force-refreshes the token. Privileged roles are left untouched.
- Disabled-account guard: a realtime listener on `users/{uid}` signs the user out and redirects to `/account-disabled` if an admin flips `disabled: true`.

## API

- All backend calls go through `src/lib/apiClient.ts` — `apiFetch(path, init)` (attaches `Authorization: Bearer <idToken>`) or `apiJson<T>(path)` (parse + throw on non-2xx).
- Base URL is `NEXT_PUBLIC_API_BASE_URL`. Server-trust writes are the Express backend's job; the **Firebase client SDK is read-mostly** (auth + realtime listeners), not for trusted writes.

## Gotchas

- **Turbopack HMR + route collisions:** a `pages/x.tsx` + `pages/x/` collision can panic the Turbopack dev server even when `next build` passes. If dev crashes after adding a route, check for this first.
- `LanguageContext` is SSR-safe: it starts on the default lang and adopts the saved preference after mount (`hydrated` flag). Don't read `localStorage` during render.
