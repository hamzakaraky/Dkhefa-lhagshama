// Shared domain types for the Push-for-Fulfillment frontend.
//
// These are pragmatic, intentionally loose shapes inferred from the mock data
// in `@/data/mockData` and `@/data/translations`. The dedicated typing phase
// will tighten and consume them; for now they exist so call sites can import a
// single canonical set instead of re-deriving inline shapes.

/**
 * Loosely-typed view of a value caught in a `catch` block. TypeScript only
 * permits `unknown`/`any` as the catch-variable annotation, so call sites cast
 * the caught value to this shape to read the optional fields the API/runtime
 * may attach (`@/lib/apiClient` throws `ApiError`, browser errors carry
 * `message`). Every access remains optional, so behaviour is unchanged.
 */
export interface CaughtError {
  status?: number;
  message?: string;
  detail?: { error?: string };
}

/**
 * Recursive, intentionally-loose view of the bilingual translation table and
 * any other dynamically-indexed JSON the UI treats as free-form. It behaves
 * like the former `any` at call sites — supports `t.a.b`, `t.x[key]`, and use as
 * a `ReactNode`/`string`/`Key` — without tripping `no-explicit-any`. Used only
 * where a value is genuinely dynamic; prefer concrete types everywhere else.
 */
export type TNode = string &
  ((...args: unknown[]) => TNode) & { [key: string]: TNode };

/**
 * Platform access role, sourced from a Firebase custom claim. These are the
 * three roles the role model (`useAuth().role` / `hasRole`) reasons about.
 * `admin` is a superset: it satisfies any `hasRole` check.
 *
 * Note: the wider codebase (admin user management) may also persist the legacy
 * `businessOwner` value as a raw claim string; it is intentionally outside this
 * gated union and is treated as "no gated role" by `hasRole`.
 */
export type Role = 'beneficiary' | 'volunteer' | 'admin';

/** UI language. Hebrew is the default / RTL language. */
export type Lang = 'he' | 'en';

/** Text direction tied to the active language. */
export type Dir = 'rtl' | 'ltr';

/** Broad service / activity area used to tag requests, NGOs and volunteers. */
export type Area =
  | 'education'
  | 'employment'
  | 'social'
  | 'legal'
  | 'housing'
  | string;

/**
 * Canonical lifecycle status of a beneficiary request (request-lifecycle spec).
 *
 * Authority is the backend transition map; these are the only states the
 * server persists:
 * - `pending`         — submitted, awaiting admin triage
 * - `in_progress`     — assigned to a volunteer / being worked
 * - `awaiting_review` — volunteer marked done, awaiting admin close
 * - `closed`          — completed (keys the beneficiary rating prompt)
 * - `rejected`        — declined by admin
 * - `referred`        — handed to a partner from the `answers` catalog
 *                       (terminal; counts as helped, sets `archived = true`)
 *
 * NOTE: the legacy `resolved` status is **retired** — the rating prompt now
 * keys off `closed`. The `| string` tail is an intentional, pragmatic escape
 * hatch kept so stale mock data and in-flight consumer screens keep compiling
 * while they are reconciled to the canonical literals in parallel phases.
 */
export type RequestStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_review'
  | 'closed'
  | 'rejected'
  | 'referred'
  | string;

export type Urgency = 'low' | 'medium' | 'high' | string;

export type VolunteerStatus = 'available' | 'assigned' | string;

/** A community-owned business listed in the directory (UC-03). */
export interface Business {
  id: number | string;
  name: string;
  logo?: string;
  logoColor?: string;
  category: string;
  desc?: string;
  descEn?: string;
  tags?: string[];
  tagsEn?: string[];
  city?: string;
  cityEn?: string;
  phone?: string;
  rating?: number;
  reviews?: number;
  approved?: boolean;
  featured?: boolean;
}

/** A partner NGO / organization in the "answers" catalog (UC-02). */
export interface NGO {
  id: number | string;
  name: string;
  nameEn?: string;
  logo?: string;
  logoColor?: string;
  area?: string;
  areaEn?: string;
  areas?: Area[];
  desc?: string;
  descEn?: string;
  tags?: string[];
  tagsEn?: string[];
  phone?: string;
  website?: string;
}

/** Alias kept for readability at NGO/partner call sites. */
export type Partner = NGO;

/** A registered volunteer (UC-04 / volunteer directory). */
export interface Volunteer {
  id: number | string;
  name: string;
  nameEn?: string;
  initials?: string;
  profession?: string;
  professionEn?: string;
  areas?: Area[];
  availability?: string;
  availabilityEn?: string;
  city?: string;
  cityEn?: string;
  status?: VolunteerStatus;
  joinedDate?: string;
  assignedTo?: string | null;
}

/**
 * A referral of a request to a partner in the live `answers` catalog (Note 8).
 * Set server-side by `POST /api/admin/requests/:id/refer`; the request then
 * moves to `referred` (terminal, archived). The beneficiary sees
 * `partnerName` (+ contact) as a timeline event.
 */
