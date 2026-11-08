import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useContent, exitPreview } from "../lib/content.jsx";
import Text from "./Text.jsx";
import Phones from "./Phones.jsx";

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/events", label: "Events" },
  { to: "/photos", label: "Photos" },
  { to: "/book", label: "Book the Space" },
  { to: "/contact", label: "Contact" },
];

export function Logo({ name, tagline }) {
  return (
    <span className="logo">
      <img src="/logo.png" className="logo-mark" alt="" width="46" height="46" />
      <span className="logo-text">
        <strong>{name}</strong>
        <small>{tagline}</small>
      </span>
    </span>
  );
}

export default function Layout() {
  const { content, preview } = useContent();
  const { settings } = content;
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="site">
      {preview && (
        <div className="preview-banner">
          Preview: you're seeing <strong>unpublished changes</strong>. Visitors can't see these yet.
          <button onClick={exitPreview}>Exit preview</button>
        </div>
      )}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo-link"><Logo name={settings.orgName} tagline={settings.tagline} /></Link>
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
            <span /><span /><span />
          </button>
          <nav className={`main-nav ${open ? "open" : ""}`}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"}>{n.label}</NavLink>
            ))}
            <NavLink to="/donate" className="btn btn-gold nav-donate">Donate</NavLink>
          </nav>
        </div>
      </header>
      <div className="prayer-flags" aria-hidden="true"><span /><span /><span /><span /><span /></div>

      <main><Outlet /></main>

      <footer className="site-footer">
        <div className="prayer-flags" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div className="container footer-grid">
          <div>
            <Logo name={settings.orgName} tagline={settings.tagline} />
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
              {NAV.slice(1).map((n) => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}
              <li><Link to="/donate">Donate</Link></li>
            </ul>
          </div>
        </div>
        <div className="container footer-bottom">© {new Date().getFullYear()} {settings.orgName}</div>
      </footer>
    </div>
  );
}
