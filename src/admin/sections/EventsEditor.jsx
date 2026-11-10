import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useAdmin, newId, ConfirmDialog } from "../AdminApp.jsx";
import { Card, CoverField, DropZone, Field, PageTitle, PhotoPicker, TextArea, TextField, useUploader } from "../fields.jsx";
import { eventCover } from "../../lib/content.jsx";
import Modal from "../../components/Modal.jsx";
import { formatDate, formatTimeRange, generateDates, repeatOptions, sortEvents, todayKey } from "../../lib/dates.js";

// Details that are shared by every event in a repeating series
const SERIES_DETAILS = ["title", "startTime", "endTime", "location", "summary", "description", "cover", "coverPhoto", "coverX", "coverY", "coverZoom"];
const SERIES_MAX = 52;

// A fresh event based on an existing one (details and cover photo are copied;
// event photos and series links are not). A past date becomes today.
function copyOf(ev) {
  const { id, seriesId, ...rest } = structuredClone(ev); // eslint-disable-line no-unused-vars
  const today = todayKey();
  return { ...rest, id: newId("ev"), date: ev.date < today ? today : ev.date };
}

const seriesOf = (events, ev) =>
  ev.seriesId ? sortEvents(events.filter((e) => e.seriesId === ev.seriesId)) : [];

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
  const { draft, published, highlight, edit, showToast } = useAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState("upcoming");
  const [q, setQ] = useState("");
  const today = todayKey();
  const all = draft.events.filter((e) => e.title.toLowerCase().includes(q.toLowerCase()));
  const list = tab === "upcoming" ? sortEvents(all.filter((e) => e.date >= today)) : sortEvents(all.filter((e) => e.date < today), -1);
  // Events on the live website that have been deleted from the draft
  const deleted = !highlight ? [] : published.events.filter((e) =>
    !draft.events.some((x) => x.id === e.id) && e.title.toLowerCase().includes(q.toLowerCase()) && (tab === "upcoming" ? e.date >= today : e.date < today)
  );
  const isNew = (ev) => !published.events.some((p) => p.id === ev.id);
  const isEdited = (ev) => {
    const p = published.events.find((x) => x.id === ev.id);
    return p && JSON.stringify(p) !== JSON.stringify(ev);
  };

  const copy = (ev) => {
    const c = copyOf(ev);
    edit((d) => { d.events.push(c); });
    showToast("Event copied. Now choose the new date and check the details.");
    navigate(`/admin/events/${c.id}`);
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
        {list.length === 0 && deleted.length === 0 && <p className="a-empty">No {tab} events{q && " match your search"}.</p>}
        {list.map((ev) => {
          const cover = eventCover(draft, ev);
          const count = draft.photos.filter((p) => p.eventId === ev.id).length;
          return (
            <Link key={ev.id} to={`/admin/events/${ev.id}`} className={`a-event-row ${highlight && (isNew(ev) || isEdited(ev)) ? "is-changed" : ""}`}>
              {cover ? <img src={cover} alt="" /> : <div className="a-photo-empty">No photo</div>}
              <div>
                <strong>{ev.title || "Untitled event"}</strong>
                <span>{formatDate(ev.date)}{ev.startTime && ` · ${formatTimeRange(ev.startTime, ev.endTime)}`}</span>
                <span className="a-muted">{count} photo{count === 1 ? "" : "s"}</span>
              </div>
              {ev.seriesId && <span className="a-pill" title="Part of a repeating series">↻ Repeats</span>}
              {isNew(ev) && <span className="a-pill a-pill-new">New, not published</span>}
              {isEdited(ev) && <span className="a-pill a-pill-edit">Edited, not published</span>}
              <button
                type="button"
                className="a-btn a-btn-sm a-btn-quiet"
                title="Make a new event from this one"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); copy(ev); }}
              >
                ⧉ Copy
              </button>
              <span className="a-btn a-btn-sm">Edit</span>
            </Link>
          );
        })}
        {deleted.map((ev) => (
          <div key={ev.id} className="a-event-row is-deleted">
            {eventCover(published, ev) ? <img src={eventCover(published, ev)} alt="" /> : <div className="a-photo-empty">No photo</div>}
            <div>
              <strong>{ev.title || "Untitled event"}</strong>
              <span>{formatDate(ev.date)}{ev.startTime && ` · ${formatTimeRange(ev.startTime, ev.endTime)}`}</span>
            </div>
            <span className="a-pill a-pill-no">Deleted, not published</span>
            <button
              type="button"
              className="a-btn a-btn-sm"
              title="Bring this event back"
              onClick={() => { edit((d) => { d.events.push(structuredClone(ev)); }); showToast("Event restored."); }}
            >
              ↺ Restore
            </button>
          </div>
        ))}
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
      d.events.push({ id, title: "", date: todayKey(), startTime: "", endTime: "", location: "Achi House, Main Hall", summary: "", description: "", cover: "" });
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
  const [confirmApply, setConfirmApply] = useState(false);
  const [repeatKind, setRepeatKind] = useState("weekly");
  const [repeatCount, setRepeatCount] = useState("8");
  const [upload, busy, review] = useUploader({ eventId: id });
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
  const cover = eventCover(draft, ev);
  const setCover = (src) => edit((d) => {
    d.events[index].cover = src;
    d.events[index].coverPhoto = "";
    // a new picture starts out centered
    if (src !== cover) { d.events[index].coverX = 50; d.events[index].coverY = 50; d.events[index].coverZoom = 1; }
  });

  const duplicate = () => {
    const c = copyOf(ev);
    edit((d) => { d.events.push(c); });
    showToast("Event copied. Now choose the new date and check the details.");
    navigate(`/admin/events/${c.id}`);
  };

  // Repeating events
  const series = seriesOf(draft.events, ev);
  const laterInSeries = series.filter((e) => e.id !== id && e.date > ev.date);
  const upcomingOthers = series.filter((e) => e.id !== id && e.date >= todayKey());
  const total = Math.min(SERIES_MAX, Math.max(2, parseInt(repeatCount, 10) || 2));
  const options = repeatOptions(ev.date);
  const newDates = generateDates(ev.date, repeatKind, total).slice(1);

  const createRepeats = () => {
    const seriesId = newId("sr");
    edit((d) => {
      const base = d.events[index];
      base.seriesId = seriesId;
      newDates.forEach((date) => {
        d.events.push({ ...structuredClone(base), id: newId("ev"), date, seriesId });
      });
    });
    showToast(`Created ${newDates.length} more events. They're saved as a draft until you publish.`);
  };

  const applyToSeries = () => {
    edit((d) => {
      const source = d.events[index];
      d.events.forEach((e) => {
        if (e.seriesId === source.seriesId && e.id !== source.id && e.date >= todayKey()) {
          SERIES_DETAILS.forEach((k) => { e[k] = source[k]; });
        }
      });
    });
    setConfirmApply(false);
    showToast(`Updated ${upcomingOthers.length} other upcoming events in this series.`);
  };

  const removeEvents = (ids) => {
    edit((d) => {
      d.events = d.events.filter((e) => !ids.includes(e.id));
      d.photos.forEach((p) => { if (ids.includes(p.eventId)) p.eventId = ""; });
    });
    showToast(`${ids.length === 1 ? "Event" : `${ids.length} events`} deleted. Publish to remove ${ids.length === 1 ? "it" : "them"} from the website.`);
    navigate("/admin/events");
  };

  return (
    <div className="a-page">
      <Link to="/admin/events" className="a-back">← All events</Link>
      <PageTitle title={ev.title || "New event"}>
        <button className="a-btn a-btn-quiet" onClick={duplicate} title="Make a new event from this one">⧉ Copy as new event</button>
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

      {!ev.seriesId ? (
        <Card
          title="Repeat this event"
          help="Need this event every week or month? Fill in the details above first, then create all the dates at once. Each date becomes its own event, so you can still change or delete any single one."
        >
          <div className="a-two">
            <Field label="How often?">
              <select className="a-input" value={repeatKind} onChange={(e) => setRepeatKind(e.target.value)}>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <TextField
              label="How many events in total?"
              help={`Counting this one. Up to ${SERIES_MAX}.`}
              type="number"
              min="2"
              max={SERIES_MAX}
              value={repeatCount}
              onChange={setRepeatCount}
            />
          </div>
          <div className="a-repeat-preview">
            <strong>This will add {newDates.length} more event{newDates.length === 1 ? "" : "s"}:</strong>
            <div className="a-date-chips">
              {newDates.map((d) => <span key={d} className="a-date-chip">{formatDate(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>)}
            </div>
          </div>
          <button className="a-btn a-btn-primary" onClick={createRepeats} disabled={!ev.title || !ev.date}>
            ↻ Create {newDates.length} more event{newDates.length === 1 ? "" : "s"}
          </button>
          {!ev.title && <p className="a-warn">Give the event a name first.</p>}
        </Card>
      ) : (
        <Card
          title={`Part of a repeating series (${series.length} events)`}
          help="Click a date to open that event. Changing details on this page only affects this one event, unless you use the button below."
        >
          <div className="a-date-chips">
            {series.map((e) => (
              <Link key={e.id} to={`/admin/events/${e.id}`} className={`a-date-chip a-date-link ${e.id === id ? "current" : ""}`}>
                {formatDate(e.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </Link>
            ))}
          </div>
          <div className="a-series-actions">
            <button className="a-btn" onClick={() => setConfirmApply(true)} disabled={upcomingOthers.length === 0}>
              Use these details for all {upcomingOthers.length} other upcoming events
            </button>
            <button className="a-link-btn" onClick={() => edit((d) => { delete d.events[index].seriesId; })}>
              Remove this event from the series
            </button>
          </div>
        </Card>
      )}

      <Card title="Cover photo" help="The main picture for this event. It's kept separately from your photo library, so deleting a library photo never removes it from the event.">
        <CoverField
          value={cover}
          onChange={setCover}
          frame={{ x: ev.coverX ?? 50, y: ev.coverY ?? 50, zoom: ev.coverZoom || 1 }}
          onFrame={(patch) => edit((d) => { Object.assign(d.events[index], patch); })}
        />
      </Card>

      <Card
        title={`Event photos (${photos.length})`}
        help="These appear when someone opens the event, and on the Photos page under this event's name."
        actions={<button className="a-btn a-btn-sm" onClick={() => setPicking(true)}>Add from photo library</button>}
      >
        <DropZone busy={busy} onFiles={(files) => upload(files)} />
        {review}
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
                {cover !== p.src ? (
                  <button className="a-link-btn" onClick={() => setCover(p.src)}>Make cover</button>
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
      {confirmApply && (
        <ConfirmDialog
          title={`Update ${upcomingOthers.length} other upcoming events?`}
          message="Their name, times, location, summary, description and cover photo will be replaced with what's on this page. Dates and event photos are not changed. Past events in the series are left alone."
          confirmLabel="Yes, update them"
          onClose={() => setConfirmApply(false)}
          onConfirm={applyToSeries}
        />
      )}
      {confirmDelete && laterInSeries.length > 0 && (
        <Modal onClose={() => setConfirmDelete(false)} className="a-dialog" label="Delete event">
          <div className="a-dialog-body">
            <h2>Delete "{ev.title || "this event"}"?</h2>
            <p className="a-muted">This event is part of a repeating series. Which would you like to delete?</p>
            <div className="a-dialog-actions a-stack">
              <button className="a-btn a-btn-danger" onClick={() => removeEvents([id])}>Delete only this event</button>
              <button className="a-btn a-btn-danger" onClick={() => removeEvents([id, ...laterInSeries.map((e) => e.id)])}>
                Delete this and the {laterInSeries.length} later event{laterInSeries.length === 1 ? "" : "s"}
              </button>
              <button className="a-btn a-btn-quiet" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
      {confirmDelete && laterInSeries.length === 0 && (
        <ConfirmDialog
          title={`Delete "${ev.title || "this event"}"?`}
          message={`The event will be removed from the calendar when you publish. ${photos.length ? `Its ${photos.length} photos will stay in your photo library.` : ""}`}
          confirmLabel="Delete event"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => removeEvents([id])}
        />
      )}
    </div>
  );
}
