# CLAUDE.md — Backend

Onboarding context for `backend/`. Read the root `CLAUDE.md` for project-wide context. This file is area-specific; do not duplicate the root.

Express 4 + Firebase Admin SDK (TypeScript). All server-trusted Firestore writes live here.

## Run

- `npm run dev` — nodemon, **port 3001** (`PORT` env overrides).
- `npm run build` (`tsc`) / `npm run start` (`node dist/index.js`). `npm run type-check` (`tsc --noEmit`). `npm run lint` / `lint:fix`.
- Requires `backend/.env`:
  - `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json` — Firebase Admin service account.
  - `FRONTEND_ORIGIN` — primary allowed CORS origin (defaults `http://localhost:3000`). `CORS_ALLOWED_ORIGINS` (comma-separated) adds more.
- `GET /health` (unauthenticated) → `{ ok, service }`. Used by deploy targets + frontend connectivity checks. `GET /api/me` returns the authed `{ uid, email, role }`.

## Architecture

- Express bootstrap in `src/index.ts`: initializes Firebase Admin, mounts helmet → CORS allowlist → global rate limiter → `express.json({ limit: '1mb' })` → routes → catch-all 404.
- Routers live in `src/routes/<area>.ts`, mounted in `src/index.ts`. The **Admin SDK is the only path for server-trust writes** — the frontend's Firebase client SDK is read-mostly.

## Route map (verified)

- `/api/auth` — `POST /register` (authenticate; idempotent default-role assign).
- `/api/requests` — `POST /`, `GET /mine`, `GET /:id/events`, `GET /:id` (all authenticate).
- `/api/uploads` — `POST /requests/:requestId` (authenticate, raw body ≤12mb).
- `/api/users` — `GET /me`, `PATCH /me` (authenticate).
- `/api/ratings` — `POST /`, `GET /:requestId` (authenticate).
- `/api/chats` — `POST /`, `POST /:id/messages` (authenticate).
- `/api/businesses` — `GET /` (public), `POST /` (authenticate).
- `/api/answers` — `GET /` (public).
- `/api/volunteers` — `POST /apply` (authenticate).
- `/api/admin` — `GET /pending`, `POST /approve`, `POST /reject`, `POST /request-changes`.
- `/api/admin/requests` — `GET /`, `GET /:id`, `POST /:id/assign`, `POST /:id/status`, `POST /:id/note`.
- `/api/admin/users` — `GET /`, `POST /:uid/promote`, `POST /:uid/demote`, `POST /:uid/disable`, `POST /:uid/enable`.
- `/api/admin/volunteers` — `GET /`, `POST /:id/approve`, `POST /:id/reject`, `POST /:uid/deactivate`.
- `/api/admin/stats` — `GET /`.
- Mount order matters: `/api/admin/{volunteers,requests,users,stats}` are mounted **before** the generic `/api/admin` router.

## Auth

- `src/middleware/auth.ts`. `authenticate` verifies the Firebase ID token from `Authorization: Bearer <token>` via `verifyIdToken()` and attaches `req.user = { uid, email, role }`; returns 401 on missing/invalid token.
- `requireRole(role)` gates by claim → 401 if unauthenticated, 403 if role mismatch. All `admin*` routers do `router.use(authenticate, requireRole('admin'))`.
- Roles (custom claim `role`): `beneficiary | businessOwner | volunteer | admin`.

## Data

- Firestore via Admin SDK (`src/lib/firebaseAdmin.ts`, `db()`). Collections include `users`, `requests`, `requestEvents`, `businesses`, `answers`, `auditLogs`, plus chats/messages/ratings/volunteers.
- **Every mutation writes an `auditLog`** via `writeAuditLog()` (`src/lib/audit.ts`) — `{ actorId, action, entityType, entityId, details? }` + server timestamp. This is the security/incident trail.
- Where a request lifecycle step happens, **also append a `requestEvent`** via `src/lib/requestEvents.ts` (`created | attachment_added | assigned | status_changed | note_added | rated`, visibility `all | internal`). This is the user-facing per-request timeline; clients can never write events.

## Scripts

- `npm run seed` — seed Firestore taxonomy/data.
- `npm run set-admin -- you@example.com` — set `admin` claim (user must already exist in Firebase Auth).
- `npm run set-volunteer -- you@example.com` — set `volunteer` claim.
- `npm run set-roles -- a@x.com:admin b@x.com:volunteer` — bulk `<email>:<role>` assignment.

## Conventions

- **Zod** validates all request bodies (e.g. `statusSchema = z.object({ status: z.enum(REQUEST_STATUSES) })`). Reject invalid input with 4xx.
- **Forward-only request status**: lifecycle is `pending → in_progress → resolved → rejected → closed` (`REQUEST_STATUSES` in `routes/requests.ts`). Transitions may only move equal-or-later; backward moves are rejected. The status change runs inside a Firestore transaction → 409 on concurrent edit.
- **Security middleware**: `helmet()` for headers, `express-rate-limit` (global 300/15min; stricter `authWriteLimiter` 30/15min on auth+write routes), and a CORS **allowlist** (`FRONTEND_ORIGIN` + `CORS_ALLOWED_ORIGINS` + private-LAN/localhost dev origins).
