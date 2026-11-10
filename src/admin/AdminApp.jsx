import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { listChanges } from "../lib/diff.js";
import { baselineOf } from "../lib/changes.js";
import { withDefaults } from "../lib/defaults.js";
import { prepareImage } from "./image.js";
import Modal from "../components/Modal.jsx";
import Login from "./Login.jsx";
import Dashboard from "./sections/Dashboard.jsx";
import HomeEditor from "./sections/HomeEditor.jsx";
import AboutEditor from "./sections/AboutEditor.jsx";
import EventsEditor from "./sections/EventsEditor.jsx";
import PhotosEditor from "./sections/PhotosEditor.jsx";
import BookingEditor from "./sections/BookingEditor.jsx";
import ContactEditor from "./sections/ContactEditor.jsx";
import HeaderEditor from "./sections/HeaderEditor.jsx";
import DonateEditor from "./sections/DonateEditor.jsx";
import Requests from "./sections/Requests.jsx";
import History from "./sections/History.jsx";
import "./admin.css";

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

// Used by fieldReset: while this is an array, edit() records what would be written instead of writing
let probing = null;

// Path segments are property names, array positions, or { id } for list items that have an id
function getAt(root, path) {
  let o = root;
  for (const seg of path) {
    if (o === undefined || o === null) return undefined;
    o = typeof seg === "object" ? o.find?.((x) => x.id === seg.id) : o[seg];
  }
  return o;
}

// Run an edit function against a read-only view of the draft, returning the paths it tries to write
function recordWrites(root, fn) {
  const writes = [];
  const wrap = (target, path) => new Proxy(target, {
    get(t, k, receiver) {
      const v = Reflect.get(t, k, receiver);
      if (typeof k === "symbol" || v === null || typeof v !== "object") return v;
      const seg = Array.isArray(t) && /^\d+$/.test(k) ? (v.id !== undefined ? { id: v.id } : Number(k)) : k;
      return wrap(v, [...path, seg]);
    },
    set(t, k) { writes.push([...path, k]); return true; },
    deleteProperty(t, k) { writes.push([...path, k]); return true; },
  });
  fn(wrap(root, []));
  return writes;
}

