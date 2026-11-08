import { useAdmin, newId } from "../AdminApp.jsx";
import { Card, ItemControls, PageTitle, TextArea, TextField, move } from "../fields.jsx";

export default function DonateEditor() {
  const { draft, edit } = useAdmin();
  const dn = draft.donate;
  const set = (k) => (v) => edit((d) => { d.donate[k] = v; });
  const setM = (i, k) => (v) => edit((d) => { d.donate.methods[i][k] = v; });

  return (
    <div className="a-page">
      <PageTitle title="Donate page" intro="The different ways people can give.">
        <a className="a-btn a-btn-quiet" href="/donate" target="_blank" rel="noreferrer">View page ↗</a>
      </PageTitle>

      <Card title="Page text">
        <TextField label="Heading" value={dn.heading} onChange={set("heading")} />
        <TextArea label="Intro" rows={5} value={dn.intro} onChange={set("intro")} />
      </Card>

      <Card
        title="Ways to donate"
        help="Each one appears as a box on the Donate page."
        actions={
          <button className="a-btn a-btn-sm" onClick={() => edit((d) => { d.donate.methods.push({ id: newId("dm"), name: "New method", description: "", detail: "", link: "", buttonText: "" }); })}>+ Add a way to donate</button>
        }
      >
        <div className="a-repeat a-repeat-grid">
          {dn.methods.map((m, i) => (
            <div key={m.id} className="a-repeat-item">
              <TextField label="Name" value={m.name} onChange={setM(i, "name")} placeholder="e.g. Zelle" />
              <TextArea label="Description" rows={2} paragraphs={false} value={m.description} onChange={setM(i, "description")} />
              <TextArea label="Account / details" help="e.g. an email, @handle, or mailing address. Visitors get a copy button for one-line details." rows={2} paragraphs={false} value={m.detail} onChange={setM(i, "detail")} />
              <TextField label="Button link (optional)" value={m.link} onChange={setM(i, "link")} placeholder="https://..." />
              {m.link && <TextField label="Button text" value={m.buttonText} onChange={setM(i, "buttonText")} placeholder="Donate now" />}
              <ItemControls
                index={i}
                count={dn.methods.length}
                onMove={(dir) => edit((d) => move(d.donate.methods, i, dir))}
                onDelete={() => edit((d) => { d.donate.methods.splice(i, 1); })}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Bottom of page">
        <TextArea label="Tax / non-profit note" rows={2} paragraphs={false} value={dn.taxNote} onChange={set("taxNote")} />
        <TextField label={`"Other ways to help" heading`} value={dn.otherWaysHeading} onChange={set("otherWaysHeading")} />
        <TextArea label={`"Other ways to help" text`} rows={3} value={dn.otherWays} onChange={set("otherWays")} />
      </Card>
    </div>
  );
}