export interface Referral {
  /** Id of the chosen `answers` catalog entry (the partner). */
  answerId: string;
  /** Resolved display name of the partner (snapshotted from the answer). */
  partnerName: string;
  /** Optional free-text note from the admin to the beneficiary. */
  note?: string;
  /** ISO timestamp the referral was made (server-stamped). */
  referredAt?: string;
  /** Uid of the admin who made the referral. */
  referredBy?: string;
}

/**
 * Metadata for a file attached to a request, embedded on the request itself
 * (no separate `attachments` collection — Note 1). Populated by the upload
 * route; `path` is a Storage path (`requests/{id}/{file}`), never a public URL
 * — the backend mints short-lived signed URLs via
 * `GET /api/requests/:id/attachments/:name` for admin + the assigned volunteer.
 */
export interface Attachment {
  /** File name; also the lookup key for the signed-URL endpoint. */
  name: string;
  /** Firebase Storage path (not a fetchable URL). */
  path: string;
  /** MIME type. */
  type: string;
  /** Size in bytes. */
  size: number;
  /** Uid of the uploader. */
  uploadedBy?: string;
}

/** A beneficiary assistance request (UC-01). */
export interface Request {
  id: string;
  firstName?: string;
  lastName?: string;
  nameEn?: string;
  phone?: string;
  email?: string;
  city?: string;
  cityEn?: string;
  category: string;
  description?: string;
  status: RequestStatus;
  urgency?: Urgency;
  date?: string;
  handler?: string | null;
  handlerEn?: string | null;
  notes?: string;
  idUploaded?: boolean;
  /**
   * Archived flag (default false). Separate from `status` so archived requests
   * stay queryable for stats; active lists exclude `archived === true`.
   * `referred` requests are archived (count as helped).
   */
  archived?: boolean;
  /** Partner referral, set when `status === 'referred'` (Note 8). */
  referral?: Referral;
  /** Embedded file-attachment metadata (Note 1). */
  attachments?: Attachment[];
}

/** A platform user / account (admin user management). */
export interface AdminUser {
  id: number | string;
  name: string;
  nameEn?: string;
  /** Optional human-friendly name (backs the chat identity, Note 11). */
  displayName?: string;
  email?: string;
  phone?: string;
  city?: string;
  /**
   * Storage path to the user's avatar (e.g. `avatars/{uid}/avatar.jpg`), not a
   * public URL — short-lived signed URLs are minted by the backend (Note 11).
   */
  photoURL?: string;
  requests?: number;
  joined?: string;
  active?: boolean;
}

/** A success / testimonial story shown on the homepage. */
export interface Story {
  id: number | string;
  name: string;
  nameEn?: string;
  role?: string;
  roleEn?: string;
  quote?: string;
  quoteEn?: string;
  category?: string;
  rating?: number;
  avatar?: string;
  image?: string;
}

/** An FAQ entry. */
export interface FAQ {
  id: number | string;
  question: string;
  questionEn?: string;
  answer: string;
  answerEn?: string;
  category?: string;
}

/** A team / staff member. */
export interface TeamMember {
  id: number | string;
  name: string;
  nameEn?: string;
  role?: string;
  roleEn?: string;
  initials?: string;
}

/** A single aggregate metric / KPI used by stat cards. */
export interface Stat {
  label?: string;
  labelEn?: string;
  value: number | string;
  [key: string]: number | string | undefined;
}

/** A service / activity offering. */
export interface Service {
  id?: number | string;
  title?: string;
  titleEn?: string;
  desc?: string;
  descEn?: string;
  icon?: string;
  category?: string;
}

/** A single message inside an internal chat (UC-04). */
export interface Message {
  id: number | string;
  chatId?: number | string;
  senderId?: number | string;
  author?: string;
  text: string;
  createdAt?: string;
  mine?: boolean;
}

/**
 * Aggregated admin insights payload (Note 7), returned by
 * `GET /api/admin/insights` and consumed by the recharts dashboard. Computed
 * on request from `requests` + `requestEvents` (per-transition timestamps).
 */
export interface InsightsData {
  /** Requests created per day. */
  overTime: { date: string; count: number }[];
  /** Request counts grouped by category. */
  byCategory: { category: string; count: number }[];
  /** Request counts grouped by current status. */
  byStatus: { status: string; count: number }[];
  /** Mean days from creation to `closed`; `null` when nothing has closed. */
  avgResolutionDays: number | null;
  /** Per-volunteer handled-request counts. */
  perVolunteer: { uid: string; name: string; count: number }[];
}

/** A chat conversation thread (UC-04). */
export interface ChatThread {
  id: number | string;
  title?: string;
  participant?: string;
  participantEn?: string;
  lastMessage?: string;
  unread?: number;
  updatedAt?: string;
  messages?: Message[];
}
