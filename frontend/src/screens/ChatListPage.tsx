import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  MessagesSquare,
  MessageCircle,
  Lock,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Users,
  Clock,
} from "lucide-react";

import Reveal from "../components/motion/Reveal";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { firebaseDb } from "../lib/firebase";
import { apiJson } from "../lib/apiClient";
import { formatDate } from "../utils/helpers";

// A chat row as projected from the Firestore `chats` collection for this list.
interface ChatListItem {
  id: string;
  requestId: string;
  participants: string[];
  lastMessageAt: string | null;
}

// req 13b — a chat counts as "past" when its linked request is closed/rejected
// or archived; everything else (incl. unknown status) stays "active".
const PAST_STATUSES = new Set(["closed", "rejected"]);

export default function ChatListPage() {
  const { t, lang } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const c = t.chat;

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // req 13b — linked-request status per requestId, fetched lazily through
  // Express. `null` while in flight; absence ⇒ treated as active (fail-open
  // toward visibility). Drives the active/past split + tab.
  const [reqStatus, setReqStatus] = useState<Record<string, string | null>>({});
  const [tab, setTab] = useState<"active" | "past">("active");

  // req 13b / req 3 — ?requestId=<id> arrives from a my-requests card's chat
  // shortcut; we highlight (and, if it's the only match, auto-open) that chat.
  const focusRequestId =
    typeof router.query.requestId === "string" ? router.query.requestId : null;
  const autoOpenedRef = useRef(false);

  const isRtl = lang === "he";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const q = query(
      collection(firebaseDb, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            requestId: d.requestId ?? "",
            participants: d.participants ?? [],
            lastMessageAt: d.lastMessageAt?.toDate?.()?.toISOString?.() ?? null,
          };
        });
        setChats(items);
        setLoading(false);
      },
      (err) => {
        console.error("[ChatListPage] onSnapshot error:", err);
        setError(err?.code === "permission-denied" ? "permission" : "load_failed");
        setLoading(false);
      }
    );

    return unsub;
  }, [authLoading, user]);

  // req 13b — for every chat we don't yet have a status for, fetch the linked
  // request's status once. Lightweight + idempotent; failures fail-open to
  // "active" so a chat is never wrongly hidden.
  useEffect(() => {
    if (!user) return;
    const missing = chats
      .map((ch) => ch.requestId)
      .filter((rid): rid is string => !!rid && !(rid in reqStatus));
    if (missing.length === 0) return;

    let alive = true;
    // Mark as in-flight so we don't refetch on the next render.
    setReqStatus((prev) => {
      const next = { ...prev };
      for (const rid of missing) next[rid] = next[rid] ?? null;
      return next;
    });

    missing.forEach((rid) => {
      apiJson<{ status?: string }>(`/api/requests/${rid}`)
        .then((data) => {
          if (alive) setReqStatus((prev) => ({ ...prev, [rid]: data?.status ?? "" }));
        })
        .catch(() => {
          // Permission/network error — leave as null (treated as active).
        });
    });

    return () => { alive = false; };
  }, [chats, user, reqStatus]);

  // req 13b — split active vs. past from the resolved request statuses.
  const isPastChat = (chat: ChatListItem) => {
    const s = chat.requestId ? reqStatus[chat.requestId] : null;
    return typeof s === "string" && PAST_STATUSES.has(s);
  };
  const activeChats = chats.filter((ch) => !isPastChat(ch));
  const pastChats = chats.filter((ch) => isPastChat(ch));
  const visibleChats = tab === "active" ? activeChats : pastChats;

  // req 3 / req 13b — when arriving with ?requestId=, switch to the tab that
  // contains the match and (if it's the only one) open it directly.
  useEffect(() => {
    if (!focusRequestId || loading || autoOpenedRef.current) return;
    const matches = chats.filter((ch) => ch.requestId === focusRequestId);
    if (matches.length === 0) return;
    autoOpenedRef.current = true;
    if (matches.length === 1) {
      router.replace(`/chats/${matches[0].id}`);
      return;
    }
    // Multiple matches — reveal the tab holding them and let highlight guide.
    setTab(isPastChat(matches[0]) ? "past" : "active");
  }, [focusRequestId, loading, chats, reqStatus, router]);

  // Conversation count is only meaningful once the list has resolved.
  const showCount = !authLoading && !!user && !loading && !error;

  const showTabs = showCount && chats.length > 0;

  // ── Shared state shell (loading / empty / error / permission) ──────
  const renderState = (opts: {
    icon: ReactNode;
    tone?: "ember" | "danger" | "warning" | "muted" | "info";
    title?: ReactNode;
    body?: ReactNode;
    action?: ReactNode;
  }) => (
    <div
      className="chat-state chat-state--card"
      role={opts.tone === "danger" ? "alert" : undefined}
    >
      <span
        aria-hidden="true"
        className={`chat-state__icon chat-state__icon--${opts.tone ?? "ember"}`}
      >
        {opts.icon}
      </span>
      {opts.title && <h2 className="chat-state__title">{opts.title}</h2>}
      {opts.body && <p className="chat-state__body">{opts.body}</p>}
      {opts.action && <div className="chat-state__action">{opts.action}</div>}
    </div>
  );

  // Skeleton list for the loading state — mirrors the row shape.
  const skeletonList = (srLabel?: string) => (
    <div className="chat-list-card">
      {[0, 1, 2].map((i) => (
        <div key={i} className="chat-skel-row">
          <div className="chat-skel-row__lead">
            <div className="skeleton chat-skel-row__avatar" />
            <div className="chat-skel-row__lines">
              <div className="skeleton chat-skel-row__l1" />
              <div className="skeleton chat-skel-row__l2" />
            </div>
          </div>
          <div className="skeleton chat-skel-row__l3" />
        </div>
      ))}
      {srLabel && <span className="sr-only">{srLabel}</span>}
    </div>
  );

  const renderBody = () => {
    if (authLoading) return skeletonList();

    if (!user) {
      return renderState({
        tone: "ember",
        icon: <Lock size={26} strokeWidth={1.75} />,
        title: c.signInRequired,
        body: c.signInListBody,
        action: (
          <Link
            href={`/login?next=${encodeURIComponent("/chats")}`}
            className="btn btn-ember"
          >
            {c.signIn}
          </Link>
        ),
      });
    }

    if (loading) return skeletonList(c.loadingChats);

    if (error === "permission") {
      return renderState({
        tone: "warning",
        icon: <Lock size={26} strokeWidth={1.75} />,
        title: c.signInRequired,
        body: c.permissionList,
        action: (
          <Link
            href={`/login?next=${encodeURIComponent("/chats")}`}
            className="btn btn-ember"
          >
            {c.signInAgain}
          </Link>
        ),
      });
    }

    if (error) {
      return renderState({
        tone: "danger",
        icon: <AlertTriangle size={26} strokeWidth={1.75} />,
        body: c.loadError,
        action: (
          <button
            className="btn btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={16} />
            {c.refresh}
          </button>
        ),
      });
    }

    if (chats.length === 0) {
      return renderState({
        tone: "ember",
        icon: <MessagesSquare size={28} strokeWidth={1.75} />,
        title: c.emptyTitle,
        body: c.emptyBody,
        action: (
          <Link href="/requests" className="btn btn-ember">
            {c.submitRequest}
          </Link>
        ),
      });
    }

    if (visibleChats.length === 0) {
      return renderState({
        tone: "info",
        icon: <MessagesSquare size={26} strokeWidth={1.75} />,
        body: tab === "active" ? c.activeEmpty : c.pastEmpty,
      });
    }

    return (
      <div className="chat-list-card">
        <ul className="chat-list-card__ul">
          {visibleChats.map((chat) => {
            const highlighted =
              !!focusRequestId && chat.requestId === focusRequestId;
            return (
              <li key={chat.id}>
                <Link
                  href={`/chats/${chat.id}`}
                  aria-label={`${c.request} ${chat.requestId}`}
                  className={`chat-row${highlighted ? " chat-row--focus" : ""}`}
                >
                  <div className="chat-row__lead">
                    <span className="chat-row__icon" aria-hidden="true">
                      <MessageCircle size={21} strokeWidth={1.9} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="chat-row__title">
                        {c.request}{" "}
                        <span className="chat-row__id">{chat.requestId}</span>
                      </div>
                      <div className="chat-row__meta">
                        <Users size={14} strokeWidth={1.9} aria-hidden="true" />
                        {chat.participants.length} {c.participants}
                        {isPastChat(chat) && (
                          <span className="chat-past-badge">{c.pastBadge}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="chat-row__end">
                    <span className="chat-row__time">
                      <Clock size={13} strokeWidth={1.9} aria-hidden="true" />
                      {chat.lastMessageAt
                        ? formatDate(chat.lastMessageAt, lang)
                        : "-"}
                    </span>
                    <ChevronIcon
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="chat-row__chevron"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="page-container chat-list-shell">
      <div className="chat-list-layout">
        {/* ── Title + filter rail (offset inline-start) ── */}
        <aside className="chat-list-rail">
          <Reveal>
            <span className="eyebrow chat-list-rail__eyebrow">
              {c.inlineHeader.eyebrow}
            </span>
            <h1 className="chat-list-rail__title">{c.inlineHeader.title}</h1>
            {showCount && (
              <p className="chat-list-rail__count">
                {c.conversationCount(chats.length)}
              </p>
            )}

            {showTabs && (
              <div
                className="chat-filter"
                role="tablist"
                aria-label={c.inlineHeader.title}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "active"}
                  className={`chat-filter__tab${tab === "active" ? " chat-filter__tab--active" : ""}`}
                  onClick={() => setTab("active")}
                >
                  <span>{c.activeTab}</span>
                  <span className="chat-filter__count">{activeChats.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "past"}
                  className={`chat-filter__tab${tab === "past" ? " chat-filter__tab--active" : ""}`}
                  onClick={() => setTab("past")}
                >
                  <span>{c.pastTab}</span>
                  <span className="chat-filter__count">{pastChats.length}</span>
                </button>
              </div>
            )}
          </Reveal>
        </aside>

        {/* ── Conversation list (wide column) ── */}
        <div className="chat-list-main">
          <Reveal>{renderBody()}</Reveal>
        </div>
      </div>
    </div>
  );
}
