// Renders text typed in the admin: blank lines become paragraphs, single line
// breaks are kept.
export default function Text({ children, className }) {
  const text = (children || "").trim();
  if (!text) return null;
  return (
    <div className={className}>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j, arr) => (
            <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
          ))}
        </p>
      ))}
    </div>
  );
}
