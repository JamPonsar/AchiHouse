import { useState } from "react";
import Text from "../components/Text.jsx";
import { Icon } from "../components/EventModal.jsx";
import PageHeader from "./PageHeader.jsx";
import { useContent, photoSrc } from "../lib/content.jsx";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      <Icon name="copy" /> {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Donate() {
  const { content } = useContent();
  const { donate } = content;

  return (
    <>
      <PageHeader title={donate.heading} image={photoSrc(content, "ph25")} />
      <section className="section">
        <div className="container narrow center">
          <Icon name="heart" />
          <Text className="prose lead">{donate.intro}</Text>
        </div>
        <div className="container">
          <div className="donate-grid">
            {donate.methods.map((m) => (
              <article key={m.id} className="donate-card">
                <h3>{m.name}</h3>
                <p>{m.description}</p>
                {m.detail && (
                  <div className="donate-detail">
                    <Text>{m.detail}</Text>
                    {!m.detail.includes("\n") && <CopyButton text={m.detail} />}
                  </div>
                )}
                {m.link && (
                  <a className="btn btn-maroon" href={m.link} target="_blank" rel="noreferrer">{m.buttonText || "Donate"}</a>
                )}
              </article>
            ))}
          </div>
          <p className="tax-note">{donate.taxNote}</p>
        </div>
      </section>
      <section className="section section-tint">
        <div className="container narrow center">
          <h2>{donate.otherWaysHeading}</h2>
          <Text className="prose">{donate.otherWays}</Text>
        </div>
      </section>
    </>
  );
}
