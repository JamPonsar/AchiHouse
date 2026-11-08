// Shows phone numbers typed one per line, each as a tap-to-call link.
export default function Phones({ value }) {
  const numbers = (value || "").split("\n").map((n) => n.trim()).filter(Boolean);
  return numbers.map((n, i) => (
    <span key={i}>
      {i > 0 && <br />}
      <a href={`tel:${n.replace(/[^\d+]/g, "")}`}>{n}</a>
    </span>
  ));
}
