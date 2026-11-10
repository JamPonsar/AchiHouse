import { useMemo, useState } from "react";
import Lightbox from "../components/Lightbox.jsx";
import PageHeader from "./PageHeader.jsx";
import { galleryPhotos, useContent } from "../lib/content.jsx";
import { sortEvents } from "../lib/dates.js";

export default function Photos() {
  const { content } = useContent();
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const photos = useMemo(() => galleryPhotos(content), [content]);

  // Filters: one per event that has photos, plus any album names
  const filters = useMemo(() => {
    const out = [{ key: "all", label: "All photos", count: photos.length }];
    for (const ev of sortEvents(content.events, -1)) {
      const count = photos.filter((p) => p.eventId === ev.id).length;
      if (count) out.push({ key: "ev:" + ev.id, label: ev.title, count, year: ev.date.slice(0, 4) });
    }
    const albums = [...new Set(photos.filter((p) => !p.eventId && p.album).map((p) => p.album))];
    for (const a of albums) out.push({ key: "al:" + a, label: a, count: photos.filter((p) => !p.eventId && p.album === a).length });
    return out;
  }, [content, photos]);

  const shown = photos.filter((p) =>
    filter === "all" ? true : filter.startsWith("ev:") ? p.eventId === filter.slice(3) : !p.eventId && p.album === filter.slice(3)
  );

  return (
    <>
      <PageHeader title={content.settings.navPhotos?.trim() || "Photos"} intro="Moments from our celebrations, ceremonies and everyday life at Achi House." image="/photos/photo-21.jpg" />
      <section className="section">
        <div className="container">
          <div className="filter-bar">
            <label className="filter-select">
              <span>Show photos from</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {filters.map((f) => <option key={f.key} value={f.key}>{f.label}{f.year ? ` (${f.year})` : ""} · {f.count}</option>)}
              </select>
            </label>
            <div className="chips">
              {filters.map((f) => (
                <button key={f.key} className={`chip ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>
                  {f.label} <span>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="masonry">
            {shown.map((p, i) => (
              <button key={p.id} className="masonry-item" onClick={() => setLightbox(i)}>
                <img src={p.src} alt={p.caption || ""} loading="lazy" />
                {p.caption && <span className="masonry-caption">{p.caption}</span>}
              </button>
            ))}
          </div>
        </div>
      </section>
      {lightbox !== null && <Lightbox photos={shown} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
