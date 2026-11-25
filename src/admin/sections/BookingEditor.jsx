import { Link } from "react-router-dom";
import { useAdmin, newId } from "../AdminApp.jsx";
import { Card, Field, ItemControls, LinesField, PageTitle, TextArea, TextField, move } from "../fields.jsx";

export default function BookingEditor() {
  const { draft, edit } = useAdmin();
  const b = draft.booking;
  const set = (k) => (v) => edit((d) => { d.booking[k] = v; });
  return (
    <div className="a-page">
      <PageTitle title="Renting page" intro="The text and rental rates on the Renting page. To block days or hours, use the rental calendar.">
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

      <Card title="Rental calendar" help="Blocking days and hours, and adding rentals, now has its own page.">
        <Link className="a-btn" to="/admin/rentals">🗓️ Open the rental calendar →</Link>
      </Card>
    </div>
  );
}
