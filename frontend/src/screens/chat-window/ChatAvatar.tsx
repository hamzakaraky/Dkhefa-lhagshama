/**
 * ChatAvatar — presentational avatar for the chat UI.
 *
 * shows the participant's photo when an avatarUrl is provided, otherwise falls
 * back to an initials circle derived from their name (via toInitials). used by
 * ChatRail (conversation list) and MessageFeed (message bubbles). purely
 * presentational: no data fetching or state, just size + bilingual alt text.
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { toInitials } from "./shared";

// ── Note 11 — avatar: photo when available, initials circle otherwise ──
// size maps to a fixed pixel box; classNames drive the rest of the styling.
export function ChatAvatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size: "sm" | "md" | "lg";
}) {
  const { t } = useLanguage();
  const c = t.chat;
  // sm/md/lg -> 28/40/52px; md is the default fallthrough.
  const px = size === "sm" ? 28 : size === "lg" ? 52 : 40;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={c.avatarAlt(name)}
        width={px}
        height={px}
        className={`chat-avatar chat-avatar--${size}`}
      />
    );
  }
  // no photo: render an initials circle, kept as role=img + aria-label so it
  // reads as a single labelled image rather than loose text to screen readers.
  return (
    <span
      className={`chat-avatar chat-avatar--initials chat-avatar--${size}`}
      role="img"
      aria-label={c.avatarAlt(name)}
    >
      {toInitials(name)}
    </span>
  );
}
