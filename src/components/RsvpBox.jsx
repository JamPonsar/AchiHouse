import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useContent } from "../lib/content.jsx";
import { useUser } from "../lib/user.jsx";

const MAX_GUESTS = 20;
const memoryKey = (id) => `achi-rsvp:${id}`;
// A guest has no account, so their last RSVP is remembered on this device to show "You're going".
const remember = (id, value) => { try { value ? localStorage.setItem(memoryKey(id), JSON.stringify(value)) : localStorage.removeItem(memoryKey(id)); } catch { /* private mode */ } };
const recall = (id) => { try { return JSON.parse(localStorage.getItem(memoryKey(id)) || "null"); } catch { return null; } };

const people = (n) => `${n} ${n === 1 ? "person" : "people"}`;

// "Are you coming?" on an upcoming event. Members RSVP with one click; everyone else can log in or
// fill in a short guest form. Nobody has to RSVP to come, it just helps Achi House plan.
export default function RsvpBox({ event }) {
  const { user, loading } = useUser();
  const { content } = useContent();
  const [info, setInfo] = useState(null); // { going, people, mine }
  const [guestMemory, setGuestMemory] = useState(() => recall(event.id));
  const [editing, setEditing] = useState(false); // changing an existing RSVP
  const [mode, setMode] = useState(null); // "guest" = the guest form is open
  const [state, setState] = useState({ busy: false, error: null, done: false });
  const [form, setForm] = useState({ name: "", email: "", phone: "", guests: 0, guestNames: "", website: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (loading) return;
    api.get(`/api/events/${event.id}/rsvp`).then(setInfo).catch(() => setInfo({ going: 0, people: 0, mine: null }));
  }, [event.id, loading, user?.id]);

  const mine = info?.mine || (!user ? guestMemory : null);
  const contactEmail = content.settings.email;

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: null, done: false });
    try {
      const body = user ? { guests: form.guests, guestNames: form.guestNames } : form;
      const r = await api.post(`/api/events/${event.id}/rsvp`, body);
      setInfo({ going: r.going, people: r.people, mine: user ? r.mine : null });
      if (!user) {
        const saved = { name: form.name, email: form.email, phone: form.phone, guests: Number(form.guests) || 0, guestNames: form.guestNames };
        remember(event.id, saved);
        setGuestMemory(saved);
      }
      setEditing(false);
      setMode(null);
      setState({ busy: false, error: null, done: true });
    } catch (err) {
      setState({ busy: false, error: err.message, done: false });
    }
  };

  const cancel = async () => {
    setState({ busy: true, error: null, done: false });
    try {
      const r = await api.del(`/api/events/${event.id}/rsvp`);
      setInfo(r);
      setState({ busy: false, error: null, done: false });
    } catch (err) {
      setState({ busy: false, error: err.message, done: false });
    }
  };

  const startEditing = () => {
    const m = mine || {};
    setForm({ name: m.name || "", email: m.email || "", phone: m.phone || "", guests: m.guests || 0, guestNames: m.guestNames || "", website: "" });
    setState({ busy: false, error: null, done: false });
    setEditing(true);
    if (!user) setMode("guest");
  };

  const guestCount = (
    <div className="rsvp-guests">
      <label>
        Bringing anyone along? How many guests?
        <span className="rsvp-stepper">
          <button type="button" onClick={() => setForm({ ...form, guests: Math.max(0, Number(form.guests) - 1) })} aria-label="One fewer guest">−</button>
          <input
            type="number" min="0" max={MAX_GUESTS} inputMode="numeric" value={form.guests}
            onChange={(e) => setForm({ ...form, guests: Math.max(0, Math.min(MAX_GUESTS, Number(e.target.value) || 0)) })}
          />
          <button type="button" onClick={() => setForm({ ...form, guests: Math.min(MAX_GUESTS, Number(form.guests) + 1) })} aria-label="One more guest">+</button>
        </span>
      </label>
      {Number(form.guests) > 0 && (
        <label>
          Guest names <em>(optional)</em>
          <input value={form.guestNames} onChange={set("guestNames")} placeholder="You don't have to list them" maxLength={300} />
        </label>
      )}
    </div>
  );

  const showForm = editing || mode === "guest" || (user && !mine);
  const going = info?.people || 0;

  return (
    <div className="rsvp-box">
      <h3>Planning to come?</h3>
      <p className="rsvp-note">
        <strong>You don't need to RSVP to attend.</strong> Everyone is welcome at our events. Letting us know you're coming just gives
        Achi House a better idea of how many people to expect, so we can plan and adjust.
      </p>
      {going > 0 && <p className="rsvp-count"><strong>{people(going)}</strong> {going === 1 ? "is" : "are"} planning to attend</p>}

      {state.done && mine && !showForm && <p className="notice notice-ok">Thank you! We've got you down as going.</p>}

      {mine && !showForm && (
        <div className="rsvp-mine">
          <p>
            <strong>✓ You're going</strong>
            {mine.guests > 0 && <> with {mine.guests} guest{mine.guests === 1 ? "" : "s"}{mine.guestNames ? ` (${mine.guestNames})` : ""}</>}
          </p>
          <div className="rsvp-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={startEditing}>Change my RSVP</button>
            {user && <button type="button" className="btn btn-sm rsvp-cancel" onClick={cancel} disabled={state.busy}>Cancel RSVP</button>}
          </div>
          {!user && contactEmail && <p className="muted rsvp-small">Can't make it any more? Email us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>}
          {state.error && <p className="notice notice-error">{state.error}</p>}
        </div>
      )}

      {!mine && !showForm && !user && !loading && (
        <div className="rsvp-choices">
          <Link className="btn btn-maroon" to={`/login?next=${encodeURIComponent(`/events?event=${event.id}`)}`}>Log in or create an account</Link>
          <span className="rsvp-or">or</span>
          <button type="button" className="btn btn-outline" onClick={() => { setMode("guest"); setState({ busy: false, error: null, done: false }); }}>RSVP as a guest</button>
        </div>
      )}

      {showForm && !loading && (
        <form className="form rsvp-form" onSubmit={submit}>
          <input type="text" name="website" value={form.website} onChange={set("website")} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {user ? (
            <p className="muted">RSVPing as <strong>{user.firstName} {user.lastName}</strong>.</p>
          ) : (
            <>
              <label>Your name *<input required autoComplete="name" value={form.name} onChange={set("name")} maxLength={120} /></label>
              <div className="form-row">
                <label>Email *<input required type="email" autoComplete="email" value={form.email} onChange={set("email")} /></label>
                <label>Phone *<input required type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></label>
              </div>
            </>
          )}
          {guestCount}
          {state.error && <p className="notice notice-error">{state.error}</p>}
          <div className="rsvp-actions">
            <button className="btn btn-maroon" disabled={state.busy}>{state.busy ? "One moment…" : editing ? "Save my RSVP" : "I'm attending"}</button>
            {(editing || mode === "guest") && (
              <button type="button" className="btn btn-sm" onClick={() => { setEditing(false); setMode(null); }}>Cancel</button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
