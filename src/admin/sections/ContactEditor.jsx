import { useAdmin } from "../AdminApp.jsx";
import { Card, PageTitle, TextArea, TextField } from "../fields.jsx";

export default function ContactEditor() {
  const { draft, edit } = useAdmin();
  const s = draft.settings;
  const set = (k) => (v) => edit((d) => { d.settings[k] = v; });
  const setC = (k) => (v) => edit((d) => { d.contact[k] = v; });
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(s.mapQuery || s.address)}&output=embed`;

  return (
    <div className="a-page">
      <PageTitle title="Contact info" intro="Shown on the Contact page and at the bottom of every page.">
        <a className="a-btn a-btn-quiet" href="/contact" target="_blank" rel="noreferrer">View page ↗</a>
      </PageTitle>

      <Card title="Contact page text">
        <TextField label="Heading" value={draft.contact.heading} onChange={setC("heading")} />
        <TextArea label="Intro" rows={2} paragraphs={false} value={draft.contact.intro} onChange={setC("intro")} />
      </Card>

      <Card title="How to reach you">
        <div className="a-two">
          <TextField label="Email" type="email" value={s.email} onChange={set("email")} />
          <TextArea label="Phone numbers" help="One number per line." rows={3} paragraphs={false} value={s.phone} onChange={set("phone")} />
        </div>
        <TextArea label="Open hours" rows={3} paragraphs={false} value={s.hours} onChange={set("hours")} />
      </Card>

      <Card title="Address & map">
        <TextArea label="Address (as shown on the website)" rows={3} paragraphs={false} value={s.address} onChange={set("address")} />
        <TextField label="Address for the map" help="Type the address on one line, the way you'd search for it in Google Maps. Check the map below." value={s.mapQuery} onChange={set("mapQuery")} />
        <div className="a-map-preview"><iframe title="Map preview" src={mapSrc} loading="lazy" /></div>
      </Card>

      <Card title="Social media & footer">
        <div className="a-two">
          <TextField label="Facebook page link" value={s.facebook} onChange={set("facebook")} placeholder="https://facebook.com/..." />
          <TextField label="Instagram link" value={s.instagram} onChange={set("instagram")} placeholder="https://instagram.com/..." />
        </div>
        <TextField label="Footer note" value={s.footerNote} onChange={set("footerNote")} />
      </Card>
    </div>
  );
}
