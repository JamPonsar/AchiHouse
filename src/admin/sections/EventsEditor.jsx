import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useAdmin, newId, ConfirmDialog } from "../AdminApp.jsx";
import { Card, DropZone, PageTitle, PhotoField, PhotoPicker, TextArea, TextField, useUploader } from "../fields.jsx";
import { formatDate, formatTimeRange, sortEvents, todayKey } from "../../lib/dates.js";

export default function EventsEditor() {
  return (
    <Routes>
      <Route index element={<EventList />} />
      <Route path="new" element={<NewEvent />} />
      <Route path=":id" element={<EventForm />} />
    </Routes>
  );
}

function EventList() {
  const { draft, published } = useAdmin();
  const [tab, setTab] = useState("upcoming");
  const [q, setQ] = useState("");
  const today = todayKey();
  const all = draft.events.filter((e) => e.title.toLowerCase().includes(q.toLowerCase()));
  const list = tab === "upcoming" ? sortEvents(all.filter((e) => e.date >= today)) : sortEvents(all.filter((e) => e.date < today), -1);
  const isNew = (ev) => !published.events.some((p) => p.id === ev.id);
  const isEdited = (ev) => {
    const p = published.events.find((x) => x.id === ev.id);
    return p && JSON.stringify(p) !== JSON.stringify(ev);
  };

  return (
    <div className="a-page">
      <PageTitle title="Events" intro="Events appear on the calendar and in the upcoming / past lists.">
        <Link to="/admin/events/new" className="a-btn a-btn-primary">+ Add new event</Link>
      </PageTitle>

      <div className="a-toolbar">
        <div className="a-tabs">
          <button className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}>Upcoming ({draft.events.filter((e) => e.date >= today).length})</button>
          <button className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}>Past ({draft.events.filter((e) => e.date < today).length})</button>
        </div>
        <input className="a-input a-search" placeholder="🔍 Search events" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="a-event-list">
        {list.length === 0 && <p className="a-empty">No {tab} events{q && " match your search"}.</p>}
        {list.map((ev) => {
          const cover = draft.photos.find((p) => p.id === ev.coverPhoto);
          const count = draft.photos.filter((p) => p.eventId === ev.id).length;
          return (
            <Link key={ev.id} to={`/admin/events/${ev.id}`} className="a-event-row">
              {cover ? <img src={cover.src} alt="" /> : <div className="a-photo-empty">No photo</div>}
              <div>
                <strong>{ev.title || "Untitled event"}</strong>
                <span>{formatDate(ev.date)}{ev.startTime && ` · ${formatTimeRange(ev.startTime, ev.endTime)}`}</span>
                <span className="a-muted">{count} photo{count === 1 ? "" : "s"}</span>
              </div>
              {isNew(ev) && <span className="a-pill a-pill-new">New, not published</span>}
              {isEdited(ev) && <span className="a-pill a-pill-edit">Edited, not published</span>}
              <span className="a-btn a-btn-sm">Edit</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NewEvent() {
  const { edit } = useAdmin();
  const navigate = useNavigate();
  const created = useRef(false);
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    const id = newId("ev");
    edit((d) => {
      d.events.push({ id, title: "", date: todayKey(), startTime: "", endTime: "", location: "Achi House, Main Hall", summary: "", description: "", coverPhoto: "" });
    });
    navigate(`/admin/events/${id}`, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function EventForm() {
  const { id } = useParams();
  const { draft, edit, showToast } = useAdmin();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picking, setPicking] = useState(false);
  const [upload, busy] = useUploader({ eventId: id });
  const index = draft.events.findIndex((e) => e.id === id);
  const ev = draft.events[index];

  if (!ev) {
    return (
      <div className="a-page">
        <p>This event doesn't exist (it may have been deleted).</p>
        <Link to="/admin/events" className="a-btn">← Back to events</Link>
      </div>
    );
  }

  const set = (k) => (v) => edit((d) => { d.events[index][k] = v; });
  const photos = draft.photos.filter((p) => p.eventId === id);

  const duplicate = () => {
    const copyId = newId("ev");
    edit((d) => { d.events.push({ ...structuredClone(ev), id: copyId, title: ev.title + " (copy)" }); });
    showToast("Event copied. Now change the date and details.");
    navigate(`/admin/events/${copyId}`);
  };

  return (
    <div className="a-page">
      <Link to="/admin/events" className="a-back">← All events</Link>
      <PageTitle title={ev.title || "New event"}>
        <button className="a-btn a-btn-quiet" onClick={duplicate} title="Make a copy, e.g. for a weekly class">⧉ Duplicate</button>
        <button className="a-btn a-btn-quiet a-danger-text" onClick={() => setConfirmDelete(true)}>🗑 Delete event</button>
      </PageTitle>

      <Card title="Event details">
        <TextField label="Event name *" value={ev.title} onChange={set("title")} placeholder="e.g. Losar Celebration" autoFocus={!ev.title} />
        {!ev.title && <p className="a-warn">Please give the event a name.</p>}
        <div className="a-three">
          <TextField label="Date *" type="date" value={ev.date} onChange={set("date")} />
          <TextField label="Start time" type="time" value={ev.startTime} onChange={set("startTime")} />
          <TextField label="End time" type="time" value={ev.endTime} onChange={set("endTime")} />
        </div>
        <TextField label="Location" value={ev.location} onChange={set("location")} />
        <TextArea label="Short summary" help="One sentence, shown in event lists." rows={2} paragraphs={false} value={ev.summary} onChange={set("summary")} />
        <TextArea label="Full description" help="Shown when someone clicks the event. Tip: leave an empty line between paragraphs." rows={7} value={ev.description} onChange={set("description")} />
      </Card>

      <Card title="Cover photo" help="The main picture for this event.">
        <PhotoField value={ev.coverPhoto} onChange={set("coverPhoto")} uploadDefaults={{ eventId: id }} />
      </Card>

      <Card
        title={`Event photos (${photos.length})`}
        help="These appear when someone opens the event, and on the Photos page under this event's name."
        actions={<button className="a-btn a-btn-sm" onClick={() => setPicking(true)}>Add from photo library</button>}
      >
        <DropZone busy={busy} onFiles={(files) => upload(files)} />
        <div className="a-photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="a-photo-card">
              <img src={p.src} alt="" />
              <input
                className="a-input"
                placeholder="Add a caption…"
                value={p.caption}
                onChange={(e) => edit((d) => { d.photos.find((x) => x.id === p.id).caption = e.target.value; })}
              />
              <div className="a-photo-card-actions">
                {ev.coverPhoto !== p.id ? (
                  <button className="a-link-btn" onClick={() => set("coverPhoto")(p.id)}>Make cover</button>
                ) : (
                  <span className="a-pill">Cover photo</span>
                )}
                <button className="a-link-btn a-danger-text" title="Removes it from this event, but keeps it in your photo library" onClick={() => edit((d) => { d.photos.find((x) => x.id === p.id).eventId = ""; })}>
                  Remove from event
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="a-form-footer">
        <span className="a-muted">✓ Changes are saved as a draft automatically. Click <b>Publish changes</b> at the top when ready.</span>
        <Link to="/admin/events" className="a-btn">Done</Link>
      </div>

      {picking && (
        <PhotoPicker
          multiple
          exclude={photos.map((p) => p.id)}
          uploadDefaults={{ eventId: id }}
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            edit((d) => { d.photos.forEach((p) => { if (ids.includes(p.id)) p.eventId = id; }); });
            setPicking(false);
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${ev.title || "this event"}"?`}
          message={`The event will be removed from the calendar when you publish. ${photos.length ? `Its ${photos.length} photos will stay in your photo library.` : ""}`}
          confirmLabel="Delete event"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            edit((d) => {
              d.events = d.events.filter((e) => e.id !== id);
              d.photos.forEach((p) => { if (p.eventId === id) p.eventId = ""; });
            });
            showToast("Event deleted. Publish to remove it from the website.");
            navigate("/admin/events");
          }}
        />
      )}
    </div>
  );
}
