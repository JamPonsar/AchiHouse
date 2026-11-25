import { useMemo, useState } from "react";
import Avatar from "../../components/Avatar.jsx";
import { addDays, formatDate, todayKey } from "../../lib/dates.js";
import { fullName, membershipOf } from "../../lib/membership.js";
import { PageTitle } from "../fields.jsx";
import { useMembers } from "../useMembers.js";
import { UserDetails } from "./Users.jsx";

const monthKey = (dateKey) => dateKey.slice(0, 7);
const monthName = (mk) => new Date(`${mk}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const nextMonths = (n) => {
  const d = new Date();
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(d.getFullYear(), d.getMonth() + i, 1);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
  });
};

// Memberships grouped by the month they expire, so renewals can be planned ahead
export default function Memberships() {
  const { members, error } = useMembers();
  const [open, setOpen] = useState(null);
  const [showEmpty, setShowEmpty] = useState(false);
  const today = todayKey();

  const data = useMemo(() => {
    if (!members) return null;
    const withMembership = members.filter((u) => u.membershipExpires).sort((a, b) => a.membershipExpires.localeCompare(b.membershipExpires));
    const expired = withMembership.filter((u) => u.membershipExpires < today).reverse();
    const current = withMembership.filter((u) => u.membershipExpires >= today);
    const byMonth = {};
    for (const u of current) (byMonth[monthKey(u.membershipExpires)] ||= []).push(u);
    const months = [...new Set([...nextMonths(12), ...Object.keys(byMonth)])].sort();
    return {
      months, byMonth, expired,
      active: current.length,
      soon: current.filter((u) => u.membershipExpires <= addDays(today, 30)).length,
      none: members.length - withMembership.length,
    };
  }, [members, today]);

  return (
    <div className="a-page a-page-wide">
      <PageTitle title="Memberships" intro="Memberships last one year. See whose membership ends each month, so you can remind them to renew." />
      {error && <p className="a-error">{error}</p>}
      {!data && !error && <span className="loader" />}
      {data && (
        <>
          <div className="a-stats">
            <div className="a-stat"><strong>{data.active}</strong><span>Active</span></div>
            <div className="a-stat a-stat-warn"><strong>{data.soon}</strong><span>Ending in the next 30 days</span></div>
            <div className="a-stat a-stat-bad"><strong>{data.expired.length}</strong><span>Expired</span></div>
            <div className="a-stat"><strong>{data.none}</strong><span>No membership</span></div>
          </div>

          <div className="a-months-tools">
            <label className="a-tick"><input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} /><span>Show months with no renewals</span></label>
          </div>

          <div className="a-months">
            {data.months.map((mk) => {
              const people = data.byMonth[mk] || [];
              if (!people.length && !showEmpty) return null;
              return (
                <section key={mk} className={`a-month ${mk === monthKey(today) ? "is-now" : ""}`}>
                  <header>
                    <h3>{monthName(mk)}</h3>
                    <span className="a-pill">{people.length} ending</span>
                  </header>
                  {people.length === 0 ? <p className="a-muted">No memberships end this month.</p> : (
                    <div className="a-member-cards">
                      {people.map((u) => <MemberCard key={u.id} user={u} onOpen={() => setOpen(u)} />)}
                    </div>
                  )}
                </section>
              );
            })}

            {data.expired.length > 0 && (
              <section className="a-month a-month-expired">
                <header>
                  <h3>Already expired</h3>
                  <span className="a-pill">{data.expired.length}</span>
                </header>
                <div className="a-member-cards">
                  {data.expired.map((u) => <MemberCard key={u.id} user={u} onOpen={() => setOpen(u)} />)}
                </div>
              </section>
            )}
          </div>
        </>
      )}
      {open && <UserDetails user={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function MemberCard({ user: u, onOpen }) {
  const m = membershipOf(u);
  return (
    <button className="a-member-card" onClick={onOpen}>
      <Avatar user={u} size={42} />
      <span className="a-member-card-body">
        <strong>{fullName(u)}</strong>
        <small>{u.email}{u.phone ? ` · ${u.phone}` : ""}</small>
        <small>Bought {u.membershipPurchased ? formatDate(u.membershipPurchased, { month: "short", day: "numeric", year: "numeric" }) : "-"} · Ends {formatDate(u.membershipExpires, { month: "short", day: "numeric", year: "numeric" })}</small>
      </span>
      <span className={`member-pill member-${m.status}`}>{m.status === "expired" ? `${-m.days} days ago` : m.days === 0 ? "Today" : `${m.days} days left`}</span>
    </button>
  );
}
