import { useState } from "react";
import { useAdmin, ConfirmDialog } from "../AdminApp.jsx";
import { Card, DropZone, PageTitle, useUploader } from "../fields.jsx";
import { sortEvents } from "../../lib/dates.js";

// Where a photo is used, so we can warn before deleting it
function usagesOf(d, id) {
  const out = [];
  if (d.home.slides.includes(id)) out.push("Home page slideshow");
  if (d.home.introPhoto === id) out.push("Home page welcome photo");
  if (d.about.missionPhoto === id) out.push("About page mission photo");
  if (d.about.spacePhotos.includes(id)) out.push("About page space photos");
  d.about.leaders.forEach((l) => l.photo === id && out.push(`Leader photo (${l.name})`));
  d.events.forEach((e) => e.coverPhoto === id && out.push(`Cover photo of "${e.title}"`));
  return out;
}

export default function PhotosEditor() {
  const { draft, edit, showToast } = useAdmin();
  const [filter, setFilter] = useState("all");
  const [uploadTo, setUploadTo] = useState("");
  const [upload, busy] = useUploader();
  const [deleting, setDeleting] = useState(null);
  const events = sortEvents(draft.events, -1);
  const albums = [...new Set(draft.photos.map((p) => p.album).filter(Boolean))];

  const shown = draft.photos.filter((p) =>
    filter === "all" ? true : filter === "none" ? !p.eventId : p.eventId === filter
  );
  const setPhoto = (id, k, v) => edit((d) => { d.photos.find((p) => p.id === id)[k] = v; });

  return (
    <div className="a-page">
      <PageTitle title="Photos" intro="Your photo library. Photos linked to an event show up under that event on the Photos page.">
        <a className="a-btn a-btn-quiet" href="/photos" target="_blank" rel="noreferrer">View page ↗</a>
      </PageTitle>

      <Card title="Upload new photos">
        <label className="a-field a-inline-field">
          <span className="a-label">Which event are these photos from?</span>
          <select className="a-input" value={uploadTo} onChange={(e) => setUploadTo(e.target.value)}>
            <option value="">Not from a specific event</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>)}
          </select>
        </label>
        <DropZone busy={busy} onFiles={(files) => upload(files, { eventId: uploadTo })} />
      </Card>

      <div className="a-toolbar">
        <label className="a-inline-field">
          <span>Show:</span>
          <select className="a-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All photos ({draft.photos.length})</option>
            <option value="none">Not linked to an event ({draft.photos.filter((p) => !p.eventId).length})</option>
            {events.map((ev) => {
              const n = draft.photos.filter((p) => p.eventId === ev.id).length;
              return <option key={ev.id} value={ev.id}>{ev.title} ({n})</option>;
            })}
          </select>
        </label>
      </div>

      <datalist id="albums">{albums.map((a) => <option key={a} value={a} />)}</datalist>
      <div className="a-photo-grid a-photo-grid-lg">
        {shown.map((p) => (
          <div key={p.id} className="a-photo-card">
            <a href={p.src} target="_blank" rel="noreferrer"><img src={p.src} alt="" loading="lazy" /></a>
            <input className="a-input" placeholder="Add a caption…" value={p.caption} onChange={(e) => setPhoto(p.id, "caption", e.target.value)} />
            <select className="a-input" value={p.eventId} onChange={(e) => setPhoto(p.id, "eventId", e.target.value)} title="Which event is this photo from?">
              <option value="">No event</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.date.slice(0, 4)})</option>)}
            </select>
            {!p.eventId && (
              <input className="a-input" list="albums" placeholder="Album, e.g. Our Space" value={p.album || ""} onChange={(e) => setPhoto(p.id, "album", e.target.value)} title="Group photos that aren't from an event" />
            )}
            <button className="a-link-btn a-danger-text" onClick={() => setDeleting(p)}>Delete photo</button>
          </div>
        ))}
        {shown.length === 0 && <p className="a-empty">No photos here yet.</p>}
      </div>

      {deleting && (() => {
        const uses = usagesOf(draft, deleting.id);
        return (
          <ConfirmDialog
            title="Delete this photo?"
            message={uses.length ? `This photo is also used in: ${uses.join(", ")}. It will be removed from those places too.` : "It will be removed from the website when you publish."}
            confirmLabel="Delete photo"
            danger
            onClose={() => setDeleting(null)}
            onConfirm={() => {
              const id = deleting.id;
              edit((d) => {
                d.photos = d.photos.filter((x) => x.id !== id);
                d.home.slides = d.home.slides.filter((x) => x !== id);
                d.about.spacePhotos = d.about.spacePhotos.filter((x) => x !== id);
                if (d.home.introPhoto === id) d.home.introPhoto = "";
                if (d.about.missionPhoto === id) d.about.missionPhoto = "";
                d.about.leaders.forEach((l) => { if (l.photo === id) l.photo = ""; });
                d.events.forEach((e) => { if (e.coverPhoto === id) e.coverPhoto = ""; });
              });
              setDeleting(null);
              showToast("Photo deleted.");
            }}
          />
        );
      })()}
    </div>
  );
}
