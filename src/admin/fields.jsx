import { useRef, useState } from "react";
import { useAdmin } from "./AdminApp.jsx";
import Modal from "../components/Modal.jsx";
import { sortEvents } from "../lib/dates.js";

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

export function Field({ label, help, children }) {
  return (
    <label className="a-field">
      <span className="a-label">{label}</span>
      {help && <span className="a-help">{help}</span>}
      {children}
    </label>
  );
}

export function TextField({ label, help, value, onChange, ...rest }) {
  return (
    <Field label={label} help={help}>
      <input className="a-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function TextArea({ label, help, value, onChange, rows = 5, paragraphs = true }) {
  return (
    <Field label={label} help={help || (paragraphs ? "Tip: leave an empty line between paragraphs." : undefined)}>
      <textarea className="a-input" rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

// A list of short lines (e.g. bullet points)
export function LinesField({ label, help, value = [], onChange, placeholder, addLabel = "+ Add line" }) {
  const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)));
  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      {help && <span className="a-help">{help}</span>}
      <div className="a-lines">
        {value.map((line, i) => (
          <div key={i} className="a-line">
            <input className="a-input" value={line} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            <button type="button" className="a-icon-btn" title="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" className="a-btn a-btn-quiet a-btn-sm" onClick={() => onChange([...value, ""])}>{addLabel}</button>
    </div>
  );
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
  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
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

export function PhotoListField({ label, help, value = [], onChange, uploadDefaults }) {
  const { draft } = useAdmin();
  const [picking, setPicking] = useState(false);
  const photos = value.map((id) => draft.photos.find((p) => p.id === id)).filter(Boolean);
  const shift = (i, d) => { const copy = [...value]; move(copy, i, d); onChange(copy); };
  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      {help && <span className="a-help">{help}</span>}
      <div className="a-photo-list">
        {photos.map((p, i) => (
          <div key={p.id + i} className="a-photo-tile">
            <img src={p.src} alt="" />
            <span className="a-photo-num">{i + 1}</span>
            <div className="a-photo-tile-actions">
              <button type="button" title="Move earlier" disabled={i === 0} onClick={() => shift(i, -1)}>←</button>
              <button type="button" title="Move later" disabled={i === photos.length - 1} onClick={() => shift(i, 1)}>→</button>
              <button type="button" title="Remove from this list" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
            </div>
          </div>
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

export function useUploader(defaults) {
  const { uploadPhotos, showToast } = useAdmin();
  const [busy, setBusy] = useState(null);
  const upload = async (files, extra) => {
    setBusy(`${files.length} photo${files.length > 1 ? "s" : ""}`);
    try {
      const ids = await uploadPhotos(files, { ...defaults, ...extra });
      showToast(`${ids.length} photo${ids.length > 1 ? "s" : ""} uploaded.`);
      return ids;
    } catch (e) {
      showToast(e.message, "error");
      return [];
    } finally {
      setBusy(null);
    }
  };
  return [upload, busy];
}

export function PhotoPicker({ multiple, exclude = [], uploadDefaults, onPick, onClose }) {
  const { draft } = useAdmin();
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [upload, busy] = useUploader(uploadDefaults);
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
        <DropZone
          busy={busy}
          onFiles={async (files) => {
            const ids = await upload(files);
            if (ids.length) multiple ? setSelected((s) => [...s, ...ids]) : onPick([ids[0]]);
          }}
        >
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
