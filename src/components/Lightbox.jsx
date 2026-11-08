import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Lightbox({ photos, index, onIndex, onClose }) {
  const photo = photos[index];
  const go = (d) => onIndex((index + d + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!photo) return null;
  return createPortal(
    <div className="lightbox" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">×</button>
      {photos.length > 1 && <button className="lightbox-nav prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>}
      <figure>
        <img src={photo.src} alt={photo.caption || ""} />
        <figcaption>
          {photo.caption}
          <span className="lightbox-count">{index + 1} / {photos.length}</span>
        </figcaption>
      </figure>
      {photos.length > 1 && <button className="lightbox-nav next" onClick={() => go(1)} aria-label="Next photo">›</button>}
    </div>,
    document.body
  );
}
