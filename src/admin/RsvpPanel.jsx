import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { Card } from "./fields.jsx";

const when = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Everyone who said they're coming to an event. Only admins see this list.
export default function RsvpPanel({ eventId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = () => api.get(`/api/admin/rsvps?event=${encodeURIComponent(eventId)}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { setData(null); load(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.name}'s RSVP${r.guests ? ` (and their ${r.guests} guest${r.guests === 1 ? "" : "s"})` : ""}?`)) return;
    try { await api.del(`/api/admin/rsvps/${r.id}`); load(); } catch (e) { setError(e.message); }
  };

  const copyEmails = () => {
    navigator.clipboard?.writeText(data.rsvps.map((r) => r.email).join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      title="RSVPs"
      help="Who said they're coming. Only you can see this list. Nobody has to RSVP to attend; it just helps you plan."
      actions={data?.rsvps.length > 0 && <button className="a-btn a-btn-sm" onClick={copyEmails}>{copied ? "Copied" : "Copy all emails"}</button>}
    >
      {error && <p className="a-error">{error}</p>}
      {!data && !error && <span className="loader" />}
      {data && (
        <>
          <p className="a-rsvp-total">
            <strong>{data.people}</strong> {data.people === 1 ? "person" : "people"} planning to attend
            <span className="a-muted"> · {data.going} RSVP{data.going === 1 ? "" : "s"}, plus their guests</span>
          </p>
          {data.rsvps.length === 0 ? (
            <p className="a-muted">No RSVPs yet.</p>
          ) : (
            <div className="a-table-wrap">
              <table className="a-table a-rsvp-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Guests</th><th>Account</th><th>RSVP'd</th><th /></tr></thead>
                <tbody>
                  {data.rsvps.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                      <td>{r.phone ? <a href={`tel:${r.phone}`}>{r.phone}</a> : <span className="a-muted">-</span>}</td>
                      <td>
                        {r.guests > 0 ? <>+{r.guests}{r.guestNames && <small className="a-muted"> {r.guestNames}</small>}</> : <span className="a-muted">-</span>}
                      </td>
                      <td><span className={`a-pill ${r.isMember ? "a-pill-ok" : ""}`}>{r.isMember ? "Member" : "Guest"}</span></td>
                      <td>{when(r.updatedAt)}</td>
                      <td><button className="a-btn a-btn-sm a-btn-quiet a-danger-text" onClick={() => remove(r)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
