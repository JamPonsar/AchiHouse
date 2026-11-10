import { useEffect, useRef, useState } from "react";
import { useAdmin } from "./AdminApp.jsx";
import Modal from "../components/Modal.jsx";
import { sortEvents } from "../lib/dates.js";
import { isChangedValue } from "../lib/changes.js";

// Is this value new or edited compared with the published site? (false when highlighting is off)
export function useChanged(value) {
  const { baseline, highlight } = useAdmin();
  return highlight && isChangedValue(baseline, value);
}

// "new" / "edited" / null for an item in a list (event, photo…), compared with the published list
export function itemState(publishedList, item, highlight) {
  if (!highlight || !publishedList) return null;
  const was = publishedList.find((x) => x.id === item.id);
  if (!was) return "new";
  return JSON.stringify(was) === JSON.stringify(item) ? null : "edited";
}

// "Changed" tag with a Reset button that puts the field back to what's on the live website
export function ChangedBadge({ onChange }) {
  const { fieldReset } = useAdmin();
  const reset = onChange ? fieldReset(onChange) : null;
  return (
    <>
      <span className="a-tag a-tag-edited">Changed</span>
      {reset && (
        <button
          type="button"
          className="a-tag a-tag-reset"
          title="Put this back the way it is on the live website"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); reset(); }}
        >
          ↺ Reset
        </button>
      )}
    </>
  );
}

export function ChangeTag({ state }) {
  return state ? <span className={`a-tag a-tag-${state}`}>{state === "new" ? "New" : "Edited"}</span> : null;
}

export function PageTitle({ title, intro, children }) {
  return (
    <div className="a-page-title">
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children && <div className="a-page-title-actions">{children}</div>}
    </div>
  );
}

export function Card({ title, help, children, actions }) {
  return (
    <section className="a-card">
      {(title || actions) && (
        <div className="a-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {help && <p className="a-muted">{help}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, help, children, changed, onReset }) {
  return (
    <label className={`a-field ${changed ? "is-changed" : ""}`}>
      <span className="a-label">{label}{changed && <ChangedBadge onChange={onReset} />}</span>
      {help && <span className="a-help">{help}</span>}
      {children}
    </label>
  );
}

export function TextField({ label, help, value, onChange, ...rest }) {
  const changed = useChanged(value);
  return (
    <Field label={label} help={help} changed={changed} onReset={onChange}>
      <input className="a-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function TextArea({ label, help, value, onChange, rows = 5, paragraphs = true }) {
  const changed = useChanged(value);
  return (
    <Field label={label} help={help || (paragraphs ? "Tip: leave an empty line between paragraphs." : undefined)} changed={changed} onReset={onChange}>
      <textarea className="a-input" rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

// A list of short lines (e.g. bullet points)
export function LinesField({ label, help, value = [], onChange, placeholder, addLabel = "+ Add line" }) {
  const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)));
  const { baseline, highlight } = useAdmin();
  const changed = highlight && value.some((line) => isChangedValue(baseline, line));
  return (
    <div className="a-field">
      <span className="a-label">{label}{changed && <ChangedBadge onChange={onChange} />}</span>
      {help && <span className="a-help">{help}</span>}
      <div className="a-lines">
        {value.map((line, i) => (
          <ChangedLine key={i} line={line}>
            <input className="a-input" value={line} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            <button type="button" className="a-icon-btn" title="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
          </ChangedLine>
        ))}
      </div>
      <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => onChange([...value, ""])}>{addLabel}</button>
    </div>
  );
}

function ChangedLine({ line, children }) {
  const changed = useChanged(line);
  return <div className={`a-line ${changed ? "is-changed" : ""}`}>{children}</div>;
}

// Move an item in an array
export const move = (arr, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
};

// Up / down / delete controls for repeatable items
export function ItemControls({ index, count, onMove, onDelete, deleteLabel = "Remove" }) {
  return (
    <div className="a-item-controls">
      <button type="button" className="a-icon-btn" title="Move up" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
      <button type="button" className="a-icon-btn" title="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>↓</button>
      <button type="button" className="a-btn a-btn-quiet a-btn-sm a-danger-text" onClick={onDelete}>{deleteLabel}</button>
    </div>
  );
}

// ── Photos ───────────────────────────────────────────────────────────────

export function usePhoto(id) {
  const { draft } = useAdmin();
  return draft.photos.find((p) => p.id === id) || null;
}

export function PhotoField({ label, help, value, onChange, uploadDefaults, allowEmpty = true }) {
  const photo = usePhoto(value);
  const [picking, setPicking] = useState(false);
  const changed = useChanged(value);
  return (
    <div className={`a-field ${changed ? "is-changed" : ""}`}>
      <span className="a-label">{label}{changed && <ChangedBadge onChange={onChange} />}</span>
      {help && <span className="a-help">{help}</span>}
      <div className="a-photo-field">
        {photo ? <img src={photo.src} alt="" /> : <div className="a-photo-empty">No photo</div>}
        <div className="a-photo-field-actions">
          <button type="button" className="a-btn a-btn-sm" onClick={() => setPicking(true)}>{photo ? "Change photo" : "Choose photo"}</button>
          {photo && allowEmpty && <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => onChange("")}>Remove</button>}
        </div>
      </div>
      {picking && (
        <PhotoPicker
          uploadDefaults={uploadDefaults}
          onClose={() => setPicking(false)}
          onPick={(ids) => { onChange(ids[0]); setPicking(false); }}
        />
      )}
    </div>
  );
}

// A cover image that belongs to the item itself. Uploading or choosing one stores a separate copy
// of the image, so deleting the photo from the photo library never removes it from here.
export function CoverField({ label, help, value, onChange, frame, onFrame }) {
  const { draft, uploadImage, showToast } = useAdmin();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const changed = useChanged(value);
  const onFile = async (file) => {
    setBusy(true);
    try { onChange(await uploadImage(file)); } catch (e) { showToast(e.message, "error"); } finally { setBusy(false); }
  };
  return (
    <div className={`a-field ${changed ? "is-changed" : ""}`}>
      <span className="a-label">{label}{changed && <ChangedBadge onChange={onChange} />}</span>
      {help && <span className="a-help">{help}</span>}
      <div className="a-photo-field">
        {value ? <img src={value} alt="" /> : <div className="a-photo-empty">No photo</div>}
        <div className="a-photo-field-actions">
          <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => input.current.click()}>
            {busy ? "Uploading…" : value ? "Upload a different cover" : "Upload cover photo"}
          </button>
          <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => setPicking(true)}>Use a library photo</button>
          {value && <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => onChange("")}>Remove</button>}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; if (f) onFile(f); }} />
      </div>
      {value && frame && <FramePicker src={value} frame={frame} onFrame={onFrame} />}
      {picking && (
        <PhotoPicker
          onClose={() => setPicking(false)}
          onPick={(ids) => { onChange(draft.photos.find((p) => p.id === ids[0])?.src || ""); setPicking(false); }}
        />
      )}
    </div>
  );
}

