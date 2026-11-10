import { useState } from "react";
import { useAdmin, ConfirmDialog } from "../AdminApp.jsx";
import { BulkBar, Card, ChangeTag, DropZone, PageTitle, SelectBox, itemState, useSelection, useUploader } from "../fields.jsx";
import { sortEvents } from "../../lib/dates.js";

// Where a photo is used, so we can warn before deleting it
function usagesOf(d, id) {
  const out = [];
  if (d.home.slides.includes(id)) out.push("Home page slideshow");
  if (d.home.introPhoto === id) out.push("Home page welcome photo");
  if (d.about.missionPhoto === id) out.push("About page mission photo");
  if (d.about.spacePhotos.includes(id)) out.push("About page space photos");
  d.about.leaders.forEach((l) => l.photo === id && out.push(`Leader photo (${l.name})`));
  return out;
}

export default function PhotosEditor() {
  const { draft, published, highlight, edit, showToast } = useAdmin();
  const [filter, setFilter] = useState("all");
  const [uploadTo, setUploadTo] = useState("");
  const [upload, busy, review] = useUploader();
  const [deleting, setDeleting] = useState(null); // array of photos
  const sel = useSelection();
  const events = sortEvents(draft.events, -1);
  const albums = [...new Set(draft.photos.map((p) => p.album).filter(Boolean))];

  const shown = draft.photos.filter((p) =>
    filter === "all" ? true : filter === "none" ? !p.eventId : p.eventId === filter
  );
  const setPhoto = (id, k, v) => edit((d) => { d.photos.find((p) => p.id === id)[k] = v; });
  // Apply a change to every selected photo
  const setSelected = (patch) => {
    const ids = sel.ids;
    edit((d) => { d.photos.forEach((p) => { if (ids.includes(p.id)) Object.assign(p, patch); }); });
  };
  const setHidden = (ids, hidden) => edit((d) => {
    d.photos.forEach((p) => { if (ids.includes(p.id)) { if (hidden) p.hidden = true; else delete p.hidden; } });
  });

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

      {review}
      <datalist id="albums">{albums.map((a) => <option key={a} value={a} />)}</datalist>
      <BulkBar
        count={sel.ids.length}
        total={shown.length}
        onSelectAll={() => sel.set(shown.map((p) => p.id))}
        onClear={sel.clear}
        events={events}
        albums={albums}
        onSetEvent={(eventId) => setSelected({ eventId })}
        onSetAlbum={(album) => setSelected({ album, eventId: "" })}
        onHide={(hidden) => { setHidden(sel.ids, hidden); showToast(hidden ? "Photos hidden from the website." : "Photos will show on the website."); }}
        onDelete={() => setDeleting(draft.photos.filter((p) => sel.has(p.id)))}
        deleteLabel="Delete"
      />
      <div className="a-photo-grid a-photo-grid-lg">
        {shown.map((p) => {
          const state = itemState(published.photos, p, highlight);
          return (
          <div key={p.id} className={`a-photo-card a-selectable ${sel.has(p.id) ? "selected" : ""} ${p.hidden ? "is-hidden" : ""} ${state ? "is-changed" : ""}`}>
            <div className="a-photo-frame">
              <ChangeTag state={state} />
              {state === "edited" && (
                <button
                  className="a-tag a-tag-reset a-photo-reset"
                  title="Put this photo's details back the way they are on the live website"
                  onClick={() => edit((d) => {
                    const was = published.photos.find((x) => x.id === p.id);
                    const i = d.photos.findIndex((x) => x.id === p.id);
                    if (was && i > -1) d.photos[i] = structuredClone(was);
                  })}
                >
                  ↺ Reset
                </button>
              )}
              <a href={p.src} target="_blank" rel="noreferrer"><img src={p.src} alt="" loading="lazy" /></a>
              <SelectBox checked={sel.has(p.id)} onChange={() => sel.toggle(p.id)} />
              {p.hidden && <span className="a-hidden-badge">Hidden</span>}
            </div>
            <input className="a-input" placeholder="Add a caption…" value={p.caption} onChange={(e) => setPhoto(p.id, "caption", e.target.value)} />
            <select className="a-input" value={p.eventId} onChange={(e) => setPhoto(p.id, "eventId", e.target.value)} title="Which event is this photo from?">
              <option value="">No event</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.date.slice(0, 4)})</option>)}
            </select>
            {!p.eventId && (
              <input className="a-input" list="albums" placeholder="Album, e.g. Our Space" value={p.album || ""} onChange={(e) => setPhoto(p.id, "album", e.target.value)} title="Group photos that aren't from an event" />
            )}
            <div className="a-photo-card-actions">
              <button className="a-link-btn" onClick={() => setHidden([p.id], !p.hidden)}>{p.hidden ? "Show on website" : "Hide"}</button>
              <button className="a-link-btn a-danger-text" onClick={() => setDeleting([p])}>Delete photo</button>
            </div>
          </div>
          );
        })}
        {shown.length === 0 && <p className="a-empty">No photos here yet.</p>}
      </div>

      {deleting && (() => {
        const n = deleting.length;
        const uses = [...new Set(deleting.flatMap((p) => usagesOf(draft, p.id)))];
        return (
          <ConfirmDialog
            title={n === 1 ? "Delete this photo?" : `Delete ${n} photos?`}
            message={
              (uses.length ? `${n === 1 ? "This photo is" : "These photos are"} also used in: ${uses.join(", ")}. ${n === 1 ? "It" : "They"} will be removed from those places too.` : `${n === 1 ? "It" : "They"} will be removed from the website when you publish.`) +
              " If you only want to take photos off the website, use Hide instead."
            }
            confirmLabel={n === 1 ? "Delete photo" : `Delete ${n} photos`}
            danger
            onClose={() => setDeleting(null)}
            onConfirm={() => {
              const ids = deleting.map((p) => p.id);
              edit((d) => {
                d.photos = d.photos.filter((x) => !ids.includes(x.id));
                d.home.slides = d.home.slides.filter((x) => !ids.includes(x));
                d.about.spacePhotos = d.about.spacePhotos.filter((x) => !ids.includes(x));
                if (ids.includes(d.home.introPhoto)) d.home.introPhoto = "";
                if (ids.includes(d.about.missionPhoto)) d.about.missionPhoto = "";
                d.about.leaders.forEach((l) => { if (ids.includes(l.photo)) l.photo = ""; });
                // Event covers are independent of the library; older ones that still point at a
                // library photo keep their image.
                d.events.forEach((e) => {
                  if (ids.includes(e.coverPhoto)) {
                    e.cover = e.cover || deleting.find((p) => p.id === e.coverPhoto).src;
                    e.coverPhoto = "";
                  }
                });
              });
              sel.set((s) => s.filter((id) => !ids.includes(id)));
              setDeleting(null);
              showToast(n === 1 ? "Photo deleted." : `${n} photos deleted.`);
            }}
          />
        );
      })()}
    </div>
  );
}
