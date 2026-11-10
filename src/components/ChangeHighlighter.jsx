import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { changedEventTitles, changedSet, normalize } from "../lib/changes.js";

// Preview only. Marks whatever is new or edited (compared with the published site) with a
// `data-changed` attribute; styles.css turns that into a highlight. It works on the rendered page,
// so it covers every page without each one needing to know about it.
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);
const CARD = ".event-row, .event-card, .event-modal-body";
const URL_IN_STYLE = /url\(["']?([^"')]+)["']?\)/;

export function countChanges(published, draft) {
  return changedSet(published, draft).size + changedEventTitles(published, draft).size;
}

export default function ChangeHighlighter({ published, draft, enabled }) {
  const location = useLocation();
  const changed = useMemo(() => changedSet(published, draft), [published, draft]);
  const events = useMemo(() => changedEventTitles(published, draft), [published, draft]);

  useEffect(() => {
    const clear = () => document.querySelectorAll("[data-changed]").forEach((el) => el.removeAttribute("data-changed"));
    if (!enabled || (!changed.size && !events.size)) { clear(); return; }

    let frame = 0;
    const observer = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(apply); });
    const watch = () => observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    function apply() {
      observer.disconnect();
      clear();
      const skipBanner = (el) => el.closest(".preview-banner");

      // Text
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || SKIP.has(el.tagName) || skipBanner(el)) continue;
        const text = normalize(node.nodeValue);
        if (!text) continue;
        if (changed.has(text)) el.setAttribute("data-changed", "text");
        if (events.has(text)) el.closest(CARD)?.setAttribute("data-changed", "block");
      }

      // Images
      document.querySelectorAll("img[src]").forEach((img) => {
        if (!skipBanner(img) && changed.has(img.getAttribute("src"))) img.setAttribute("data-changed", "img");
      });
      document.querySelectorAll('[style*="url("]').forEach((el) => {
        const m = URL_IN_STYLE.exec(el.getAttribute("style") || "");
        if (m && changed.has(m[1])) el.setAttribute("data-changed", "img");
      });
      watch();
    }

    apply();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); clear(); };
  }, [enabled, changed, events, location.pathname]);

  return null;
}
