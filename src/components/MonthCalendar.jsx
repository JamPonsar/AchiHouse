import { monthGrid, monthLabel, toKey, todayKey } from "../lib/dates.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Generic month calendar. `renderDay(dateKey)` returns the cell contents and
// `dayProps(dateKey)` can add a className / onClick to a cell.
export default function MonthCalendar({ month, onMonthChange, renderDay, dayProps = () => ({}), legend }) {
  const today = todayKey();
  const shift = (n) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const days = monthGrid(month);

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button className="cal-nav" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h3>{monthLabel(month)}</h3>
        <button className="cal-nav" onClick={() => shift(1)} aria-label="Next month">›</button>
        <button
          className="btn btn-ghost btn-sm cal-today"
          onClick={() => onMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
        >
          Today
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
        {days.map((d) => {
          const key = toKey(d);
          const outside = d.getMonth() !== month.getMonth();
          const { className = "", ...rest } = dayProps(key, outside) || {};
          return (
            <div
              key={key}
              className={`cal-day ${outside ? "outside" : ""} ${key === today ? "today" : ""} ${key < today ? "past" : ""} ${className}`}
              {...rest}
            >
              <span className="cal-num">{d.getDate()}</span>
              {renderDay?.(key, outside)}
            </div>
          );
        })}
      </div>
      {legend && <div className="calendar-legend">{legend}</div>}
    </div>
  );
}
