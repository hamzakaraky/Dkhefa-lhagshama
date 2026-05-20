import { Globe, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

export default function Navbar() {
  const { t, toggleLang, lang } = useLanguage();
  const { user, role, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const navigate = (to) => router.push(to);
  const isActivePath = (to) =>
    to === "/" ? router.pathname === "/" : router.pathname.startsWith(to);
  // NavLink shim: forwards `className` (optionally a fn of {isActive}) to next/link.
  const NavLink = ({ to, end, className, children, ...rest }) => {
    const active = end ? router.pathname === to : isActivePath(to);
    const resolved =
      typeof className === "function"
        ? className({ isActive: active })
        : className;
    return (
      <Link href={to} className={resolved} {...rest}>
        {children}
      </Link>
    );
  };

  // Build link set conditional on auth state.
  // Only pages that actually exist — /about, /contact, /track are not built.
  const baseLinks = [
    { key: "home", to: "/" },
    { key: "requests", to: "/requests" },
    { key: "directory", to: "/directory" },
    { key: "volunteers", to: "/volunteer" },
  ];
  const links = user
    ? [
        ...baseLinks,
        ...(role === "beneficiary"
          ? [
              {
                key: "myRequests",
                to: "/my-requests",
                label: t.myRequests.navLink,
              },
            ]
          : []),
        { key: "chats", to: "/chats", label: lang === "he" ? "צ׳אט" : "Chat" },
        ...(role === "admin" ? [{ key: "admin", to: "/admin" }] : []),
      ]
    : baseLinks;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div
        className="page-container"
        style={{
          display: "flex",
          alignItems: "center",
          height: "64px",
          gap: "8px",
        }}
      >
        {/* LOGO */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <img
            src="/logo.jpg"
            alt={lang === "he" ? "דחיפה להגשמה" : "Push for Fulfillment"}
            width={40}
            height={40}
            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
          <div style={{ lineHeight: 1.2 }} className="nav-wordmark">
            <div
              style={{
                color: "var(--cream)",
                fontFamily: "Frank Ruhl Libre, serif",
                fontWeight: 700,
                fontSize: "16px",
                whiteSpace: "nowrap",
              }}
            >
              {lang === "he" ? "דחיפה להגשמה" : "Push for Fulfillment"}
            </div>
          </div>
        </Link>

        {/* DESKTOP TRAILING GROUP — links + controls in one container
            so only ONE marginInlineStart:auto fires (prevents EN overflow) */}
        <div
          className="hide-mobile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginInlineStart: "auto",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            {links.map((l) => (
              <NavLink
                key={l.key}
                to={l.to}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                end={l.to === "/"}
              >
                {l.label || t.nav[l.key]}
              </NavLink>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "6px",
                background: "transparent",
                color: "var(--cream)",
                border: "1px solid rgba(244,238,224,0.25)",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "inherit",
                transition: "all .2s",
              }}
              title={lang === "he" ? "Switch to English" : "החלף לעברית"}
            >
              <Globe size={14} />
              {lang === "he" ? "EN" : "עב"}
            </button>

            {/* Auth controls */}
            {loading ? null : user ? (
              <>
                <button className="btn btn-nav-outline btn-sm" onClick={handleLogout}>
                  {t.auth.logout}
                </button>
                <button
                  className="btn btn-nav-primary btn-sm"
                  onClick={() => navigate("/requests")}
                >
                  {t.nav.submitBtn}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-nav-outline btn-sm">
                  {t.auth.login.title}
                </Link>
                <Link href="/register" className="btn btn-nav-primary btn-sm">
                  {t.auth.register.title}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* MOBILE CONTROLS */}
        <div
          className="hide-desktop"
          style={{
            marginInlineStart: "auto",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <button
            onClick={toggleLang}
            style={{
              background: "transparent",
              border: "1px solid rgba(244,238,224,0.25)",
              color: "var(--cream)",
              padding: "6px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit",
            }}
          >
            {lang === "he" ? "EN" : "עב"}
          </button>
          <button
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              color: "var(--cream)",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
            }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div
          className="hide-desktop"
          style={{
            background: "var(--ink-2)",
            borderTop: "1px solid rgba(244,238,224,0.12)",
            padding: "12px 16px 20px",
          }}
        >
          {links.map((l) => (
            <NavLink
              key={l.key}
              to={l.to}
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
              style={{
                display: "block",
                padding: "11px 14px",
                marginBottom: "4px",
              }}
              onClick={() => setMenuOpen(false)}
              end={l.to === "/"}
            >
              {l.label || t.nav[l.key]}
            </NavLink>
          ))}
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: "12px" }}
            onClick={() => {
              navigate("/requests");
              setMenuOpen(false);
            }}
          >
            {t.nav.submitBtn}
          </button>
        </div>
      )}
    </nav>
  );
}
