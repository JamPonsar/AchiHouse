import { useAdmin, newId } from "../AdminApp.jsx";
import { Card, ItemControls, PageTitle, PhotoField, PhotoListField, TextArea, TextField, move } from "../fields.jsx";

export default function HomeEditor() {
  const { draft, edit } = useAdmin();
  const h = draft.home;
  const set = (k) => (v) => edit((d) => { d.home[k] = v; });

  return (
    <div className="a-page">
      <PageTitle title="Home page" intro="The first page visitors see." >
        <a className="a-btn a-btn-quiet" href="/" target="_blank" rel="noreferrer">View page ↗</a>
      </PageTitle>

      <Card title="Slideshow" help="These photos fade in and out at the top of the home page, in this order.">
        <PhotoListField value={h.slides} onChange={set("slides")} />
      </Card>

      <Card title="Headline over the slideshow">
        <TextField label="Small greeting" value={h.greeting} onChange={set("greeting")} />
        <TextField label="Main headline" value={h.heroTitle} onChange={set("heroTitle")} />
        <TextArea label="Text under the headline" rows={2} paragraphs={false} value={h.heroSubtitle} onChange={set("heroSubtitle")} />
      </Card>

      <Card title="Welcome section">
        <TextField label="Heading" value={h.introHeading} onChange={set("introHeading")} />
        <TextArea label="Text" rows={8} value={h.introText} onChange={set("introText")} />
        <PhotoField label="Photo" value={h.introPhoto} onChange={set("introPhoto")} />
      </Card>

      <Card
        title="Highlight boxes"
        help="Short boxes describing what Achi House offers."
        actions={
          <button className="a-btn a-btn-sm" onClick={() => edit((d) => { d.home.highlights.push({ id: newId("hl"), title: "New highlight", text: "" }); })}>+ Add box</button>
        }
      >
        <div className="a-repeat">
          {h.highlights.map((item, i) => (
            <div key={item.id} className="a-repeat-item">
              <TextField label="Title" value={item.title} onChange={(v) => edit((d) => { d.home.highlights[i].title = v; })} />
              <TextArea label="Text" rows={2} paragraphs={false} value={item.text} onChange={(v) => edit((d) => { d.home.highlights[i].text = v; })} />
              <ItemControls
                index={i}
                count={h.highlights.length}
                onMove={(dir) => edit((d) => move(d.home.highlights, i, dir))}
                onDelete={() => edit((d) => { d.home.highlights.splice(i, 1); })}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
