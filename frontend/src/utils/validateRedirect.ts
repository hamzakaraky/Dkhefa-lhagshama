/**
 * validateRedirect (#88) - open-redirect protection.
 *
 * Single guard for post-auth/login redirects: any flow that reads a `next`
 * query-param and routes the user there (login, role gates, email-verify)
 * runs the raw value through this first, so an attacker can never craft a
 * link that bounces a logged-in user off-origin.
 *
 * Invariant: the return value is always a safe same-origin relative path -
 * either a `/`-prefixed path that passed every check, or `fallback`.
 * Only allows same-origin relative paths that start with `/`.
 * Rejects anything with a protocol (`http:`, `https:`, `//`, etc.),
 * which would redirect to an external host.
 *
 * @param next   - The raw `next` query-param value (may be anything).
 * @param fallback - The safe default path to use when `next` is invalid.
 * @returns      A safe, same-origin relative path.
 *
 * Examples:
 *   validateRedirect('/requests', '/')  => '/requests'  ✓
 *   validateRedirect('//evil.com', '/') => '/'           ✗ blocked
 *   validateRedirect('https://evil.com/steal', '/') => '/' ✗ blocked
 *   validateRedirect(undefined, '/')    => '/'           fallback
 */
export function validateRedirect(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string' || next.trim() === '') return fallback;

  const trimmed = next.trim();

  // Must start with exactly one `/` and must NOT start with `//`
  // (protocol-relative URL that could point off-origin).
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;

  // belt-and-suspenders: reject a colon before the first slash, covering
  // scheme-like inputs (`javascript:`, `data:`, `vbscript:`, ...). redundant
  // given the `/`-prefix guard above (firstSlash is always 0 here), kept as a
  // defensive second layer so the intent survives any future edit to the guard.
  const colonIdx = trimmed.indexOf(':');
  const firstSlash = trimmed.indexOf('/');
  if (colonIdx !== -1 && colonIdx < firstSlash) return fallback;

  return trimmed;
}
