// The round logo in the header and footer. The photo can be zoomed and moved inside the circle
// (settings.logoZoom, logoX, logoY), so a photo that isn't a perfect square still fits nicely.
export default function LogoMark({ settings, size = 46 }) {
  const src = settings.logoSrc || "/logo.png";
  const zoom = Number(settings.logoZoom) || 1;
  const x = Number(settings.logoX) || 0;
  const y = Number(settings.logoY) || 0;
  return (
    <span
      className="logo-mark"
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "inline-block", flexShrink: 0, background: "#fff" }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          display: "block", width: "100%", height: "100%", objectFit: "cover", transformOrigin: "center",
          transform: `translate(${x * 100}%, ${y * 100}%) scale(${zoom})`, userSelect: "none",
        }}
      />
    </span>
  );
}
