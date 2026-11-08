import { useEffect, useState } from "react";

export default function Slideshow({ images, interval = 6000, children }) {
  const [index, setIndex] = useState(0);
  const count = images.length;

  useEffect(() => {
    if (count < 2) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, interval]);

  return (
    <div className="slideshow">
      {images.map((src, i) => (
        <div
          key={src + i}
          className={`slide ${i === index ? "active" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
          aria-hidden={i !== index}
        />
      ))}
      <div className="slideshow-overlay" />
      <div className="slideshow-content">{children}</div>
      {count > 1 && (
        <div className="slide-dots">
          {images.map((_, i) => (
            <button key={i} className={i === index ? "active" : ""} onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}
