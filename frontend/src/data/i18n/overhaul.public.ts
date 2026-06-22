/**
 * i18n add-on bundle for the workstream-A "public polish" surfaces (home,
 * directory, volunteer). One of several `overhaul.*` shards that translations.ts
 * deep-merges into the shared `t.*` tree, so this file stays scoped to its own
 * workstream and avoids edit collisions in the big central translations file.
 *
 * invariant: `he` and `en` are parallel key-for-key mirrors (every HE key has an
 * EN twin and vice versa) so the HE/EN language switch never yields a missing
 * string. `as const` keeps key/value literals narrow for type-safe `t.*` lookups.
 * currently an empty placeholder: no keys have been claimed by this workstream yet.
 */
export const overhaulPublic = {
  he: {},
  en: {},
} as const;
