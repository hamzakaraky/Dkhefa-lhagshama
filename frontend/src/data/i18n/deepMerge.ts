/**
 * Deep-merge helper for the split translation modules.
 *
 * The base translation table (`translations.ts`) plus per-workstream add-on
 * modules under `src/data/i18n/` are merged into one object per locale. This
 * lets each feature own its own strings file (no edit conflicts) while the app
 * still sees a single `t.*` tree.
 *
 * Plain objects merge recursively; everything else (strings, arrays, functions)
 * from a later source overrides earlier values.
 */

type Plain = Record<string, unknown>;

// true only for mergeable nested namespaces; arrays/functions/null are treated
// as leaf values so they get replaced wholesale rather than recursed into.
function isPlainObject(v: unknown): v is Plain {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof v !== 'function'
  );
}

// recursively merge add-on sources over base, left-to-right (later sources win).
// shallow-clones at each level so inputs are never mutated; only matching
// plain-object branches recurse, all other keys overwrite.
export function deepMerge<T extends Plain>(base: T, ...sources: Plain[]): T {
  const out: Plain = { ...base };
  for (const src of sources) {
    if (!src) continue; // tolerate undefined/null add-on modules
    for (const key of Object.keys(src)) {
      const a = out[key];
      const b = src[key];
      // recurse only when both sides are nested namespaces; otherwise b replaces a
      out[key] = isPlainObject(a) && isPlainObject(b) ? deepMerge(a, b) : b;
    }
  }
  return out as T;
}
