// Dates are stored as "YYYY-MM-DD" and times as "HH:MM" (24h), in local time.

export const pad = (n) => String(n).padStart(2, "0");
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayKey = () => toKey(new Date());

export function formatDate(key, opts = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) {
  if (!key) return "";
  return fromKey(key).toLocaleDateString("en-US", opts);
}

export function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return m ? `${hr}:${pad(m)}${suffix}` : `${hr}${suffix}`;
}

export function formatTimeRange(start, end) {
  if (!start) return "";
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

export const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

// 6×7 grid of dates covering the month (starting Sunday)
export function monthGrid(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export const sortEvents = (events, dir = 1) =>
  [...events].sort((a, b) => dir * ((a.date + (a.startTime || "")).localeCompare(b.date + (b.startTime || ""))));

export function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Build an .ics file so visitors can add an event to their calendar
export function icsFor(ev) {
  const dt = (date, time) => date.replace(/-/g, "") + (time ? "T" + time.replace(":", "") + "00" : "");
  const esc = (s = "") => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Achi House//Events//EN", "BEGIN:VEVENT",
    `UID:${ev.id}@achihouse`,
    ev.startTime ? `DTSTART:${dt(ev.date, ev.startTime)}` : `DTSTART;VALUE=DATE:${dt(ev.date)}`,
    ev.endTime ? `DTEND:${dt(ev.date, ev.endTime)}` : null,
    `SUMMARY:${esc(ev.title)}`,
    `LOCATION:${esc(ev.location)}`,
    `DESCRIPTION:${esc(ev.summary || ev.description)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
}
