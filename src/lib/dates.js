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
// ── Multi-day and all-day events ─────────────────────────────────────────
// An event has a `date` and, if it lasts several days, an `endDate`. `allDay` events have no times.
export const eventEnd = (ev) => (ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date);
export const isMultiDay = (ev) => eventEnd(ev) > ev.date;
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
export function eventDayKeys(ev) {
  const out = [];
  const end = eventEnd(ev);
  for (let k = ev.date, i = 0; k <= end && i < 62; k = addDays(k, 1), i++) out.push(k);
  return out;
}

const SHORT = { weekday: "short", month: "short", day: "numeric" };
// { date, time } as full text for the event popup
export function eventWhen(ev) {
  const end = eventEnd(ev);
  const timed = !ev.allDay && !!ev.startTime;
  if (end === ev.date) {
    return { date: formatDate(ev.date), time: ev.allDay ? "All day" : timed ? formatTimeRange(ev.startTime, ev.endTime) : "" };
  }
  return {
    date: `${formatDate(ev.date, SHORT)} – ${formatDate(end, { ...SHORT, year: "numeric" })}`,
    time: ev.allDay ? "All day" : timed ? `Starts ${formatTime(ev.startTime)}${ev.endTime ? ` · Ends ${formatTime(ev.endTime)}` : ""}` : "",
  };
}
// One short line for cards and lists
export function eventShortWhen(ev) {
  const end = eventEnd(ev);
  const timed = !ev.allDay && !!ev.startTime;
  if (end === ev.date) {
    const time = ev.allDay ? "All day" : timed ? formatTimeRange(ev.startTime, ev.endTime) : "";
    return `${formatDate(ev.date, SHORT)}${time ? ` · ${time}` : ""}`;
  }
  return `${formatDate(ev.date, SHORT)} – ${formatDate(end, SHORT)}${ev.allDay ? " · All day" : ""}`;
}

export function icsFor(ev) {
  const stamp = (date, time) => date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";
  const esc = (s = "") => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const end = eventEnd(ev);
  let when;
  if (ev.allDay || !ev.startTime) {
    // all-day events end on the day AFTER their last day in calendar files
    when = [`DTSTART;VALUE=DATE:${ev.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(end, 1).replace(/-/g, "")}`];
  } else {
    when = [`DTSTART:${stamp(ev.date, ev.startTime)}`, ev.endTime ? `DTEND:${stamp(end, ev.endTime)}` : null];
  }
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Achi House//Events//EN", "BEGIN:VEVENT",
    `UID:${ev.id}@achihouse`,
    ...when,
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

// ── Time-of-day availability (used by the Renting calendar) ──────────────
const DAY_END = 24 * 60;
export const toMinutes = (t) => {
  if (!t || !/^\d{1,2}:\d{2}/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMinutes = (n) => `${pad(Math.floor(n / 60) % 24)}:${pad(n % 60)}`;

// The hours something occupies on its day, as [start, end) in minutes.
// No start time → the whole day. No end time (or an end past midnight) → until the end of the day.
export function busyRange(startTime, endTime) {
  const s = toMinutes(startTime);
  if (s === null) return [0, DAY_END];
  const e = toMinutes(endTime);
  return [s, e === null || e <= s ? DAY_END : e];
}

export function mergeRanges(ranges) {
  const sorted = ranges.map((r) => [...r]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push(r);
  }
  return out;
}

export const isWholeDay = (merged) => merged.length === 1 && merged[0][0] <= 0 && merged[0][1] >= DAY_END;

export function formatRange([s, e]) {
  if (s <= 0 && e >= DAY_END) return "all day";
  return e >= DAY_END ? `${formatTime(fromMinutes(s))} onward` : `${formatTime(fromMinutes(s))} – ${formatTime(fromMinutes(e))}`;
}

// The hours an event occupies on one particular day (handles all-day and multi-day events)
export function eventRangeOn(ev, day) {
  const end = eventEnd(ev);
  if (ev.allDay || !ev.startTime) return [0, DAY_END];
  if (end === ev.date) return busyRange(ev.startTime, ev.endTime);
  if (day === ev.date) return [toMinutes(ev.startTime), DAY_END];
  if (day === end) return [0, toMinutes(ev.endTime) || DAY_END];
  return [0, DAY_END];
}
