import { useMemo, useState } from "react";
import Avatar from "../../components/Avatar.jsx";
import Modal from "../../components/Modal.jsx";
import { api } from "../../lib/api.js";
import { formatDate } from "../../lib/dates.js";
import { fullName, membershipOf } from "../../lib/membership.js";
import MembershipEditor, { membershipInvalid } from "../MembershipEditor.jsx";
import { Card, PageTitle } from "../fields.jsx";
import { useMembers } from "../useMembers.js";

const SORTS = {
  az: { label: "Name A–Z", fn: (a, b) => fullName(a).localeCompare(fullName(b)) },
  za: { label: "Name Z–A", fn: (a, b) => fullName(b).localeCompare(fullName(a)) },
  newest: { label: "Newest first", fn: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  oldest: { label: "Oldest first", fn: (a, b) => a.createdAt.localeCompare(b.createdAt) },
};
const FILTERS = {
  all: "All members",
  active: "Active membership",
  expiring: "Expiring within 30 days",
  expired: "Expired membership",
  none: "No membership",
};
const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

export default function Users() {
  const { members, error, update } = useMembers();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("az");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    if (!members) return [];
    const term = q.trim().toLowerCase();
    return members
      .filter((u) => !term || [fullName(u), u.email, u.phone].some((v) => (v || "").toLowerCase().includes(term)))
      .filter((u) => {
        if (filter === "all") return true;
        const s = membershipOf(u).status;
        return filter === "active" ? s === "active" || s === "expiring" : s === filter;
      })
      .sort(SORTS[sort].fn);
  }, [members, q, sort, filter]);

  return (
    <div className="a-page a-page-wide">
      <PageTitle title="All users" intro="Everyone who has an account on the website. Click a person to see their details and change their membership.">
        <button className="a-btn a-btn-primary" onClick={() => setAdding(true)}>+ Add a user</button>
      </PageTitle>
      {error && <p className="a-error">{error}</p>}
      {!members && !error && <span className="loader" />}
      {members && (
        <Card>
          <div className="a-table-tools">
            <input className="a-input" type="search" placeholder="Search name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="a-input" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
              {Object.entries(FILTERS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select className="a-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
          <p className="a-muted a-table-count">Showing {list.length} of {members.length} users</p>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Membership</th><th>Expires</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const m = membershipOf(u);
                  return (
                    <tr key={u.id} onClick={() => setOpen(u)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(u)}>
                      <td><span className="a-user-cell"><Avatar user={u} size={34} />{fullName(u)}</span></td>
                      <td>{u.email}</td>
                      <td>{u.phone || <span className="a-muted">-</span>}</td>
                      <td><span className={`member-pill member-${m.status}`}>{m.label}</span></td>
                      <td>{u.membershipExpires ? formatDate(u.membershipExpires, { month: "short", day: "numeric", year: "numeric" }) : <span className="a-muted">-</span>}</td>
                      <td>{shortDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={6} className="a-empty">No users match.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {open && <UserDetails user={open} onClose={() => setOpen(null)} onChange={(u) => { update(u); setOpen(u); }} />}
      {adding && <AddUserDialog onClose={() => setAdding(false)} onCreated={update} />}
    </div>
  );
}

// Change a member's membership: on or off, when it started, and how long it lasts
function MembershipSection({ user: u, onChange }) {
  const saved = { purchased: u.membershipPurchased || "", expires: u.membershipExpires || "" };
  const [value, setValue] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const dirty = value.purchased !== saved.purchased || value.expires !== saved.expires;

  const save = async () => {
    setBusy(true);
    setErr(null);
    setReviewing(false);
    try {
      const r = await api.put(`/api/admin/users/${u.id}`, { membershipPurchased: value.purchased, membershipExpires: value.expires });
      onChange(r.user);
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a-membership-box">
      <h3>Membership</h3>
      <MembershipEditor value={value} onChange={(v) => { setValue(v); setDone(false); }} />
      {err && <p className="a-error">{err}</p>}
      <div className="a-membership-actions">
        {done && !dirty && <span className="a-ok">✓ Saved</span>}
        <button className="a-btn a-btn-primary" disabled={!dirty || busy || membershipInvalid(value)} onClick={() => setReviewing(true)}>
          {busy ? "Saving…" : "Save membership"}
        </button>
        {dirty && <button className="a-btn a-btn-quiet" disabled={busy} onClick={() => setValue(saved)}>Undo changes</button>}
      </div>
      {reviewing && (
        <ConfirmChanges
          title={`Save these changes for ${fullName(u)}?`}
          changes={membershipChanges(saved, value)}
          onCancel={() => setReviewing(false)}
          onConfirm={save}
        />
      )}
    </div>
  );
}

const day = (key) => formatDate(key, { month: "short", day: "numeric", year: "numeric" });

// What is different between the saved membership and the edited one, in plain words
function membershipChanges(before, after) {
  if (!before.expires && after.expires) return [{ label: "Membership", from: "None", to: `Active, ${day(after.purchased)} to ${day(after.expires)}` }];
  if (before.expires && !after.expires) return [{ label: "Membership", from: `${day(before.purchased)} to ${day(before.expires)}`, to: "Removed (no membership)" }];
  const out = [];
  if (before.purchased !== after.purchased) out.push({ label: "Started on", from: day(before.purchased), to: day(after.purchased) });
  if (before.expires !== after.expires) out.push({ label: "Ends on", from: day(before.expires), to: day(after.expires) });
  return out;
}

// A second chance to look over what's about to change
function ConfirmChanges({ title, changes, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} className="a-dialog" label={title}>
      <div className="a-dialog-body">
        <h2>{title}</h2>
        <ul className="a-confirm-changes">
          {changes.map((c) => (
            <li key={c.label}>
              <strong>{c.label}</strong>
              <span className="a-from">{c.from}</span>
              <span aria-hidden="true">→</span>
              <span className="a-to">{c.to}</span>
            </li>
          ))}
        </ul>
        <div className="a-dialog-actions">
          <button className="a-btn a-btn-quiet" onClick={onCancel}>Go back</button>
          <button className="a-btn a-btn-primary" onClick={onConfirm}>Yes, save changes</button>
        </div>
      </div>
    </Modal>
  );
}

const PROFILE_FIELDS = [
  ["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"],
  ["address", "Address"], ["bio", "Bio"], ["facebook", "Facebook link"], ["instagram", "Instagram link"],
];

// Edit someone's details (for example to fill them in for a member who gave them on paper)
function ProfileForm({ user: u, onSaved, onCancel }) {
  const start = Object.fromEntries(PROFILE_FIELDS.map(([k]) => [k, u[k] || ""]));
  const [form, setForm] = useState(start);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const changes = PROFILE_FIELDS
    .filter(([k]) => form[k].trim() !== start[k].trim())
    .map(([k, label]) => ({ label, from: start[k] || "Not added", to: form[k].trim() || "Not added" }));

  const save = async () => {
    setReviewing(false);
    setBusy(true);
    setErr(null);
    try {
      const r = await api.put(`/api/admin/users/${u.id}`, form);
      onSaved(r.user);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  const text = (k, label, props = {}) => (
    <label className="a-field">
      <span className="a-label">{label}</span>
      <input className="a-input" value={form[k]} onChange={set(k)} {...props} />
    </label>
  );
  return (
    <form className="a-profile-form" onSubmit={(e) => { e.preventDefault(); if (changes.length) setReviewing(true); }}>
      <div className="a-two">{text("firstName", "First name", { required: true })}{text("lastName", "Last name", { required: true })}</div>
      <div className="a-two">{text("email", "Email", { type: "email", required: true })}{text("phone", "Phone")}</div>
      <label className="a-field">
        <span className="a-label">Address</span>
        <textarea className="a-input" rows={2} value={form.address} onChange={set("address")} />
      </label>
      <label className="a-field">
        <span className="a-label">Bio</span>
        <textarea className="a-input" rows={3} value={form.bio} onChange={set("bio")} />
      </label>
      <div className="a-two">{text("facebook", "Facebook link", { placeholder: "https://facebook.com/…" })}{text("instagram", "Instagram link", { placeholder: "https://instagram.com/…" })}</div>
      {err && <p className="a-error">{err}</p>}
      <div className="a-membership-actions">
        <button className="a-btn a-btn-primary" disabled={!changes.length || busy}>{busy ? "Saving…" : "Save details"}</button>
        <button type="button" className="a-btn a-btn-quiet" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
      {reviewing && (
        <ConfirmChanges title={`Save these changes for ${fullName(u)}?`} changes={changes} onCancel={() => setReviewing(false)} onConfirm={save} />
      )}
    </form>
  );
}

export function UserDetails({ user: u, onClose, onChange }) {
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const m = membershipOf(u);
  const row = (label, value) => (
    <div><dt>{label}</dt><dd>{value || <span className="a-muted">Not added</span>}</dd></div>
  );
  return (
    <Modal onClose={onClose} className="a-dialog a-user-dialog" label={fullName(u)}>
      <div className="a-dialog-body">
        <div className="a-user-dialog-head">
          <Avatar user={u} size={72} />
          <div>
            <h2>{fullName(u)}</h2>
            <span className={`member-pill member-${m.status}`}>{m.status === "none" ? "No membership" : `Membership: ${m.label}`}</span>
          </div>
        </div>
        {onChange && <MembershipSection key={`${u.membershipPurchased}|${u.membershipExpires}`} user={u} onChange={onChange} />}
        {onChange && (
          <div className="a-details-head">
            <h3>Details</h3>
            {!editing && <button type="button" className="a-btn a-btn-sm" onClick={() => setEditing(true)}>✎ Edit details</button>}
          </div>
        )}
        {editing ? (
          <ProfileForm user={u} onCancel={() => setEditing(false)} onSaved={(user) => { onChange(user); setEditing(false); }} />
        ) : (
        <dl className="a-user-details">
          {row("First name", u.firstName)}
          {row("Last name", u.lastName)}
          {row("Email", u.email && <a href={`mailto:${u.email}`}>{u.email}</a>)}
          {row("Phone", u.phone && <a href={`tel:${u.phone}`}>{u.phone}</a>)}
          {row("Address", u.address)}
          {row("Bio", u.bio)}
          {row("Facebook", u.facebook && <a href={u.facebook} target="_blank" rel="noreferrer">{u.facebook}</a>)}
          {row("Instagram", u.instagram && <a href={u.instagram} target="_blank" rel="noreferrer">{u.instagram}</a>)}
          {!onChange && row("Membership bought", u.membershipPurchased && formatDate(u.membershipPurchased))}
          {!onChange && row("Membership expires", u.membershipExpires && formatDate(u.membershipExpires))}
          {row("Account created", shortDate(u.createdAt))}
          <div>
            <dt>Password</dt>
            <dd className="a-password-row">
              <span>{showPassword ? "🔒 Stored encrypted. It can't be shown, even to admins." : "••••••••••"}</span>
              <button type="button" className="a-btn a-btn-sm a-btn-quiet" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
            </dd>
          </div>
        </dl>
        )}
        <div className="a-dialog-actions"><button className="a-btn" onClick={onClose}>Close</button></div>
      </div>
    </Modal>
  );
}

// Create an account for someone (for example a member who signed up on paper)
function AddUserDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", address: "", password: "" });
  const [membership, setMembership] = useState({ purchased: "", expires: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [created, setCreated] = useState(null); // { user, temporaryPassword }
  const [copied, setCopied] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post("/api/admin/users", { ...form, membershipPurchased: membership.purchased, membershipExpires: membership.expires });
      onCreated(r.user);
      setCreated(r);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const u = created.user;
    return (
      <Modal onClose={onClose} className="a-dialog" label="User created">
        <div className="a-dialog-body">
          <h2>✓ {fullName(u)} was added</h2>
          <p className="a-muted">They can log in with <strong>{u.email}</strong>.</p>
          {created.temporaryPassword ? (
            <div className="a-temp-password">
              <p><strong>Their temporary password:</strong></p>
              <code>{created.temporaryPassword}</code>
              <button
                type="button"
                className="a-btn a-btn-sm"
                onClick={() => { navigator.clipboard?.writeText(created.temporaryPassword); setCopied(true); }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <p className="a-muted">Write it down or send it to them now. For security it can't be shown again.</p>
            </div>
          ) : (
            <p className="a-muted">They'll log in with the password you chose.</p>
          )}
          <div className="a-dialog-actions"><button className="a-btn a-btn-primary" onClick={onClose}>Done</button></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} className="a-dialog a-user-dialog" label="Add a user">
      <form className="a-dialog-body" onSubmit={submit}>
        <h2>Add a user</h2>
        <div className="a-two">
          <label className="a-field"><span className="a-label">First name</span><input className="a-input" value={form.firstName} onChange={set("firstName")} required autoFocus /></label>
          <label className="a-field"><span className="a-label">Last name</span><input className="a-input" value={form.lastName} onChange={set("lastName")} required /></label>
        </div>
        <label className="a-field"><span className="a-label">Email</span><input className="a-input" type="email" value={form.email} onChange={set("email")} required /></label>
        <div className="a-two">
          <label className="a-field"><span className="a-label">Phone <em>(optional)</em></span><input className="a-input" value={form.phone} onChange={set("phone")} /></label>
          <label className="a-field">
            <span className="a-label">Password <em>(optional)</em></span>
            <input className="a-input" type="text" autoComplete="off" value={form.password} onChange={set("password")} placeholder="Leave empty to make one" />
          </label>
        </div>
        <label className="a-field"><span className="a-label">Address <em>(optional)</em></span><input className="a-input" value={form.address} onChange={set("address")} /></label>
        <div className="a-membership-box">
          <h3>Membership</h3>
          <MembershipEditor value={membership} onChange={setMembership} />
        </div>
        {err && <p className="a-error">{err}</p>}
        <div className="a-dialog-actions">
          <button type="button" className="a-btn a-btn-quiet" onClick={onClose}>Cancel</button>
          <button className="a-btn a-btn-primary" disabled={busy || membershipInvalid(membership)}>{busy ? "Adding…" : "Add user"}</button>
        </div>
      </form>
    </Modal>
  );
}
