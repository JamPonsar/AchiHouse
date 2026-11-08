import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin, newId } from "../AdminApp.jsx";
import { Card, Field, ItemControls, LinesField, PageTitle, TextArea, TextField, move } from "../fields.jsx";
import MonthCalendar from "../../components/MonthCalendar.jsx";
import { todayKey } from "../../lib/dates.js";

export default function BookingEditor() {
  const { draft, edit } = useAdmin();
  const b = draft.booking;
  const set = (k) => (v) => edit((d) => { d.booking[k] = v; });
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const eventDays = new Set(draft.events.map((e) => e.date));
  const blocked = new Set(b.blockedDates || []);
  const today = todayKey();

  const toggle = (key) =>
    edit((d) => {
      const s = new Set(d.booking.blockedDates || []);
      s.has(key) ? s.delete(key) : s.add(key);
      d.booking.blockedDates = [...s].sort();
    });

  return (
    <div className="a-page">
      <PageTitle title="Book the Space" intro="Information for people who want to rent the hall, and which days are unavailable.">
        <a className="a-btn a-btn-quiet" href="/book" target="_blank" rel="noreferrer">View page ↗</a>
      </PageTitle>

      <Card title="Page text">
        <TextField label="Heading" value={b.heading} onChange={set("heading")} />
        <TextArea label="Intro" rows={5} value={b.intro} onChange={set("intro")} />
        <LinesField label="Details (bullet list)" value={b.details} onChange={set("details")} placeholder="e.g. Capacity: 120 guests" />
      </Card>

      {b.pricing && (
        <Card
          title="Rental rates"
          help="Shown as a price list on the Book the Space page."
          actions={
            <button className="a-btn a-btn-sm" onClick={() => edit((d) => { d.booking.pricing.rows.push({ id: newId("pr"), label: "New rental period", time: "", price: "$", icon: "day" }); })}>+ Add a rate</button>
          }
        >
          <div className="a-two">
            <TextField label="Heading" value={b.pricing.heading} onChange={(v) => edit((d) => { d.booking.pricing.heading = v; })} />
            <TextField label="Small text above the heading" value={b.pricing.effective} onChange={(v) => edit((d) => { d.booking.pricing.effective = v; })} placeholder="e.g. Effective as of June 2026" />
          </div>
          <div className="a-repeat">
            {b.pricing.rows.map((r, i) => (
              <div key={r.id} className="a-repeat-item">
                <div className="a-two">
                  <TextField label="Rental period" value={r.label} onChange={(v) => edit((d) => { d.booking.pricing.rows[i].label = v; })} />
                  <TextField label="Hours" value={r.time} onChange={(v) => edit((d) => { d.booking.pricing.rows[i].time = v; })} placeholder="e.g. 5:00 PM – 2:00 AM" />
                </div>
                <div className="a-two">
                  <TextField label="Price" value={r.price} onChange={(v) => edit((d) => { d.booking.pricing.rows[i].price = v; })} placeholder="$600" />
                  <Field label="Icon">
                    <select className="a-input" value={r.icon} onChange={(e) => edit((d) => { d.booking.pricing.rows[i].icon = e.target.value; })}>
                      <option value="day">☀ Daytime</option>
                      <option value="night">☾ Night</option>
                    </select>
                  </Field>
                </div>
                <ItemControls
                  index={i}
                  count={b.pricing.rows.length}
                  onMove={(dir) => edit((d) => move(d.booking.pricing.rows, i, dir))}
                  onDelete={() => edit((d) => { d.booking.pricing.rows.splice(i, 1); })}
                />
              </div>
            ))}
          </div>
          <LinesField label="Notes" value={b.pricing.notes} onChange={(v) => edit((d) => { d.booking.pricing.notes = v; })} />
          <div className="a-two">
            <TextField label="Hourly rental title" value={b.pricing.hourlyTitle} onChange={(v) => edit((d) => { d.booking.pricing.hourlyTitle = v; })} />
            <TextField label="Hourly rental text" value={b.pricing.hourlyText} onChange={(v) => edit((d) => { d.booking.pricing.hourlyText = v; })} />
          </div>
        </Card>
      )}

      <Card
        title="Unavailable dates"
        help="Click a day to mark it unavailable (for example, a holiday or private use). Days with events, and approved booking requests, are already shown as booked automatically."
      >
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          dayProps={(key, outside) => ({
            className: `a-cal-day ${blocked.has(key) ? "a-blocked" : ""} ${eventDays.has(key) ? "a-has-event" : ""}`,
            onClick: !outside && key >= today ? () => toggle(key) : undefined,
            style: { cursor: !outside && key >= today ? "pointer" : "default" },
          })}
          renderDay={(key) =>
            blocked.has(key) ? <span className="a-cal-tag a-cal-blocked">Unavailable</span>
              : eventDays.has(key) ? <span className="a-cal-tag a-cal-event">Event</span>
              : null
          }
          legend={
            <>
              <span><i className="sw" style={{ background: "#f3dede" }} /> Unavailable (you marked it)</span>
              <span><i className="sw" style={{ background: "#e8eefb" }} /> Has an event</span>
            </>
          }
        />
        <p className="a-muted" style={{ marginTop: 12 }}>Booking requests from visitors arrive in <Link to="/admin/requests">Messages & requests</Link>.</p>
      </Card>
    </div>
  );
}
