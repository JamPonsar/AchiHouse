import { useMemo, useState } from "react";
import Avatar from "../../components/Avatar.jsx";
import Modal from "../../components/Modal.jsx";
import { formatDate } from "../../lib/dates.js";
import { fullName, membershipOf } from "../../lib/membership.js";
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
  const { members, error } = useMembers();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("az");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);

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
      <PageTitle title="All users" intro="Everyone who has created an account on the website. Click a person to see all of their details." />
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
      {open && <UserDetails user={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function UserDetails({ user: u, onClose }) {
  const [showPassword, setShowPassword] = useState(false);
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
        <dl className="a-user-details">
          {row("First name", u.firstName)}
          {row("Last name", u.lastName)}
          {row("Email", u.email && <a href={`mailto:${u.email}`}>{u.email}</a>)}
          {row("Phone", u.phone && <a href={`tel:${u.phone}`}>{u.phone}</a>)}
          {row("Address", u.address)}
          {row("Bio", u.bio)}
          {row("Facebook", u.facebook && <a href={u.facebook} target="_blank" rel="noreferrer">{u.facebook}</a>)}
          {row("Instagram", u.instagram && <a href={u.instagram} target="_blank" rel="noreferrer">{u.instagram}</a>)}
          {row("Membership bought", u.membershipPurchased && formatDate(u.membershipPurchased))}
          {row("Membership expires", u.membershipExpires && formatDate(u.membershipExpires))}
          {row("Account created", shortDate(u.createdAt))}
          <div>
            <dt>Password</dt>
            <dd className="a-password-row">
              <span>{showPassword ? "🔒 Stored encrypted. It can't be shown, even to admins." : "••••••••••"}</span>
              <button type="button" className="a-btn a-btn-sm a-btn-quiet" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
            </dd>
          </div>
        </dl>
        <div className="a-dialog-actions"><button className="a-btn" onClick={onClose}>Close</button></div>
      </div>
    </Modal>
  );
}
