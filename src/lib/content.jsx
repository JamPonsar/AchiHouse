import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { seedContent } from "../data/seed.js";
import { withDefaults } from "./defaults.js";

const ContentContext = createContext(null);

const PREVIEW_KEY = "achihouse-preview";
const COMPARE_KEY = "achihouse-compare"; // "<history id>|<when it was published>" while comparing an old version

export function isPreviewMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("preview")) {
      sessionStorage.setItem(PREVIEW_KEY, "1");
      const id = params.get("compare");
      if (id) sessionStorage.setItem(COMPARE_KEY, `${id}|${params.get("at") || ""}`);
      else sessionStorage.removeItem(COMPARE_KEY);
    }
    return sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

// Set when previewing an old version from the edit history: { id, at }
export function compareInfo() {
  try {
    const v = sessionStorage.getItem(COMPARE_KEY);
    if (!v) return null;
    const [id, at] = v.split("|");
    return { id, at };
  } catch {
    return null;
  }
}

export function exitPreview() {
  try { sessionStorage.removeItem(PREVIEW_KEY); sessionStorage.removeItem(COMPARE_KEY); } catch {}
  window.location.href = window.location.pathname;
}

export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);
  const [published, setPublished] = useState(null); // preview only: what visitors see now
  const [preview] = useState(isPreviewMode);
  const [compare] = useState(compareInfo);
  const [showChanges, setShowChanges] = useState(() => {
    try { return localStorage.getItem("achihouse-show-changes") !== "off"; } catch { return true; }
  });
  const toggleChanges = () => {
    setShowChanges(!showChanges);
    try { localStorage.setItem("achihouse-show-changes", showChanges ? "off" : "on"); } catch {}
  };
  // Preview only: events on the published site that this version no longer has (shown crossed out)
  const deletedEvents = useMemo(
    () => (preview && showChanges && published && content
      ? (published.events || []).filter((e) => !content.events.some((x) => x.id === e.id))
      : []),
    [preview, showChanges, published, content]
  );

  useEffect(() => {
    // Comparing an old version: show it, highlighted where it differs from the current version
    const load = preview && compare
      ? Promise.all([api.get("/api/admin/draft"), api.get(`/api/admin/history/${compare.id}`)])
          .then(([r, old]) => { setPublished(withDefaults(r.draft || r.published || null)); return old; })
      : preview
      ? api.get("/api/admin/draft")
          .then((r) => { setPublished(withDefaults(r.published || null)); return r.draft || r.published; })
          .catch(() => api.get("/api/content"))
      : api.get("/api/content");
    load.then((c) => setContent(withDefaults(c))).catch((err) => {
      console.warn("Could not load content from the server; using starter content.", err);
      setContent(seedContent);
    });
  }, [preview, compare]);

  if (!content) return <div className="page-loading"><span className="loader" /></div>;
  return <ContentContext.Provider value={{ content, preview, published, compare, showChanges, toggleChanges, deletedEvents }}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);

// Photos shown in galleries (hidden ones stay in the library but aren't displayed)
export function galleryPhotos(content) {
  return content.photos.filter((p) => !p.hidden);
}

// Look up a photo in the library by id
export function photoById(content, id) {
  return content.photos.find((p) => p.id === id) || null;
}
export function photoSrc(content, id) {
  return photoById(content, id)?.src || "";
}

// An event's cover image. New covers are stored as their own image (`cover`), separate from the
// photo library, so deleting a library photo never changes an event. Older events still point at a
// library photo through `coverPhoto`, which is used as a fallback.
export function eventCover(content, ev) {
  return ev.cover || photoSrc(content, ev.coverPhoto);
}

// How an event's cover is framed (moved and zoomed) wherever it is shown as a cropped picture.
// Use with className="cover-framed" (see styles.css).
export function framedStyle(src, { x = 50, y = 50, zoom = 1 } = {}) {
  return {
    "--cover": src ? `url("${src}")` : "none",
    "--cover-pos": `${x}% ${y}%`,
    "--cover-zoom": zoom || 1,
  };
}

export function coverStyle(content, ev, srcOverride) {
  return framedStyle(srcOverride || eventCover(content, ev), { x: ev.coverX ?? 50, y: ev.coverY ?? 50, zoom: ev.coverZoom });
}

// Lineage master pictures start framed toward the top, so faces aren't cut off in wide crops
export const MASTER_FRAME = { x: 50, y: 20, zoom: 1 };
export function masterFrame(m) {
  return { x: m.imageX ?? MASTER_FRAME.x, y: m.imageY ?? MASTER_FRAME.y, zoom: m.imageZoom || 1 };
}
