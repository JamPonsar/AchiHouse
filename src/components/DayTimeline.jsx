import { formatDate, formatRange, fromMinutes, formatTime } from "../lib/dates.js";
import { freeRanges } from "../lib/availability.js";

const DAY = 24 * 60;
const TICKS = [0, 6, 12, 18, 24];
const tickLabel = (h) => (h === 0 || h === 24 ? "12am" : formatTime(fromMinutes(h * 60)));

// A 24-hour bar for one day, plus a plain list of what is booked and what is open.
export default function DayTimeline({ date, items, children }) {
  const free = freeRanges(items);
  return (
    <div className="timeline">
      <h3>{formatDate(date)}</h3>
      <div className="tl-bar" role="img" aria-label={`Booked: ${items.map((i) => formatRange(i.range)).join(", ") || "nothing"}`}>
        {free.map(([s, e], i) => <span key={`f${i}`} className="tl-seg tl-free" style={{ left: `${(s / DAY) * 100}%`, width: `${((e - s) / DAY) * 100}%` }} />)}
        {items.map((it, i) => <span key={`b${i}`} className="tl-seg tl-busy" style={{ left: `${(it.range[0] / DAY) * 100}%`, width: `${((it.range[1] - it.range[0]) / DAY) * 100}%` }} />)}
      </div>
      <div className="tl-ticks">
        {TICKS.map((h) => <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{tickLabel(h)}</span>)}
      </div>
      <ul className="tl-list">
        {items.map((it, i) => (
          <li key={i} className="tl-row tl-row-busy"><i />{<b>{formatRange(it.range)}</b>}<span>{it.label}</span></li>
        ))}
        {free.map((r, i) => (
          <li key={`o${i}`} className="tl-row tl-row-free"><i /><b>{formatRange(r)}</b><span>Open</span></li>
        ))}
      </ul>
      {children}
    </div>
  );
}
