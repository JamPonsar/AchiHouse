import { useAdmin, newId } from "../AdminApp.jsx";
import { Card, ItemControls, LinesField, PageTitle, PhotoField, PhotoListField, TextArea, TextField, move } from "../fields.jsx";

export default function AboutEditor() {
  const { draft, edit } = useAdmin();
  const a = draft.about;
  const set = (k) => (v) => edit((d) => { d.about[k] = v; });
  const setLeader = (i, k) => (v) => edit((d) => { d.about.leaders[i][k] = v; });

  return (
    <div className="a-page">
      <PageTitle title="About page" intro="Your mission, the space, and your leadership team.">
        <a className="a-btn a-btn-quiet" href="/about" target="_blank" rel="noreferrer">View page ↗</a>
      </PageTitle>

      <Card title="Mission">
        <TextField label="Heading" value={a.missionHeading} onChange={set("missionHeading")} />
        <TextArea label="Text" rows={8} value={a.missionText} onChange={set("missionText")} />
        <PhotoField label="Photo" value={a.missionPhoto} onChange={set("missionPhoto")} />
      </Card>

      <Card title="The space">
        <TextField label="Heading" value={a.spaceHeading} onChange={set("spaceHeading")} />
        <TextArea label="Description" rows={5} value={a.spaceText} onChange={set("spaceText")} />
        <LinesField label="Features (bullet list)" value={a.spaceFeatures} onChange={set("spaceFeatures")} placeholder="e.g. Seats 120 guests" />
        <PhotoListField label="Photos of the space" value={a.spacePhotos} onChange={set("spacePhotos")} uploadDefaults={{ album: "Our Space" }} />
      </Card>

      <Card
        title="Leadership"
        actions={
          <button className="a-btn a-btn-sm" onClick={() => edit((d) => { d.about.leaders.push({ id: newId("ld"), name: "New person", role: "", phone: "", bio: "", photo: "" }); })}>+ Add person</button>
        }
      >
        <TextField label="Heading" value={a.leadersHeading} onChange={set("leadersHeading")} />
        <TextArea label="Intro" rows={2} paragraphs={false} value={a.leadersIntro} onChange={set("leadersIntro")} />
        <div className="a-repeat a-repeat-grid">
          {a.leaders.map((l, i) => (
            <div key={l.id} className="a-repeat-item">
              <PhotoField label="Photo" help="If empty, their initials are shown." value={l.photo} onChange={setLeader(i, "photo")} uploadDefaults={{ album: "Leadership" }} />
              <TextField label="Name" value={l.name} onChange={setLeader(i, "name")} />
              <TextField label="Role / title" value={l.role} onChange={setLeader(i, "role")} />
              <TextField label="Phone number (optional)" help="Shown publicly on the About page." value={l.phone} onChange={setLeader(i, "phone")} />
              <TextArea label="Short bio" rows={4} value={l.bio} onChange={setLeader(i, "bio")} />
              <ItemControls
                index={i}
                count={a.leaders.length}
                onMove={(dir) => edit((d) => move(d.about.leaders, i, dir))}
                onDelete={() => edit((d) => { d.about.leaders.splice(i, 1); })}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
