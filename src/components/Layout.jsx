import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useContent, exitPreview } from "../lib/content.jsx";
import Text from "./Text.jsx";
import Phones from "./Phones.jsx";
import LogoMark from "./LogoMark.jsx";
import ChangeHighlighter, { countChanges } from "./ChangeHighlighter.jsx";

// `key` is the setting that can rename the link (see "Header & logo" in the editor)
export const NAV = [
  { to: "/", label: "Home", key: "navHome" },
  { to: "/about", label: "About", key: "navAbout" },
  { to: "/events", label: "Events", key: "navEvents" },
  { to: "/photos", label: "Photos", key: "navPhotos" },
  { to: "/book", label: "Renting", key: "navBook" },
  { to: "/contact", label: "Contact", key: "navContact" },
];
const nameOf = (settings, n) => (settings[n.key] || "").trim() || n.label;

export function Logo({ settings }) {
  const { orgName: name, tagline } = settings;
  return (
    <span className="logo">
      <LogoMark settings={settings} />
      <span className="logo-text">
        <strong>{name}</strong>
        <small>{tagline}</small>
      </span>
    </span>
  );
}

export default function Layout() {
  const { content, preview, published, compare, showChanges, toggleChanges } = useContent();
  const { settings } = content;
  const [open, setOpen] = useState(false);
  const changeCount = useMemo(
    () => (preview
      ? countChanges(published, content) + (published?.events || []).filter((e) => !content.events.some((x) => x.id === e.id)).length
      : 0),
    [preview, published, content]
  );
  const location = useLocation();

  // Browser tab: title and icon follow the name and logo
  useEffect(() => {
    if (preview) return;
    document.title = [settings.orgName, settings.tagline].filter(Boolean).join(" · ");
    if (settings.logoSrc) document.querySelector('link[rel="icon"]')?.setAttribute("href", settings.logoSrc);
  }, [preview, settings.orgName, settings.tagline, settings.logoSrc]);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="site">
      {preview && (
        <div className="preview-banner">
          {compare ? (
            <>
              Comparing: you're seeing the <strong>older version{compare.at ? ` from ${new Date(compare.at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</strong>. Highlights show where it differs from your current version.
            </>
          ) : (
            <>Preview: you're seeing <strong>unpublished changes</strong>. Visitors can't see these yet.</>
          )}
          {changeCount > 0 && (
            <button className={`preview-toggle ${showChanges ? "on" : ""}`} onClick={toggleChanges} aria-pressed={showChanges}>
              {showChanges ? "✓ Showing changes" : "Show changes"}
            </button>
          )}
          <button onClick={exitPreview}>Exit preview</button>
        </div>
      )}
      {preview && <ChangeHighlighter published={published} draft={content} enabled={showChanges} />}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo-link"><Logo settings={settings} /></Link>
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
            <span /><span /><span />
          </button>
          <nav className={`main-nav ${open ? "open" : ""}`}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"}>{nameOf(settings, n)}</NavLink>
            ))}
            <NavLink to="/donate" className="btn btn-gold nav-donate">{(settings.navDonate || "").trim() || "Donate"}</NavLink>
          </nav>
        </div>
      </header>
      <div className="prayer-flags" aria-hidden="true"><span /><span /><span /><span /><span /></div>

      <main><Outlet /></main>

      <footer className="site-footer">
        <div className="prayer-flags" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div className="container footer-grid">
          <div>
            <Logo settings={settings} />
            <p className="footer-note">{settings.footerNote}</p>
          </div>
          <div>
            <h4>Visit</h4>
            <Text>{settings.address}</Text>
            <Text className="muted">{settings.hours}</Text>
          </div>
          <div>
            <h4>Contact</h4>
            <p><a href={`mailto:${settings.email}`}>{settings.email}</a><br /><Phones value={settings.phone} /></p>
            <p className="social">
              {settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer">Facebook</a>}
              {settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul className="footer-links">
              {NAV.slice(1).map((n) => <li key={n.to}><Link to={n.to}>{nameOf(settings, n)}</Link></li>)}
              <li><Link to="/donate">{(settings.navDonate || "").trim() || "Donate"}</Link></li>
            </ul>
          </div>
        </div>
        <div className="container footer-bottom">© {new Date().getFullYear()} {settings.orgName}</div>
      </footer>
    </div>
  );
}
