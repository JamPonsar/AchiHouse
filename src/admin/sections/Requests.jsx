import { useEffect, useState } from "react";
import { useAdmin } from "../AdminApp.jsx";
import { PageTitle } from "../fields.jsx";
import { api } from "../../lib/api.js";
import { formatDate, formatTimeRange, relativeTime } from "../../lib/dates.js";

const STATUS = {
  new: { label: "New", cls: "a-pill-new" },
  read: { label: "Seen", cls: "" },
  approved: { label: "Approved", cls: "a-pill-ok" },
  declined: { label: "Declined", cls: "a-pill-no" },
  archived: { label: "Archived", cls: "" },
};

export default function Requests() {
  const { setNewRequests, showToast } = useAdmin();
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState("open");

  const load = () => api.get("/api/admin/requests").then((r) => {
    setItems(r);
    setNewRequests(r.filter((x) => x.status === "new").length);
  });
  useEffect(() => { load().catch((e) => showToast(e.message, "error")); }, []); // eslint-disable-line

  const setStatus = async (item, status, message) => {
    await api.patch(`/api/admin/requests/${item.id}`, { status });
    await load();
    if (message) showToast(message);
  };

  if (!items) return <div className="a-page"><span className="loader" /></div>;
  const shown = items.filter((x) => (tab === "open" ? !["archived", "declined"].includes(x.status) : ["archived", "declined"].includes(x.status)));

  return (
    <div className="a-page">
      <PageTitle title="Messages & requests" intro="Booking requests and questions sent from the Renting page." />
      <div className="a-note">
        ℹ️ Unlike page edits, actions here take effect right away. <b>Approving</b> a booking immediately shows that date as booked on the website.
      </div>
      <div className="a-toolbar">
        <div className="a-tabs">
          <button className={tab === "open" ? "active" : ""} onClick={() => setTab("open")}>Inbox</button>
          <button className={tab === "closed" ? "active" : ""} onClick={() => setTab("closed")}>Archived & declined</button>
        </div>
      </div>
      {shown.length === 0 && <p className="a-empty">Nothing here. 🎉</p>}
      <div className="a-requests">
        {shown.map((r) => {
          const st = STATUS[r.status] || STATUS.read;
          const reply = `mailto:${r.email}?subject=${encodeURIComponent(r.kind === "booking" ? `Your Achi House booking request for ${formatDate(r.date)}` : "Re: your message to Achi House")}`;
          return (
            <article key={r.id} className={`a-request ${r.status === "new" ? "is-new" : ""}`} onClick={() => r.status === "new" && setStatus(r, "read")}>
              <header>
                <span className={`a-pill ${st.cls}`}>{st.label}</span>
                <span className="a-pill">{r.kind === "booking" ? "📅 Booking request" : "💬 Question"}</span>
                <span className="a-muted a-request-time">{relativeTime(r.created_at)}</span>
              </header>
              <h3>{r.name}</h3>
              <p className="a-request-contact">
                <a href={`mailto:${r.email}`}>{r.email}</a>{r.phone && <> · <a href={`tel:${r.phone}`}>{r.phone}</a></>}
              </p>
              {r.kind === "booking" && (
                <dl className="a-request-details">
                  <div><dt>Date</dt><dd>{formatDate(r.date)}</dd></div>
                  {r.start_time && <div><dt>Time</dt><dd>{formatTimeRange(r.start_time, r.end_time)}</dd></div>}
                  {r.event_type && <div><dt>Event</dt><dd>{r.event_type}</dd></div>}
                  {r.guests && <div><dt>Guests</dt><dd>{r.guests}</dd></div>}
                </dl>
              )}
              {r.message && <p className="a-request-msg">{r.message}</p>}
              <div className="a-request-actions" onClick={(e) => e.stopPropagation()}>
                <a className="a-btn a-btn-sm" href={reply}>✉ Reply by email</a>
                {r.kind === "booking" && r.status !== "approved" && (
                  <button className="a-btn a-btn-sm a-btn-ok" onClick={() => setStatus(r, "approved", "Approved. That date now shows as booked.")}>✓ Approve booking</button>
                )}
                {r.kind === "booking" && r.status !== "declined" && (
                  <button className="a-btn a-btn-sm a-btn-quiet" onClick={() => setStatus(r, "declined", "Request declined.")}>Decline</button>
                )}
                {r.status !== "archived" ? (
                  <button className="a-btn a-btn-sm a-btn-quiet" onClick={() => setStatus(r, "archived", "Moved to archive.")}>Archive</button>
                ) : (
                  <button className="a-btn a-btn-sm a-btn-quiet" onClick={() => setStatus(r, "read", "Moved back to inbox.")}>Move to inbox</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
