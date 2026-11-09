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

// ── Repeating events ─────────────────────────────────────────────────────
export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// kind: "weekly" | "biweekly" | "monthly-date" | "monthly-weekday"
// Returns `count` dates, the first being the start date itself.
export function generateDates(startKey, kind, count) {
  const start = fromKey(startKey);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (kind === "weekly") out.push(addDays(startKey, 7 * i));
    else if (kind === "biweekly") out.push(addDays(startKey, 14 * i));
    else {
      const first = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const y = first.getFullYear(), m = first.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      if (kind === "monthly-date") {
        // same day number each month (the 31st becomes the last day of shorter months)
        out.push(toKey(new Date(y, m, Math.min(start.getDate(), daysInMonth))));
      } else {
        // same weekday each month, e.g. "2nd Saturday" (a 5th one means "last")
        const weekday = start.getDay();
        const nth = Math.ceil(start.getDate() / 7);
        if (nth >= 5) {
          const last = new Date(y, m, daysInMonth);
          last.setDate(daysInMonth - ((last.getDay() - weekday + 7) % 7));
          out.push(toKey(last));
        } else {
          const offset = (weekday - first.getDay() + 7) % 7;
          out.push(toKey(new Date(y, m, 1 + offset + 7 * (nth - 1))));
        }
      }
    }
  }
  return out;
}

export function repeatOptions(startKey) {
  const d = fromKey(startKey);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const nth = Math.ceil(d.getDate() / 7);
  return [
    { value: "weekly", label: `Every week on ${weekday}` },
    { value: "biweekly", label: `Every 2 weeks on ${weekday}` },
    { value: "monthly-weekday", label: `Every month on the ${nth >= 5 ? "last" : ordinal(nth)} ${weekday}` },
    { value: "monthly-date", label: `Every month on the ${ordinal(d.getDate())}` },
  ];
}
