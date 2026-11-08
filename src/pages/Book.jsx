import { useEffect, useMemo, useRef, useState } from "react";
import MonthCalendar from "../components/MonthCalendar.jsx";
import PageHeader from "./PageHeader.jsx";
import Text from "../components/Text.jsx";
import { useContent, photoSrc } from "../lib/content.jsx";
import { api } from "../lib/api.js";
import { formatDate, todayKey } from "../lib/dates.js";

const EMPTY = { kind: "booking", name: "", email: "", phone: "", date: "", startTime: "", endTime: "", guests: "", eventType: "", message: "", website: "" };

export default function Book() {
  const { content } = useContent();
  const { booking } = content;
  const pricing = booking.pricing;
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [availability, setAvailability] = useState({ booked: [], pending: [] });
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState({ state: "idle" });
  const formRef = useRef(null);
  const today = todayKey();

  useEffect(() => {
    api.get("/api/availability").then(setAvailability).catch(() => {});
  }, []);

  const dayStatus = useMemo(() => {
    const map = {};
    for (const d of availability.pending) map[d] = "pending";
    for (const e of content.events) map[e.date] = "booked";
    for (const d of booking.blockedDates || []) map[d] = "booked";
    for (const d of availability.booked) map[d] = "booked";
    return map;
  }, [availability, content.events, booking.blockedDates]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickDate = (key) => {
    setForm((f) => ({ ...f, kind: "booking", date: key }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ state: "sending" });
    try {
      await api.post("/api/requests", form);
      setStatus({ state: "sent" });
      if (form.kind === "booking") setAvailability((a) => ({ ...a, pending: [...a.pending, form.date] }));
      setForm(EMPTY);
    } catch (err) {
      setStatus({ state: "error", message: err.message });
    }
  };

  const selectedTaken = form.date && dayStatus[form.date] === "booked";

  return (
    <>
      <PageHeader title={booking.heading} image={photoSrc(content, "ph01")} />
      <section className="section">
        <div className="container split split-top">
          <Text className="prose lead">{booking.intro}</Text>
          <ul className="feature-list">
            {booking.details.filter(Boolean).map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      </section>

      {pricing && (
        <section className="section section-tint">
          <div className="container">
            {pricing.effective && <p className="eyebrow">{pricing.effective}</p>}
            <h2>{pricing.heading}</h2>
            <div className="rates">
              {pricing.rows.map((r) => (
                <div key={r.id} className="rate-row">
                  <span className="rate-icon" aria-hidden="true">{r.icon === "day" ? "\u2600\uFE0E" : "\u263E\uFE0E"}</span>
                  <div className="rate-label"><strong>{r.label}</strong><span>{r.time}</span></div>
                  <span className="rate-price">{r.price}</span>
                </div>
              ))}
            </div>
            <div className="rate-notes">
              {pricing.notes?.filter(Boolean).length > 0 && (
                <div className="rate-note">
                  <h3>Please note</h3>
                  <ul>{pricing.notes.filter(Boolean).map((n, i) => <li key={i}>{n}</li>)}</ul>
                </div>
              )}
              {pricing.hourlyText && (
                <div className="rate-note rate-hourly">
                  <h3>{pricing.hourlyTitle}</h3>
                  <p>{pricing.hourlyText}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <h2>Availability</h2>
          <p className="muted">Click an open date to start a booking request.</p>
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            dayProps={(key, outside) => {
              const s = key < today ? "past" : dayStatus[key] || "available";
              const clickable = s === "available" || s === "pending";
              return {
                className: `avail-${s} ${form.date === key ? "selected" : ""}`,
                onClick: clickable && !outside ? () => pickDate(key) : undefined,
                role: clickable && !outside ? "button" : undefined,
                tabIndex: clickable && !outside ? 0 : undefined,
                onKeyDown: clickable && !outside ? (e) => e.key === "Enter" && pickDate(key) : undefined,
                "aria-label": `${formatDate(key)}: ${s}`,
              };
            }}
            renderDay={(key) => {
              if (key < today) return null;
              const s = dayStatus[key] || "available";
              return <span className="avail-label">{s === "available" ? "Open" : s === "pending" ? "Requested" : "Booked"}</span>;
            }}
            legend={
              <>
                <span><i className="sw sw-available" /> Open</span>
                <span><i className="sw sw-pending" /> Requested (may still be available)</span>
                <span><i className="sw sw-booked" /> Booked</span>
              </>
            }
          />
        </div>
      </section>

      <section className="section section-tint" ref={formRef}>
        <div className="container narrow">
          <h2>Request the space or ask a question</h2>
          <div className="segmented">
            <button type="button" className={form.kind === "booking" ? "active" : ""} onClick={() => setForm({ ...form, kind: "booking" })}>Booking request</button>
            <button type="button" className={form.kind === "question" ? "active" : ""} onClick={() => setForm({ ...form, kind: "question" })}>General question</button>
          </div>

          {status.state === "sent" ? (
            <div className="notice notice-success">
              <strong>Thank you!</strong> Your message has been sent. We'll get back to you soon.
              <button className="btn btn-outline btn-sm" onClick={() => setStatus({ state: "idle" })}>Send another</button>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              <input type="text" name="website" value={form.website} onChange={set("website")} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="form-row">
                <label>Your name *<input required value={form.name} onChange={set("name")} /></label>
                <label>Email *<input required type="email" value={form.email} onChange={set("email")} /></label>
              </div>
              <div className="form-row">
                <label>Phone<input type="tel" value={form.phone} onChange={set("phone")} /></label>
                {form.kind === "booking" && (
                  <label>Type of event<input placeholder="e.g. Birthday, memorial, meeting" value={form.eventType} onChange={set("eventType")} /></label>
                )}
              </div>
              {form.kind === "booking" && (
                <>
                  <div className="form-row form-row-4">
                    <label>Date *<input required type="date" min={today} value={form.date} onChange={set("date")} /></label>
                    <label>Start time<input type="time" value={form.startTime} onChange={set("startTime")} /></label>
                    <label>End time<input type="time" value={form.endTime} onChange={set("endTime")} /></label>
                    <label>Guests<input type="number" min="1" value={form.guests} onChange={set("guests")} /></label>
                  </div>
                  {selectedTaken && <p className="notice notice-warn">This date is already booked. You can still send a request, but we may suggest another date.</p>}
                </>
              )}
              <label>{form.kind === "booking" ? "Tell us about your event" : "Your message *"}
                <textarea rows={5} required={form.kind === "question"} value={form.message} onChange={set("message")} />
              </label>
              {status.state === "error" && <p className="notice notice-error">{status.message}</p>}
              <button className="btn btn-maroon" disabled={status.state === "sending"}>
                {status.state === "sending" ? "Sending…" : form.kind === "booking" ? "Send booking request" : "Send message"}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
