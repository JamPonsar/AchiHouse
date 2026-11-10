import { useRef, useState } from "react";
import { useAdmin } from "../AdminApp.jsx";
import LogoMark from "../../components/LogoMark.jsx";
import { Card, ChangedBadge, PageTitle, TextField } from "../fields.jsx";

const MENU = [
  ["navHome", "Home"],
  ["navAbout", "About"],
  ["navEvents", "Events"],
  ["navPhotos", "Photos"],
  ["navBook", "Renting"],
  ["navContact", "Contact"],
  ["navDonate", "Donate"],
];
const LOGO_KEYS = ["logoSrc", "logoZoom", "logoX", "logoY"];
const SIZE = 220;

export default function HeaderEditor() {
  const { draft, edit } = useAdmin();
  const s = draft.settings;
  const set = (k) => (v) => edit((d) => { d.settings[k] = v; });

  return (
    <div className="a-page">
      <PageTitle title="Header & logo" intro="The name, logo and menu at the top of every page (the name and logo also appear at the bottom).">
        <a className="a-btn a-btn-quiet" href="/" target="_blank" rel="noreferrer">View site ↗</a>
      </PageTitle>

      <Card title="Name & tagline">
        <div className="a-two">
          <TextField label="Organization name" value={s.orgName} onChange={set("orgName")} />
          <TextField label="Tagline (under the name)" value={s.tagline} onChange={set("tagline")} />
        </div>
        <div className="a-logo-preview">
          <LogoMark settings={s} size={46} />
          <span><strong>{s.orgName}</strong><small>{s.tagline}</small></span>
        </div>
      </Card>

      <Card title="Logo" help="Choose a photo, then drag it to position it and use the slider to zoom. What's inside the circle is what visitors see.">
        <LogoField />
      </Card>

      <Card title="Menu names" help="Rename the links in the menu. Leave a box empty to keep the original name. The Events, Photos and About page headings use these names too.">
        <div className="a-two">
          {MENU.map(([key, original]) => (
            <TextField key={key} label={original} placeholder={original} value={s[key]} onChange={set(key)} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function LogoField() {
  const { draft, published, highlight, edit, uploadImage, showToast } = useAdmin();
  const s = draft.settings;
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const drag = useRef(null);
  const zoom = Number(s.logoZoom) || 1;

  const setLogo = (patch) => edit((d) => { Object.assign(d.settings, patch); });
  const changed = highlight && LOGO_KEYS.some((k) => (published.settings[k] ?? "") !== (s[k] ?? ""));
  const clamp = (n) => Math.max(-1, Math.min(1, n));

  const onFile = async (file) => {
    setBusy(true);
    try {
      const src = await uploadImage(file);
      setLogo({ logoSrc: src, logoZoom: 1, logoX: 0, logoY: 0 });
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`a-field ${changed ? "is-changed" : ""}`}>
      <span className="a-label">
        Logo{changed && (
          <ChangedBadge onChange={(v) => edit((d) => { for (const k of LOGO_KEYS) d.settings[k] = v; })} />
        )}
      </span>
      <div className="a-logo-editor">
        <div
          className="a-logo-stage"
          style={{ width: SIZE, height: SIZE }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: Number(s.logoX) || 0, oy: Number(s.logoY) || 0 };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = drag.current;
            setLogo({ logoX: clamp(d.ox + (e.clientX - d.x) / SIZE), logoY: clamp(d.oy + (e.clientY - d.y) / SIZE) });
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
          title="Drag to move the picture"
        >
          <LogoMark settings={s} size={SIZE} />
        </div>
        <div className="a-logo-controls">
          <label className="a-field">
            <span className="a-label">Zoom</span>
            <input
              type="range" min="1" max="4" step="0.05" value={zoom}
              onChange={(e) => setLogo({ logoZoom: Number(e.target.value) })}
              aria-label="Zoom"
            />
          </label>
          <div className="a-logo-buttons">
            <button type="button" className="a-btn" disabled={busy} onClick={() => input.current.click()}>
              {busy ? "Uploading…" : "⬆ Upload a logo photo"}
            </button>
            <button type="button" className="a-btn a-btn-quiet" onClick={() => setLogo({ logoZoom: 1, logoX: 0, logoY: 0 })}>Re-center</button>
            <button
              type="button" className="a-btn a-btn-quiet"
              onClick={() => setLogo({ logoSrc: "", logoZoom: 1, logoX: 0, logoY: 0 })}
              disabled={!s.logoSrc}
            >
              Use the original logo
            </button>
          </div>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; if (f) onFile(f); }} />
        </div>
      </div>
    </div>
  );
}
