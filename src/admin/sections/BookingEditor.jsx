import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAdmin, newId } from "../AdminApp.jsx";
import { Card, Field, ItemControls, LinesField, PageTitle, TextArea, TextField, move } from "../fields.jsx";
import MonthCalendar from "../../components/MonthCalendar.jsx";
import DayTimeline from "../../components/DayTimeline.jsx";
import { dayItems, statusFor } from "../../lib/availability.js";
import { busyRange, formatRange, fromKey, todayKey } from "../../lib/dates.js";

export default function BookingEditor() {
  const { draft, edit } = useAdmin();
  const b = draft.booking;
  const set = (k) => (v) => edit((d) => { d.booking[k] = v; });
  // Arriving from a booking request: open that day with its times filled in
  const arrived = useLocation().state;
  const [month, setMonth] = useState(() => {
    const d = arrived?.date ? fromKey(arrived.date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const blocked = new Set(b.blockedDates || []);
  const today = todayKey();
  const [selected, setSelected] = useState(arrived?.date || null);
  const [from, setFrom] = useState(arrived?.start || "");
  const [until, setUntil] = useState(arrived?.end || "");
  const [note, setNote] = useState(arrived?.who ? `${arrived.who}\n` : "");
  const [forRental, setForRental] = useState(true);
  const src = { events: draft.events, blockedDates: b.blockedDates || [], blockedTimes: b.blockedTimes || [] };

  const toggleDay = (key) =>
    edit((d) => {
      const s = new Set(d.booking.blockedDates || []);
      s.has(key) ? s.delete(key) : s.add(key);
      d.booking.blockedDates = [...s].sort();
    });
  const addTime = () => {
    edit((d) => {
      d.booking.blockedTimes = [...(d.booking.blockedTimes || []), { id: newId("bt"), date: selected, startTime: from, endTime: until, note: note.trim(), forRental }];
    });
    setFrom(""); setUntil(""); setNote(""); setForRental(true);
  };
  const removeTime = (id) => edit((d) => { d.booking.blockedTimes = (d.booking.blockedTimes || []).filter((t) => t.id !== id); });

  return (
    <div className="a-page">
      <PageTitle title="Renting" intro="Information for people who want to rent the hall, and which days are unavailable.">
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
          help="Shown as a price list on the Renting page."
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
          <TextField label="Custom-hours note: title" value={b.pricing.customTitle ?? "Need different hours?"} onChange={(v) => edit((d) => { d.booking.pricing.customTitle = v; })} />
          <TextArea label="Custom-hours note: text" help="Shown in a highlighted box under the rates. Clear it to hide the box." rows={3} paragraphs={false} value={b.pricing.customText ?? "Our rates are for the time periods listed above. If you would like to rent for hours that fall between two rates (for example 9am – 7pm), please call or message us and we can easily work out an arrangement."} onChange={(v) => edit((d) => { d.booking.pricing.customText = v; })} />
          <LinesField label="Notes" value={b.pricing.notes} onChange={(v) => edit((d) => { d.booking.pricing.notes = v; })} />
          <div className="a-two">
            <TextField label="Hourly rental title" value={b.pricing.hourlyTitle} onChange={(v) => edit((d) => { d.booking.pricing.hourlyTitle = v; })} />
            <TextField label="Hourly rental text" value={b.pricing.hourlyText} onChange={(v) => edit((d) => { d.booking.pricing.hourlyText = v; })} />
          </div>
        </Card>
      )}

      <Card
        title="Unavailable dates & hours"
        help="Click a day to see what is booked. You can block the whole day or just certain hours (for example a private event from 2pm to 6pm). Events you add on the Events page block their own hours automatically, unless you untick “Cancel this time on the Renting calendar” on that event."
      >
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          dayProps={(key, outside) => ({
            className: `a-cal-day ${statusFor(dayItems(key, src)) === "booked" ? "a-blocked" : ""} ${selected === key ? "selected" : ""}`,
            onClick: !outside && key >= today ? () => setSelected(key) : undefined,
            style: { cursor: !outside && key >= today ? "pointer" : "default" },
          })}
          renderDay={(key) => {
            const items = dayItems(key, src);
            const st = statusFor(items);
            return st === "booked" ? <span className="a-cal-tag a-cal-blocked">Booked all day</span>
              : st === "partial" ? <span className="a-cal-tag a-cal-event">{items.length} booked time{items.length > 1 ? "s" : ""}</span>
              : null;
          }}
          legend={<><span><i className="sw sw-booked" /> Booked all day</span><span><i className="sw sw-partial" /> Some hours booked</span></>}
        />

        {selected && (
          <DayTimeline date={selected} items={dayItems(selected, src)}>
            <div className="a-block-tools">
              <button className="a-btn" onClick={() => toggleDay(selected)}>
                {blocked.has(selected) ? "✓ Whole day is blocked. Click to unblock" : "Block the whole day"}
              </button>
              <h4>Block specific hours</h4>
              <div className="a-block-form">
                <Field label="From"><input className="a-input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
                <Field label="Until"><input className="a-input" type="time" value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
                <label className="a-tick a-block-rental">
                  <input type="checkbox" checked={forRental} onChange={(e) => setForRental(e.target.checked)} />
                  <span>For a rental <em>(the notes stay private)</em></span>
                </label>
                <div className="a-block-note">
                  <Field label={forRental ? "🔒 Private notes: only you can see this" : "Reason (shown to visitors)"}>
                    <textarea
                      className={`a-input ${forRental ? "a-private" : ""}`}
                      rows={forRental ? 5 : 2}
                      placeholder={forRental ? "Who it's for, how much they paid, phone number, anything else you want to remember…" : "e.g. Private event, closed for maintenance"}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </Field>
                  <p className="a-muted a-block-hint">
                    {forRental
                      ? "Visitors only see that these hours are “Reserved”. They never see your notes."
                      : "Visitors will see this text next to the blocked hours."}
                  </p>
                </div>
                <button className="a-btn a-btn-primary" disabled={!from || !until || until <= from} onClick={addTime}>Block these hours</button>
              </div>
              {(b.blockedTimes || []).filter((t) => t.date === selected).map((t) => (
                <div key={t.id} className="a-block-item">
                  <div className="a-block-item-text">
                    <strong>{formatRange(busyRange(t.startTime, t.endTime))}{t.forRental ? " · 🔒 Rental (private)" : t.note ? ` · ${t.note}` : ""}</strong>
                    {t.forRental && t.note && <p>{t.note}</p>}
                  </div>
                  <button className="a-btn a-btn-sm a-btn-quiet" onClick={() => removeTime(t.id)}>Remove</button>
                </div>
              ))}
            </div>
          </DayTimeline>
        )}
        {!selected && <p className="a-muted" style={{ marginTop: 12 }}>Click a day above to block it or specific hours.</p>}
        <p className="a-muted" style={{ marginTop: 12 }}>Booking requests from visitors arrive in <Link to="/admin/requests">Messages & requests</Link>.</p>
      </Card>
    </div>
  );
}