// Drag the picture and zoom to choose what part shows when it is cropped (cards, the event popup,
// and especially phones, where the picture is cropped differently). The same framing is used everywhere.
function FramePicker({ src, frame, onFrame }) {
  const stage = useRef(null);
  const drag = useRef(null);
  const [aspect, setAspect] = useState(null); // natural width / height of the picture
  const style = {
    "--cover": `url("${src}")`,
    "--cover-pos": `${frame.x}% ${frame.y}%`,
    "--cover-zoom": frame.zoom,
  };
  const moved = frame.x !== 50 || frame.y !== 50 || frame.zoom !== 1;
  const clamp = (n) => Math.max(0, Math.min(100, n));

  // Figure out the picture's shape, so dragging moves it exactly as far as the pointer moves
  useEffect(() => {
    const img = new Image();
    img.onload = () => setAspect(img.naturalWidth / img.naturalHeight);
    img.src = src;
  }, [src]);

  const onMove = (e) => {
    const d = drag.current;
    if (!d || !aspect) return;
    const { width: bw, height: bh } = stage.current.getBoundingClientRect();
    // size of the picture once it fills the frame
    const imgH = Math.max(bh, bw / aspect);
    const imgW = aspect * imgH;
    // content shifts by (box - zoom * picture) per 100% of position
    const spanX = bw - frame.zoom * imgW;
    const spanY = bh - frame.zoom * imgH;
    const patch = {};
    if (Math.abs(spanX) > 1) patch.x = clamp(d.x0 + ((e.clientX - d.px) / spanX) * 100);
    if (Math.abs(spanY) > 1) patch.y = clamp(d.y0 + ((e.clientY - d.py) / spanY) * 100);
    if (Object.keys(patch).length) onFrame({ coverX: patch.x ?? frame.x, coverY: patch.y ?? frame.y });
  };

  return (
    <div className="a-frame">
      <span className="a-label">Position &amp; zoom <span className="a-muted">(for cards, the event popup and phones)</span></span>
      <div className="a-frame-row">
        <div className="a-frame-main">
          <div
            ref={stage}
            className="a-frame-stage cover-framed"
            style={style}
            title="Drag to move the picture"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { px: e.clientX, py: e.clientY, x0: frame.x, y0: frame.y };
            }}
            onPointerMove={onMove}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
          />
          <label className="a-frame-zoom">
            <span>Zoom</span>
            <input
              type="range" min="1" max="3" step="0.05" value={frame.zoom}
              onChange={(e) => onFrame({ coverZoom: Number(e.target.value) })}
              aria-label="Zoom"
            />
          </label>
        </div>
        <div className="a-frame-previews">
          <div>
            <small>Event popup on a phone</small>
            <div className="a-frame-phone-banner cover-framed" style={style} />
          </div>
          <div>
            <small>Event card</small>
            <div className="a-frame-card cover-framed" style={style} />
          </div>
        </div>
      </div>
      <button type="button" className="a-link-btn" disabled={!moved} onClick={() => onFrame({ coverX: 50, coverY: 50, coverZoom: 1 })}>
        ↺ Re-center
      </button>
    </div>
  );
}

