import { Link } from "react-router-dom";
import { useAdmin } from "./AdminApp.jsx";

// The first screen after signing in: choose which part of the admin to open.
export default function Hub({ areas, newRequests, onSignOut }) {
  const { hasChanges, changes } = useAdmin();
  const extra = {
    website: hasChanges ? `${changes.length || 1} unpublished change${(changes.length || 1) === 1 ? "" : "s"}` : "Website is up to date",
    rentals: newRequests ? `${newRequests} new message${newRequests === 1 ? "" : "s"}` : "No new messages",
    users: "",
  };

  return (
    <div className="a-hub">
      <header className="a-hub-top">
        <div className="a-brand">
          <strong>Achi House</strong>
          <span>Admin</span>
        </div>
        <div className="a-actions">
          <a className="a-btn a-btn-quiet" href="/" target="_blank" rel="noreferrer">View live site ↗</a>
          <button className="a-btn a-btn-quiet" onClick={onSignOut}>↪ Sign out</button>
        </div>
      </header>

      <main className="a-hub-main">
        <h1>Welcome! 👋</h1>
        <p className="a-muted">What would you like to work on?</p>
        <div className="a-hub-grid">
          {areas.map((a) => (
            <Link key={a.id} to={a.home} className={`a-hub-card a-hub-${a.id}`}>
              <span className="a-hub-icon" aria-hidden="true">{a.icon}</span>
              <strong>{a.label}</strong>
              <p>{a.description}</p>
              {extra[a.id] && (
                <span className={`a-hub-extra ${(a.id === "website" && hasChanges) || (a.id === "rentals" && newRequests) ? "is-alert" : ""}`}>
                  {extra[a.id]}
                </span>
              )}
              <span className="a-hub-go">Open →</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
