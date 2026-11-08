import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { seedContent } from "../data/seed.js";

const ContentContext = createContext(null);

const PREVIEW_KEY = "achihouse-preview";

export function isPreviewMode() {
  try {
    if (new URLSearchParams(window.location.search).has("preview")) sessionStorage.setItem(PREVIEW_KEY, "1");
    return sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function exitPreview() {
  try { sessionStorage.removeItem(PREVIEW_KEY); } catch {}
  window.location.href = window.location.pathname;
}

export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);
  const [preview] = useState(isPreviewMode);

  useEffect(() => {
    const load = preview
      ? api.get("/api/admin/draft").then((r) => r.draft || r.published).catch(() => api.get("/api/content"))
      : api.get("/api/content");
    load.then(setContent).catch((err) => {
      console.warn("Could not load content from the server; using starter content.", err);
      setContent(seedContent);
    });
  }, [preview]);

  if (!content) return <div className="page-loading"><span className="loader" /></div>;
  return <ContentContext.Provider value={{ content, preview }}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);

// Look up a photo in the library by id
export function photoById(content, id) {
  return content.photos.find((p) => p.id === id) || null;
}
export function photoSrc(content, id) {
  return photoById(content, id)?.src || "";
}
