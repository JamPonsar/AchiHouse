// Works out what is taken on a given day, from every source of bookings.
import { busyRange, eventDayKeys, eventRangeOn, isWholeDay, mergeRanges } from "./dates.js";

const DAY = 24 * 60;

// sources: { events, blockedDates, blockedTimes, booked }
export function dayItems(date, { events = [], blockedDates = [], blockedTimes = [], booked = [] }) {
  const items = [];
  for (const e of events) if (e.blocksRental !== false && eventDayKeys(e).includes(date)) items.push({ range: eventRangeOn(e, date), label: e.title || "Event", kind: "event", id: e.id });
  if (blockedDates.includes(date)) items.push({ range: [0, DAY], label: "Unavailable", kind: "blocked" });
  for (const t of blockedTimes) if (t.date === date) items.push({ range: busyRange(t.startTime || "00:00", t.endTime), label: t.forRental ? "Reserved" : t.note || "Unavailable", kind: t.forRental ? "reserved" : "blocked", id: t.id });
  for (const b of booked) {
    const d = typeof b === "string" ? b : b.date;
    if (d === date) items.push({ range: busyRange(b.start, b.end), label: "Reserved", kind: "reserved" });
  }
  return items.sort((a, b) => a.range[0] - b.range[0]);
}

export function allDates({ events = [], blockedDates = [], blockedTimes = [], booked = [] }) {
  return new Set([
    ...events.filter((e) => e.blocksRental !== false).flatMap(eventDayKeys),
    ...blockedDates,
    ...blockedTimes.map((t) => t.date),
    ...booked.map((b) => (typeof b === "string" ? b : b.date)),
  ].filter(Boolean));
}

export const freeRanges = (items) => {
  const out = [];
  let at = 0;
  for (const [s, e] of mergeRanges(items.map((i) => i.range))) {
    if (s > at) out.push([at, s]);
    at = Math.max(at, e);
  }
  if (at < DAY) out.push([at, DAY]);
  return out;
};

export const statusFor = (items) => (!items.length ? "available" : isWholeDay(mergeRanges(items.map((i) => i.range))) ? "booked" : "partial");