function PhotoTile({ id, children }) {
  const changed = useChanged(id);
  return <div className={`a-photo-tile ${changed ? "is-changed" : ""}`}>{children}</div>;
}

export function PhotoListField({ label, help, value = [], onChange, uploadDefaults }) {
  const { draft, baseline, highlight } = useAdmin();
  const [picking, setPicking] = useState(false);
  const changed = highlight && value.some((id) => isChangedValue(baseline, id));
  const photos = value.map((id) => draft.photos.find((p) => p.id === id)).filter(Boolean);
  const shift = (i, d) => { const copy = [...value]; move(copy, i, d); onChange(copy); };
  return (
    <div className={`a-field ${changed ? "is-changed" : ""}`}>
      <span className="a-label">{label}{changed && <ChangedBadge onChange={onChange} />}</span>
      {help && <span className="a-help">{help}</span>}
      <div className="a-photo-list">
        {photos.map((p, i) => (
          <PhotoTile key={p.id + i} id={p.id}>
            <img src={p.src} alt="" />
            <span className="a-photo-num">{i + 1}</span>
            <div className="a-photo-tile-actions">
              <button type="button" title="Move earlier" disabled={i === 0} onClick={() => shift(i, -1)}>←</button>
              <button type="button" title="Move later" disabled={i === photos.length - 1} onClick={() => shift(i, 1)}>→</button>
              <button type="button" title="Remove from this list" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
            </div>
          </PhotoTile>
        ))}
        <button type="button" className="a-photo-add" onClick={() => setPicking(true)}>
          <span>+</span>Add photos
        </button>
      </div>
      {picking && (
        <PhotoPicker
          multiple
          exclude={value}
          uploadDefaults={uploadDefaults}
          onClose={() => setPicking(false)}
          onPick={(ids) => { onChange([...value, ...ids]); setPicking(false); }}
        />
      )}
    </div>
  );
}

export function UploadButton({ onFiles, label = "Upload photos", multiple = true, className = "a-btn" }) {
  const input = useRef(null);
  return (
    <>
      <button type="button" className={className} onClick={() => input.current.click()}>⬆ {label}</button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => { const files = [...e.target.files]; e.target.value = ""; if (files.length) onFiles(files); }}
      />
    </>
  );
}

