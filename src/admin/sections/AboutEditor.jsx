import { useAdmin, newId } from "../AdminApp.jsx";
import { masterFrame, MASTER_FRAME } from "../../lib/content.jsx";
import { Card, CoverField, ItemControls, LinesField, PageTitle, PhotoField, PhotoListField, TextArea, TextField, move } from "../fields.jsx";

export default function AboutEditor() {
  const { draft, edit } = useAdmin();
  const a = draft.about;
  const set = (k) => (v) => edit((d) => { d.about[k] = v; });
  const setMaster = (i, k) => (v) => edit((d) => { d.about.masters[i][k] = v; });
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

      <Card title="Why we're called Achi House" help="Shown between “Who we are” and the lineage section. Explains who the center is named after.">
        <TextField label="Heading" value={a.nameHeading} onChange={set("nameHeading")} />
        <TextArea label="Text" rows={12} value={a.nameText} onChange={set("nameText")} />
        <CoverField label="Picture" value={a.nameImage} onChange={set("nameImage")} />
        <TextField label="Picture caption" help="Small text under the picture. Optional." value={a.nameCaption} onChange={set("nameCaption")} />
      </Card>

      <Card
        title="Lineage masters"
        help="Shown between “Who we are” and “Visit us”. Each person gets a box with a picture, name and one line. “Learn more” opens their full biography."
        actions={
          <button className="a-btn a-btn-sm" onClick={() => edit((d) => { d.about.masters.push({ id: newId("ms"), name: "New person", tagline: "", image: "", bio: "" }); })}>+ Add person</button>
        }
      >
        <TextField label="Heading" value={a.mastersHeading} onChange={set("mastersHeading")} />
        <TextArea label="Intro" rows={2} paragraphs={false} value={a.mastersIntro} onChange={set("mastersIntro")} />
        <div className="a-repeat a-repeat-grid">
          {a.masters.map((m, i) => (
            <div key={m.id} className="a-repeat-item">
              <CoverField
                label="Picture"
                help="Upload a picture, or leave empty to show a simple placeholder. Then drag and zoom to choose what shows."
                value={m.image}
                onChange={(src) => edit((d) => {
                  const t = d.about.masters[i];
                  t.image = src;
                  if (src !== m.image) { t.imageX = MASTER_FRAME.x; t.imageY = MASTER_FRAME.y; t.imageZoom = MASTER_FRAME.zoom; }
                })}
                frame={masterFrame(m)}
                onFrame={(patch) => edit((d) => {
                  Object.assign(d.about.masters[i], Object.fromEntries(Object.entries(patch).map(([k, v]) => [k.replace("cover", "image"), v])));
                })}
                frameOptions={{
                  aspect: "16/9",
                  home: MASTER_FRAME,
                  previews: [
                    { label: "Popup banner", className: "a-frame-popup" },
                    { label: "Box on the page", className: "a-frame-circle" },
                  ],
                }}
              />
              <TextField label="Name" value={m.name} onChange={setMaster(i, "name")} />
              <TextField label="One-line description" help="Shown on the box, under the name." value={m.tagline} onChange={setMaster(i, "tagline")} />
              <TextArea label="Full biography" help="Shown when someone clicks Learn more. Leave an empty line between paragraphs." rows={10} value={m.bio} onChange={setMaster(i, "bio")} />
              <ItemControls
                index={i}
                count={a.masters.length}
                onMove={(dir) => edit((d) => move(d.about.masters, i, dir))}
                onDelete={() => edit((d) => { d.about.masters.splice(i, 1); })}
              />
            </div>
          ))}
        </div>
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
