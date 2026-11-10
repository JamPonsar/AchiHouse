import { useEffect, useRef, useState } from "react";

const SETTLE_MS = 320;

// Fading slideshow. It also follows a finger or a trackpad: swipe sideways on a phone or tablet, or
// two-finger swipe on a trackpad, to move to the previous / next picture. A regular mouse can't drag it.
export default function Slideshow({ images, interval = 6000, children }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(null); // { dx, width } while a picture is being dragged
  const [settle, setSettle] = useState(null); // { show, hide, hideX, done } while it slides into place
  const root = useRef(null);
  const start = useRef(null);
  const count = images.length;

  // Automatic advance. Restarts after every change, so a swipe isn't followed by an instant jump.
  useEffect(() => {
    if (count < 2 || drag || settle) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, interval, index, drag, settle]);

  const wrap = (i) => (i + count) % count;

  const finish = (dx, width, minPx = Infinity) => {
    const dir = dx < 0 ? 1 : -1; // dragging left shows the next picture
    const neighbor = wrap(index + dir);
    const commit = Math.abs(dx) > Math.min(width * 0.2, minPx);
    setDrag(null);
    setSettle(
      commit
        ? { show: neighbor, hide: index, hideX: dx < 0 ? -width : width }
        : { show: index, hide: neighbor, hideX: dx < 0 ? width : -width }
    );
    if (commit) setIndex(neighbor);
    setTimeout(() => {
      // put the picture that slid away back where the fade expects it, without animating
      setSettle((s) => s && { ...s, done: true });
      requestAnimationFrame(() => requestAnimationFrame(() => setSettle(null)));
    }, SETTLE_MS);
  };

  // Trackpad two-finger swipes arrive as sideways "wheel" events. Follow them, then decide when they stop.
  const latest = useRef(null);
  latest.current = { count, settle, finish };
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let total = 0;
    let timer = null;
    let lockedUntil = 0;
    const onWheel = (e) => {
      if (latest.current.count < 2 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // up/down: normal scrolling
      e.preventDefault(); // also stops the browser treating the swipe as "go back"
      if (latest.current.settle || Date.now() < lockedUntil) return;
      const width = el.getBoundingClientRect().width;
      total = Math.max(-width, Math.min(width, total + e.deltaX));
      setDrag({ dx: -total, width });
      clearTimeout(timer);
      timer = setTimeout(() => {
        const dx = -total;
        total = 0;
        lockedUntil = Date.now() + 600; // ignore the trackpad's coasting after the fingers lift
        latest.current.finish(dx, width, 60);
      }, 90);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); clearTimeout(timer); };
  }, []);

  const onPointerDown = (e) => {
    // Touch and pen only: a regular mouse can't drag the pictures
    if (count < 2 || settle || e.pointerType === "mouse") return;
    if (e.target.closest("a, button")) return; // keep the buttons and dots working normally
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, dragging: false };
  };

  const onPointerMove = (e) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return; // not a sideways drag (yet)
      s.dragging = true;
      root.current.setPointerCapture(e.pointerId);
    }
    setDrag({ dx, width: root.current.getBoundingClientRect().width });
  };

  const onPointerEnd = (e) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    if (s.dragging && drag) finish(drag.dx, drag.width);
    else setDrag(null);
  };

  const slideStyle = (i) => {
    if (drag) {
      const dir = drag.dx < 0 ? 1 : -1;
      if (i === index) return { transform: `translateX(${drag.dx}px)`, opacity: 1, transition: "none" };
      if (i === wrap(index + dir)) {
        return { transform: `translateX(${drag.dx - dir * drag.width}px)`, opacity: 1, transition: "none" };
      }
    }
    if (settle) {
      const move = `transform ${SETTLE_MS}ms ease-out, opacity ${SETTLE_MS}ms ease-out`;
      if (settle.done && i === settle.hide) return { transition: "none" };
      if (!settle.done && i === settle.show) return { transform: "translateX(0)", opacity: 1, transition: move };
      if (!settle.done && i === settle.hide) return { transform: `translateX(${settle.hideX}px)`, opacity: 1, transition: move };
    }
    return undefined;
  };

  return (
    <div
      ref={root}
      className={`slideshow ${drag ? "dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {images.map((src, i) => (
        <div
          key={src + i}
          className={`slide ${i === index ? "active" : ""}`}
          style={{ backgroundImage: `url(${src})`, ...slideStyle(i) }}
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