// Drag-and-drop area that also works as a click-to-browse button
export function DropZone({ onFiles, busy, children }) {
  const [over, setOver] = useState(false);
  const input = useRef(null);
  return (
    <div
      className={`a-dropzone ${over ? "over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        if (files.length) onFiles(files);
      }}
      onClick={() => !busy && input.current.click()}
      role="button"
      tabIndex={0}
    >
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...e.target.files]; e.target.value = ""; if (f.length) onFiles(f); }} />
      {busy ? <><span className="loader" /> <p>Uploading {busy}…</p></> : children || (
        <>
          <div className="a-dropzone-icon">📷</div>
          <p><strong>Click to choose photos</strong> or drag them here</p>
          <p className="a-muted">You can pick several at once. Large photos are resized automatically.</p>
        </>
      )}
    </div>
  );
}

// Selection state shared by the photo grids (checkbox in each photo's corner)
export function useSelection() {
  const [ids, setIds] = useState([]);
  return {
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    set: setIds,
    clear: () => setIds([]),
  };
}

// The small box in the top corner of a photo
export function SelectBox({ checked, onChange }) {
  return (
    <label className={`a-select-box ${checked ? "checked" : ""}`} title={checked ? "Deselect" : "Select"}>
      <input type="checkbox" checked={checked} onChange={onChange} aria-label="Select photo" />
      <span aria-hidden="true">{checked ? "✓" : ""}</span>
    </label>
  );
}

// Actions for the selected photos. Pass only the actions that apply.
export function BulkBar({ count, total, onSelectAll, onClear, events, albums, onSetEvent, onSetAlbum, onHide, onDelete, deleteLabel = "Delete" }) {
  const [album, setAlbum] = useState("");
  if (!count) {
    return total ? <div className="a-bulkbar a-bulkbar-idle"><button className="a-link-btn" onClick={onSelectAll}>Select all {total}</button><span className="a-muted">Tick the box on a photo to hide, move or delete several at once.</span></div> : null;
  }
  return (
    <div className="a-bulkbar">
      <strong>{count} selected</strong>
      <button className="a-link-btn" onClick={onSelectAll}>Select all {total}</button>
      <button className="a-link-btn" onClick={onClear}>Clear</button>
      <div className="a-bulkbar-actions">
        {onSetEvent && (
          <select className="a-input" value="" onChange={(e) => { if (e.target.value !== "") onSetEvent(e.target.value === "__none" ? "" : e.target.value); }} aria-label="Set event for selected photos">
            <option value="">Set event…</option>
            <option value="__none">No event</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.date.slice(0, 4)})</option>)}
          </select>
        )}
        {onSetAlbum && (
          <span className="a-bulkbar-album">
            <input className="a-input" list="albums" placeholder="Album name" value={album} onChange={(e) => setAlbum(e.target.value)} aria-label="Album for selected photos" />
            <button className="a-btn a-btn-sm" onClick={() => { onSetAlbum(album.trim()); setAlbum(""); }}>Set album</button>
          </span>
        )}
        {onHide && (
          <>
            <button className="a-btn a-btn-sm" onClick={() => onHide(true)}>Hide</button>
            <button className="a-btn a-btn-sm" onClick={() => onHide(false)}>Show</button>
          </>
        )}
        {onDelete && <button className="a-btn a-btn-sm a-btn-danger" onClick={onDelete}>{deleteLabel}</button>}
      </div>
    </div>
  );
}

// Choose files → look them over here → only then are they uploaded and added to the library.
// Returns [upload(files), busyText, reviewElement]. Render the element somewhere on the page.
export function useUploader(defaults, onAdded) {
  const { prepareUploads, commitUploads, showToast } = useAdmin();
  const [busy, setBusy] = useState(null);
  const [staged, setStaged] = useState(null);

  const upload = async (files, extra) => {
    setBusy(`${files.length} photo${files.length > 1 ? "s" : ""}`);
    try {
      const items = await prepareUploads(files, { ...defaults, ...extra });
      setStaged((s) => [...(s || []), ...items]);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    staged?.forEach((s) => URL.revokeObjectURL(s.preview));
    setStaged(null);
  };

  const review = staged && (
    <UploadReview
      items={staged}
      setItems={setStaged}
      onAddMore={upload}
      busy={busy}
      onCancel={close}
      onConfirm={async (items) => {
        try {
          const ids = await commitUploads(items);
          showToast(`${ids.length} photo${ids.length > 1 ? "s" : ""} added.`);
          close();
          onAdded?.(ids);
        } catch (e) {
          showToast(e.message, "error");
        }
      }}
    />
  );
  return [upload, busy, review];
}

function UploadReview({ items, setItems, onAddMore, busy, onCancel, onConfirm }) {
  const { draft } = useAdmin();
  const sel = useSelection();
  const [saving, setSaving] = useState(false);
  const events = sortEvents(draft.events, -1);
  const albums = [...new Set(draft.photos.map((p) => p.album).filter(Boolean))];
  const update = (keys, patch) => setItems((all) => all.map((s) => (keys.includes(s.key) ? { ...s, ...patch } : s)));
  const input = useRef(null);

  const removeSelected = () => {
    items.filter((s) => sel.has(s.key)).forEach((s) => URL.revokeObjectURL(s.preview));
    setItems((all) => all.filter((s) => !sel.has(s.key)));
    sel.clear();
  };
  const hiddenCount = items.filter((s) => s.hidden).length;

  return (
    <Modal onClose={saving ? () => {} : onCancel} className="a-dialog a-review" label="Review photos">
      <div className="a-dialog-body">
        <h2>Review your photos</h2>
        <p className="a-muted">
          Nothing has been added yet. Check the photos below, fix their details, and remove any you don't want. Then confirm to add them to your photo library.
        </p>
        <BulkBar
          count={sel.ids.length}
          total={items.length}
          onSelectAll={() => sel.set(items.map((s) => s.key))}
          onClear={sel.clear}
          events={events}
          albums={albums}
          onSetEvent={(eventId) => update(sel.ids, { eventId })}
          onSetAlbum={(album) => update(sel.ids, { album, eventId: "" })}
          onHide={(hidden) => update(sel.ids, { hidden })}
          onDelete={removeSelected}
          deleteLabel="Remove from upload"
        />
        <datalist id="albums">{albums.map((a) => <option key={a} value={a} />)}</datalist>
        <div className="a-photo-grid a-review-grid">
          {items.map((s) => (
            <div key={s.key} className={`a-photo-card a-selectable ${sel.has(s.key) ? "selected" : ""} ${s.hidden ? "is-hidden" : ""}`}>
              <div className="a-photo-frame">
                <img src={s.preview} alt="" />
                <SelectBox checked={sel.has(s.key)} onChange={() => sel.toggle(s.key)} />
                {s.hidden && <span className="a-hidden-badge">Hidden</span>}
              </div>
              <input className="a-input" placeholder="Add a caption…" value={s.caption} onChange={(e) => update([s.key], { caption: e.target.value })} />
              <select className="a-input" value={s.eventId} onChange={(e) => update([s.key], { eventId: e.target.value })} title="Which event is this photo from?">
                <option value="">No event</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.date.slice(0, 4)})</option>)}
              </select>
              {!s.eventId && (
                <input className="a-input" list="albums" placeholder="Album, e.g. Our Space" value={s.album} onChange={(e) => update([s.key], { album: e.target.value })} />
              )}
            </div>
          ))}
          {items.length === 0 && <p className="a-empty">All photos were removed from this upload.</p>}
        </div>
        <div className="a-dialog-actions a-sticky-actions">
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...e.target.files]; e.target.value = ""; if (f.length) onAddMore(f); }} />
          <button className="a-btn a-btn-quiet" disabled={saving || !!busy} onClick={() => input.current.click()}>
            {busy ? `Preparing ${busy}…` : "+ Choose more photos"}
          </button>
          <span className="a-spacer" />
          <button className="a-btn a-btn-quiet" disabled={saving} onClick={onCancel}>Cancel</button>
          <button
            className="a-btn a-btn-primary"
            disabled={!items.length || saving || !!busy}
            onClick={async () => { setSaving(true); try { await onConfirm(items); } finally { setSaving(false); } }}
          >
            {saving ? "Uploading…" : `Add ${items.length} photo${items.length === 1 ? "" : "s"} to library`}
            {!saving && hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function PhotoPicker({ multiple, exclude = [], uploadDefaults, onPick, onClose }) {
  const { draft } = useAdmin();
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [upload, busy, review] = useUploader(uploadDefaults, (ids) => {
    if (multiple) setSelected((s) => [...s, ...ids]); else onPick([ids[0]]);
  });
  const events = sortEvents(draft.events, -1).filter((ev) => draft.photos.some((p) => p.eventId === ev.id));
  const photos = draft.photos.filter((p) =>
    !exclude.includes(p.id) && (filter === "all" || (filter === "none" ? !p.eventId : p.eventId === filter))
  );
  const toggle = (id) => {
    if (!multiple) return onPick([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Modal onClose={onClose} className="a-dialog a-picker" label="Choose photos">
      <div className="a-dialog-body">
        <h2>{multiple ? "Choose photos" : "Choose a photo"}</h2>
        {review}
        <DropZone busy={busy} onFiles={(files) => upload(files)}>
          <p><strong>⬆ Upload new photo{multiple ? "s" : ""}</strong> (click or drag here)</p>
        </DropZone>
        <div className="a-picker-filter">
          <span>Or pick from your photo library:</span>
          <select className="a-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All photos ({draft.photos.length})</option>
            <option value="none">Not linked to an event</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.date.slice(0, 4)})</option>)}
          </select>
        </div>
        <div className="a-picker-grid">
          {photos.map((p) => (
            <button key={p.id} type="button" className={`a-picker-item ${selected.includes(p.id) ? "selected" : ""}`} onClick={() => toggle(p.id)} title={p.caption}>
              <img src={p.src} alt={p.caption} loading="lazy" />
              {selected.includes(p.id) && <span className="a-check">✓ {selected.indexOf(p.id) + 1}</span>}
            </button>
          ))}
          {photos.length === 0 && <p className="a-muted">No photos here yet.</p>}
        </div>
        {multiple && (
          <div className="a-dialog-actions a-sticky-actions">
            <button className="a-btn a-btn-quiet" onClick={onClose}>Cancel</button>
            <button className="a-btn a-btn-primary" disabled={!selected.length} onClick={() => onPick(selected)}>
              Add {selected.length || ""} photo{selected.length === 1 ? "" : "s"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
