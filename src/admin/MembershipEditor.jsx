import { useState } from "react";
import { addMonths, formatDate, todayKey } from "../lib/dates.js";

// How long a new membership lasts, in months (0 = the admin picks the end date)
export const LENGTHS = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
  { months: 24, label: "2 years" },
  { months: 36, label: "3 years" },
  { months: 0, label: "Pick an end date…" },
];
const short = { month: "short", day: "numeric", year: "numeric" };

// Edit one member's membership: whether they have one, when it started, and how long it lasts.
// `value` is { purchased, expires } (date keys, or "" for none). Calls onChange with the new value.
export default function MembershipEditor({ value, onChange }) {
  const has = !!value.expires;
  const [months, setMonths] = useState(12);
  const today = todayKey();

  const start = value.purchased || today;
  const setStart = (purchased) => {
    const next = { ...value, purchased };
    if (months && purchased) next.expires = addMonths(purchased, months);
    onChange(next);
  };
  const setLength = (m) => {
    setMonths(m);
    if (m) onChange({ purchased: start, expires: addMonths(start, m) });
  };
  const turnOn = () => onChange({ purchased: today, expires: addMonths(today, months || 12) });
  const invalid = has && value.expires < start;

  return (
    <div className="a-membership-edit">
      <label className="a-tick">
        <input type="checkbox" checked={has} onChange={(e) => (e.target.checked ? turnOn() : onChange({ purchased: "", expires: "" }))} />
        <span>This person has a membership</span>
      </label>

      {has && (
        <>
          <div className="a-two">
            <label className="a-field">
              <span className="a-label">Started on</span>
              <input className="a-input" type="date" value={start} max="9999-12-31" onChange={(e) => e.target.value && setStart(e.target.value)} />
            </label>
            <label className="a-field">
              <span className="a-label">Lasts for</span>
              <select className="a-input" value={months} onChange={(e) => setLength(Number(e.target.value))}>
                {LENGTHS.map((l) => <option key={l.months} value={l.months}>{l.label}</option>)}
              </select>
            </label>
          </div>
          <label className="a-field">
            <span className="a-label">Ends on</span>
            <input
              className="a-input"
              type="date"
              value={value.expires}
              min={start}
              max="9999-12-31"
              onChange={(e) => { if (e.target.value) { setMonths(0); onChange({ ...value, purchased: start, expires: e.target.value }); } }}
            />
          </label>
          {invalid ? (
            <p className="a-error">The end date has to be after the start date.</p>
          ) : (
            <p className="a-muted">Runs from {formatDate(start, short)} to {formatDate(value.expires, short)}.</p>
          )}
        </>
      )}
    </div>
  );
}

export const membershipInvalid = (v) => !!v.expires && v.expires < (v.purchased || todayKey());