export const newId =(prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const SECTIONS = [
  { to: "/admin", label: "Start here", icon: "🏠", end: true },
  { group: "Website pages" },
  { to: "/admin/header", label: "Header & logo", icon: "🏷️" },
  { to: "/admin/home", label: "Home page", icon: "🖼️" },
  { to: "/admin/about", label: "About page", icon: "📖" },
  { to: "/admin/events", label: "Events", icon: "📅" },
  { to: "/admin/photos", label: "Photos", icon: "📷" },
  { to: "/admin/booking", label: "Renting", icon: "🗓️" },
  { to: "/admin/contact", label: "Contact info", icon: "☎️" },
  { to: "/admin/donate", label: "Donate page", icon: "💛" },
  { group: "Other" },
  { to: "/admin/requests", label: "Messages & requests", icon: "✉️", badge: "requests" },
  { to: "/admin/history", label: "Edit history", icon: "🕘" },
];

export default function AdminApp() {
  const [published, setPublished] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveState, setSaveState] = useState("saved"); // saved | pending | saving | error
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null); // "publish" | "discard"
  const [newRequests, setNewRequests] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [restoreUndo, setRestoreUndo] = useState(null); // the draft as it was just before an old version was restored
  const [highlight, setHighlightState] = useState(() => {
    try { return localStorage.getItem("achihouse-highlight") !== "off"; } catch { return true; }
  });
  const setHighlight = (on) => {
    setHighlightState(on);
    try { localStorage.setItem("achihouse-highlight", on ? "on" : "off"); } catch {}
  };
  const lastSaved = useRef(null);
  const timer = useRef(null);
  const navigate = useNavigate();

  // Keep this page out of search engines (the server also sends a no-index header)
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const oldTitle = document.title;
    document.title = "Website editor";
    return () => { meta.remove(); document.title = oldTitle; };
  }, []);

  // Load published + draft
  const load = useCallback(() => {
    api.get("/api/admin/draft")
      .then((r) => {
        const pub = withDefaults(r.published);
        const dr = withDefaults(r.draft || r.published);
        setPublished(pub);
        setDraft(dr);
        lastSaved.current = JSON.stringify(dr);
      })
      .catch((e) => (e.status === 401 ? setNeedsLogin(true) : setLoadError(e.message)));
    api.get("/api/admin/requests").then((r) => setNewRequests(r.filter((x) => x.status === "new").length)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  // If the login expires while editing, ask to sign in again (without losing edits)
  useEffect(() => {
    const onExpired = () => setNeedsLogin(true);
    window.addEventListener("admin-unauthorized", onExpired);
    return () => window.removeEventListener("admin-unauthorized", onExpired);
  }, []);

  const signOut = async () => {
    if (draft) await saveNow(draft);
    try { await api.post("/api/admin/logout"); } catch {}
    window.location.href = "/";
  };

  const showToast = useCallback((message, kind = "success") => {
    setToast({ message, kind, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Save the draft to the server (unpublished)
  const saveNow = useCallback(async (data) => {
    clearTimeout(timer.current);
    const body = JSON.stringify(data);
    if (body === lastSaved.current) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    try {
      await api.put("/api/admin/draft", data);
      lastSaved.current = body;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  // Autosave shortly after each edit
  useEffect(() => {
    if (!draft) return;
    if (JSON.stringify(draft) === lastSaved.current) return;
    setSaveState("pending");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveNow(draft), 800);
    return () => clearTimeout(timer.current);
  }, [draft, saveNow]);

  // Warn before closing the tab while a save is in progress
  useEffect(() => {
    const handler = (e) => {
      if (saveState === "pending" || saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  // edit(d => { d.home.heroTitle = "..." })
  const draftNow = useRef(null);
  draftNow.current = draft;
  const edit = useCallback((fn) => {
    // While a field is working out which part of the data it edits (see fieldReset), only record
    if (probing) { probing.push(...recordWrites(draftNow.current, fn)); return; }
    setDraft((d) => {
      const copy = structuredClone(d);
      fn(copy);
      return copy;
    });
  }, []);

  // For a changed field: returns a function that puts it back to the published value, or null if
  // there is nothing to go back to (e.g. it belongs to something that is new). Works by running the
  // field's own onChange against a recorder to learn which part of the data the field edits.
  const fieldReset = useCallback((onChange) => {
    if (!published || !draftNow.current) return null;
    const paths = [];
    probing = paths;
    try { onChange(""); } catch { return null; } finally { probing = null; }
    if (!paths.length || !paths.every((p) => getAt(published, p.slice(0, -1)) !== undefined)) return null;
    return () => edit((d) => {
      for (const p of paths) {
        const parent = getAt(d, p.slice(0, -1));
        if (parent === undefined) continue;
        const was = getAt(published, p);
        if (was === undefined) delete parent[p[p.length - 1]]; else parent[p[p.length - 1]] = structuredClone(was);
      }
    });
  }, [published, edit]);

  // Step 1: resize the chosen files in the browser. Nothing is uploaded or saved yet.
  const prepareUploads = useCallback(async (files, defaults = {}) => {
    const items = [];
    try {
      for (const file of files) {
        const { blob, type } = await prepareImage(file);
        items.push({
          key: newId("up"), blob, type, preview: URL.createObjectURL(blob),
          caption: "", eventId: "", album: "", hidden: false, ...defaults,
        });
      }
    } catch (e) {
      items.forEach((s) => URL.revokeObjectURL(s.preview));
      throw e;
    }
    return items;
  }, []);

  // Upload a single image on its own (not added to the photo library). Returns its address.
  const uploadImage = useCallback(async (file) => {
    const { blob, type } = await prepareImage(file);
    const { src } = await api.upload(blob, type);
    return src;
  }, []);

  // Step 2: after the person confirms, upload and add them to the photo library.
  const commitUploads = useCallback(async (items) => {
    const created = [];
    for (const it of items) {
      const { src } = await api.upload(it.blob, it.type);
      const photo = { id: newId("ph"), src, caption: it.caption, eventId: it.eventId, album: it.eventId ? "" : it.album };
      if (it.hidden) photo.hidden = true;
      created.push(photo);
    }
    edit((d) => { d.photos.unshift(...created); });
    return created.map((p) => p.id);
  }, [edit]);

  const changeList = useMemo(() => listChanges(published, draft), [published, draft]);
  const changes = useMemo(() => changeList.map((c) => c.text), [changeList]);
  // Everything on the published site, so fields can tell whether they've been changed
  const baseline = useMemo(() => (published ? baselineOf(published) : null), [published]);
  const hasChanges = useMemo(
    () => !!draft && !!published && JSON.stringify(draft) !== JSON.stringify(published),
    [draft, published]
  );

  const openPreview = async () => {
    const win = window.open("about:blank", "_blank");
    await saveNow(draft);
    if (win) win.location.href = "/?preview=1";
  };

  const publish = async (note) => {
    await saveNow(draft);
    await api.post("/api/admin/publish", { note, changes });
    setPublished(draft);
    lastSaved.current = JSON.stringify(draft);
    setDialog(null);
    setRestoreUndo(null);
    showToast("Your changes are now live on the website. 🎉");
  };

  const discard = async () => {
    clearTimeout(timer.current);
    await api.del("/api/admin/draft");
    lastSaved.current = JSON.stringify(published);
    setDraft(published);
    setSaveState("saved");
    setDialog(null);
    setRestoreUndo(null);
    showToast("Unpublished changes were discarded.");
  };

  const undoRestore = () => {
    setDraft(restoreUndo.draft); // autosave then stores it again
    setRestoreUndo(null);
    showToast("Restore undone. Your previous draft is back.");
  };

  const replaceDraft = (data) => {
    data = withDefaults(data);
    lastSaved.current = JSON.stringify(data);
    setDraft(data);
  };

  if (needsLogin) {
    return (
      <Login
        expired={!!draft}
        onSuccess={() => {
          setNeedsLogin(false);
          if (draft) saveNow(draft); else load();
        }}
      />
    );
  }
  if (loadError) {
    return (
      <div className="admin-loading">
        <p>Couldn't load the editor: {loadError}</p>
        <button className="a-btn" onClick={() => location.reload()}>Try again</button>
      </div>
    );
  }
  if (!draft) return <div className="admin-loading"><span className="loader" /></div>;

  const ctx = { draft, published, edit, fieldReset,prepareUploads, commitUploads, uploadImage, showToast, hasChanges, changes, changeList, baseline, highlight, setHighlight, replaceDraft, setRestoreUndo, saveNow, setNewRequests, navigate };

  return (
    <AdminContext.Provider value={ctx}>
      <div className="admin">
        <header className="a-topbar">
          <button className="a-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
          <div className="a-brand">
            <strong>Achi House</strong>
            <span>Website editor</span>
          </div>
          <div className={`a-status ${hasChanges ? "has-changes" : ""}`}>
            <SaveIndicator state={saveState} />
            {hasChanges ? (
              <ChangesMenu />
            ) : (
              <span className="a-status-text">Website is up to date</span>
            )}
          </div>
          <div className="a-actions">
            <a className="a-btn a-btn-quiet hide-sm" href="/" target="_blank" rel="noreferrer">View live site ↗</a>
            <button className="a-btn a-btn-quiet" onClick={openPreview} disabled={!hasChanges} title="See your unpublished changes before visitors do">
              👁 Preview
            </button>
            <button className="a-btn a-btn-quiet hide-sm" onClick={() => setDialog("discard")} disabled={!hasChanges}>
              Discard
            </button>
            <button className="a-btn a-btn-primary" onClick={() => setDialog("publish")} disabled={!hasChanges}>
              Publish changes
            </button>
          </div>
        </header>

        {restoreUndo && (
          <div className="a-undo-bar" role="status">
            <span>An older version was loaded into your draft. Nothing is live until you publish.</span>
            <button className="a-btn a-btn-sm" onClick={undoRestore}>↶ Undo restore</button>
            <button className="a-icon-btn" aria-label="Dismiss" onClick={() => setRestoreUndo(null)}>✕</button>
          </div>
        )}

        <div className="a-body">
          <nav className={`a-sidebar ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)}>
            {SECTIONS.map((s, i) =>
              s.group ? (
                <div key={i} className="a-nav-group">{s.group}</div>
              ) : (
                <NavLink key={s.to} to={s.to} end={s.end} className="a-nav-link">
                  <span className="a-nav-icon" aria-hidden="true">{s.icon}</span>
                  {s.label}
                  {s.badge === "requests" && newRequests > 0 && <span className="a-badge">{newRequests}</span>}
                </NavLink>
              )
            )}
            <button className="a-btn a-btn-quiet a-nav-signout" onClick={signOut}>↪ Sign out</button>
            {hasChanges && (
              <button className="a-btn a-btn-quiet show-sm a-nav-discard" onClick={() => setDialog("discard")}>Discard unpublished changes</button>
            )}
          </nav>

          <main className="a-main">
            <Routes>
              <Route index element={<Dashboard newRequests={newRequests} onPublish={() => setDialog("publish")} />} />
              <Route path="home" element={<HomeEditor />} />
              <Route path="about" element={<AboutEditor />} />
              <Route path="events/*" element={<EventsEditor />} />
              <Route path="photos" element={<PhotosEditor />} />
              <Route path="booking" element={<BookingEditor />} />
              <Route path="header" element={<HeaderEditor />} />
              <Route path="contact" element={<ContactEditor />} />
              <Route path="donate" element={<DonateEditor />} />
              <Route path="requests" element={<Requests />} />
              <Route path="history" element={<History />} />
              <Route path="*" element={<Dashboard newRequests={newRequests} onPublish={() => setDialog("publish")} />} />
            </Routes>
          </main>
        </div>

        {dialog === "publish" && <PublishDialog changes={changes} onPublish={publish} onClose={() => setDialog(null)} />}
        {dialog === "discard" && (
          <ConfirmDialog
            title="Discard all unpublished changes?"
            message="This will undo every change you've made since you last published. The live website will stay exactly as it is now."
            confirmLabel="Yes, discard my changes"
            danger
            onConfirm={discard}
            onClose={() => setDialog(null)}
          />
        )}
        {toast && <div key={toast.id} className={`a-toast a-toast-${toast.kind}`}>{toast.message}</div>}
      </div>
    </AdminContext.Provider>
  );
}

// "3 unpublished changes ▾": a list of every change, each linking to where it was made
function ChangesMenu() {
  const { changeList, highlight, setHighlight, navigate, edit, showToast } = useAdmin();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(null);

  // Put one change back to the published version
  const reset = (c) => {
    edit((d) => c.revert(d));
    setConfirming(null);
    showToast("Put back the way it is on the live website.");
  };
  const box = useRef(null);
  const count = changeList.length || 1;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!box.current?.contains(e.target)) { setOpen(false); setConfirming(null); } };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const go = (to) => {
    setOpen(false);
    navigate(to);
    // Scroll to the first highlighted thing on that page
    setTimeout(() => document.querySelector(".a-main .is-changed")?.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
  };

  return (
    <div className="a-changes" ref={box}>
      <button className="a-changes-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="a-status-text"><b>{count}</b> unpublished change{count === 1 ? "" : "s"}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="a-changes-panel" role="dialog" aria-label="Unpublished changes">
          <div className="a-changes-head">
            <strong>What you've changed</strong>
            <label className="a-switch">
              <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
              <span>Highlight changes</span>
            </label>
          </div>
          <ul>
            {changeList.map((c, i) => (
              <li key={c.text} className="a-change-row">
                <button className="a-change-item" onClick={() => go(c.to)}>
                  <span className={`a-change-kind a-change-${c.kind}`}>{{ added: "New", edited: "Edited", removed: "Removed" }[c.kind]}</span>
                  <span className="a-change-text">{c.text}</span>
                  <span className="a-change-go" aria-hidden="true">Go →</span>
                </button>
                {confirming === i ? (
                  <span className="a-change-confirm">
                    <button className="a-btn a-btn-sm a-btn-danger" onClick={() => reset(c)}>Yes, reset</button>
                    <button className="a-btn a-btn-sm a-btn-quiet" onClick={() => setConfirming(null)}>Cancel</button>
                  </span>
                ) : (
                  <button className="a-btn a-btn-sm a-btn-quiet a-change-reset" title="Put this back the way it is on the live website" onClick={() => setConfirming(i)}>↺ Reset</button>
                )}
              </li>
            ))}
            {!changeList.length && <li className="a-muted a-change-empty">Small edits</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state }) {
  const label = {
    saved: "Draft saved",
    pending: "Saving…",
    saving: "Saving…",
    error: "Couldn't save. Check your internet connection",
  }[state];
  return <span className={`a-save a-save-${state}`} title="Your edits are saved automatically as a draft">{label}</span>;
}

function PublishDialog({ changes, onPublish, onClose }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  return (
    <Modal onClose={onClose} className="a-dialog" label="Publish changes">
      <div className="a-dialog-body">
        <h2>Publish these changes to the website?</h2>
        <p className="a-muted">Once you publish, everyone visiting the website will see them.</p>
        <ul className="a-change-list">
          {(changes.length ? changes : ["Small edits"]).map((c, i) => <li key={i}>{c}</li>)}
        </ul>
        <label className="a-field">
          <span className="a-label">Add a note for the history <em>(optional)</em></span>
          <input className="a-input" placeholder='e.g. "Added December events"' value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {err && <p className="a-error">{err}</p>}
        <div className="a-dialog-actions">
          <button className="a-btn a-btn-quiet" onClick={onClose}>Not yet</button>
          <button
            className="a-btn a-btn-primary a-btn-lg"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await onPublish(note); } catch (e) { setErr(e.message); setBusy(false); }
            }}
          >
            {busy ? "Publishing…" : "✓ Yes, publish now"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose} className="a-dialog" label={title}>
      <div className="a-dialog-body">
        <h2>{title}</h2>
        {message && <p className="a-muted">{message}</p>}
        <div className="a-dialog-actions">
          <button className="a-btn a-btn-quiet" onClick={onClose}>Cancel</button>
          <button
            className={`a-btn ${danger ? "a-btn-danger" : "a-btn-primary"}`}
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
